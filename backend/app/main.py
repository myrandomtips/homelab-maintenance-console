from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .models import DashboardStatus, HistoryRecord, Inventory, RunbookResponse
from .services import dashboard_status, load_inventory, load_runbook, sample_history


app = FastAPI(
    title="Homelab Maintenance Console API",
    description="Inventory and runbook API for the safe v0.1 console.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "application": "Homelab Maintenance Console",
        "version": "0.1.0",
    }


@app.get("/api/inventory", response_model=Inventory)
def inventory() -> Inventory:
    return load_inventory()


@app.get("/api/status", response_model=DashboardStatus)
def status() -> DashboardStatus:
    return dashboard_status(load_inventory())


@app.get("/api/runbooks/{name}", response_model=RunbookResponse)
def runbook(name: str) -> RunbookResponse:
    try:
        content = load_runbook(name)
    except (FileNotFoundError, ValueError) as error:
        raise HTTPException(status_code=404, detail="Runbook not found") from error
    return RunbookResponse(name=name, content=content)


@app.get("/api/history", response_model=list[HistoryRecord])
def history() -> list[HistoryRecord]:
    return sample_history()
