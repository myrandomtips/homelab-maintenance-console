import asyncio
import contextlib
import json
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .database import initialize_database
from .history_service import add_history, add_manual_history, list_history
from .inventory import get_host, get_service, load_inventory, load_runbook
from .models import (
    DashboardStatus,
    HistoryCreate,
    HistoryRecord,
    HostStatus,
    Inventory,
    RefreshAllResponse,
    RunbookResponse,
)
from .ssh_service import SSHServiceError, connect_host
from .status_service import dashboard_status, latest_status, refresh_all, refresh_host


VERSION = "0.2.0"


@asynccontextmanager
async def lifespan(_: FastAPI):
    await initialize_database()
    yield


app = FastAPI(
    title="Homelab Maintenance Console API",
    description="Allowlisted live operations API for the v0.2 console.",
    version=VERSION,
    lifespan=lifespan,
)

frontend_port = os.getenv("FRONTEND_PORT", "5173")
default_origins = [f"http://localhost:{frontend_port}", f"http://127.0.0.1:{frontend_port}"]
configured_origins = [item.strip() for item in os.getenv("CORS_ORIGINS", "").split(",") if item.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=configured_origins or default_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


def inventory_host(host_id: str):
    try:
        return get_host(host_id)
    except LookupError as error:
        raise HTTPException(status_code=404, detail="Host not found in inventory") from error


def ssh_http_error(error: SSHServiceError) -> HTTPException:
    status_code = 409 if error.code in {"ssh_not_configured", "invalid_configuration", "missing_secret"} else 502
    if error.code == "timeout":
        status_code = 504
    return HTTPException(status_code=status_code, detail={"code": error.code, "message": error.message})


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "application": "Homelab Maintenance Console", "version": VERSION}


@app.get("/api/inventory", response_model=Inventory)
async def inventory() -> Inventory:
    return load_inventory()


@app.get("/api/status", response_model=DashboardStatus)
async def status() -> DashboardStatus:
    return await dashboard_status(load_inventory())


@app.get("/api/runbooks/{name}", response_model=RunbookResponse)
async def runbook(name: str) -> RunbookResponse:
    try:
        content = load_runbook(name)
    except (FileNotFoundError, ValueError) as error:
        raise HTTPException(status_code=404, detail="Runbook not found") from error
    return RunbookResponse(name=name, content=content)


@app.get("/api/hosts/statuses", response_model=list[HostStatus])
async def all_host_statuses() -> list[HostStatus]:
    loaded = load_inventory()
    return list(await asyncio.gather(*(latest_status(host) for host in loaded.hosts)))


@app.get("/api/hosts/{host_id}/status", response_model=HostStatus)
async def host_status(host_id: str) -> HostStatus:
    return await latest_status(inventory_host(host_id))


@app.post("/api/hosts/{host_id}/refresh", response_model=HostStatus)
async def refresh_single_host(host_id: str) -> HostStatus:
    try:
        return await refresh_host(inventory_host(host_id))
    except SSHServiceError as error:
        raise ssh_http_error(error) from error


@app.post("/api/hosts/refresh-all", response_model=RefreshAllResponse)
async def refresh_all_hosts() -> RefreshAllResponse:
    return await refresh_all(load_inventory())


@app.get("/api/history", response_model=list[HistoryRecord])
async def history(
    host_id: str | None = Query(default=None),
    service_id: str | None = Query(default=None),
) -> list[HistoryRecord]:
    if host_id is not None:
        host = inventory_host(host_id)
        if service_id is not None:
            try:
                get_service(host, service_id)
            except LookupError as error:
                raise HTTPException(status_code=404, detail="Service not found for inventory host") from error
    elif service_id is not None:
        raise HTTPException(status_code=422, detail="service_id requires host_id")
    return await list_history(host_id, service_id)


@app.post("/api/history", response_model=HistoryRecord, status_code=201)
async def create_history(payload: HistoryCreate) -> HistoryRecord:
    host = inventory_host(payload.host_id)
    if payload.service_id is not None:
        try:
            get_service(host, payload.service_id)
        except LookupError as error:
            raise HTTPException(status_code=404, detail="Service not found for inventory host") from error
    return await add_manual_history(payload)


async def _stream_terminal(websocket: WebSocket, process) -> None:
    while True:
        data = await process.stdout.read(4096)
        if not data:
            break
        await websocket.send_json({"type": "output", "data": data})


@app.websocket("/ws/ssh/{host_id}")
async def ssh_terminal(websocket: WebSocket, host_id: str) -> None:
    await websocket.accept()
    try:
        host = get_host(host_id)
    except LookupError:
        await websocket.send_json({"type": "error", "code": "not_found", "message": "Host not found in inventory"})
        await websocket.close(code=1008)
        return

    connection = None
    process = None
    reader_task = None
    connected = False
    try:
        connection = await connect_host(host)
        process = await connection.create_process(term_type="xterm-256color", term_size=(80, 24))
        connected = True
        await add_history(host_id=host.id, action="SSH connected", result="Success", source="ssh")
        await websocket.send_json({"type": "status", "status": "connected"})
        reader_task = asyncio.create_task(_stream_terminal(websocket, process))

        while not reader_task.done():
            try:
                message = await asyncio.wait_for(websocket.receive_text(), timeout=0.5)
            except asyncio.TimeoutError:
                continue
            payload = json.loads(message)
            message_type = payload.get("type")
            if message_type == "input":
                data = payload.get("data")
                if isinstance(data, str) and len(data) <= 65536:
                    process.stdin.write(data)
            elif message_type == "resize":
                cols = min(max(int(payload.get("cols", 80)), 20), 500)
                rows = min(max(int(payload.get("rows", 24)), 5), 200)
                process.change_terminal_size(cols, rows)
        await reader_task
    except SSHServiceError as error:
        await websocket.send_json({"type": "error", "code": error.code, "message": error.message})
        await websocket.close(code=1011)
    except (WebSocketDisconnect, asyncio.CancelledError):
        pass
    except (json.JSONDecodeError, TypeError, ValueError):
        with contextlib.suppress(Exception):
            await websocket.send_json({"type": "error", "code": "invalid_message", "message": "Invalid terminal message"})
    except Exception:
        with contextlib.suppress(Exception):
            await websocket.send_json({"type": "error", "code": "ssh_disconnected", "message": "SSH session disconnected"})
    finally:
        if reader_task and not reader_task.done():
            reader_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await reader_task
        if process is not None:
            process.terminate()
        if connection is not None:
            connection.close()
            await connection.wait_closed()
        if connected:
            await add_history(host_id=host.id, action="SSH disconnected", result="Success", source="ssh")
