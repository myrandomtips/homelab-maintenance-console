import asyncio
import json
import re
from datetime import UTC, datetime

from .database import connect
from .history_service import add_history
from .models import (
    DashboardStatus,
    DiskStatus,
    DockerStatus,
    Host,
    HostStatus,
    Inventory,
    RefreshAllResponse,
    TailscaleStatus,
)
from .ssh_service import SSHServiceError, connect_host, run_read_only


READ_ONLY_COMMANDS = {
    "os_release": "cat /etc/os-release",
    "kernel": "uname -r",
    "hostname": "hostname",
    "uptime": "uptime -p",
    "updates": "apt list --upgradable 2>/dev/null",
    "reboot": "test -f /var/run/reboot-required && echo yes || echo no",
    "disk": "df -h / | tail -n 1",
    "docker_version": "docker --version",
    "docker_count": "docker ps -q | wc -l",
    "tailscale_version": "tailscale version",
}


def fallback_status(host: Host) -> HostStatus:
    return HostStatus(
        host_id=host.id,
        reachable=host.status != "offline",
        os=host.os,
        hostname=host.hostname,
        uptime=host.uptime,
        updates=host.updates,
        reboot_required=host.reboot_required,
        source="inventory",
    )


def _parse_os_release(output: str | None) -> str | None:
    if not output:
        return None
    values: dict[str, str] = {}
    for line in output.splitlines():
        if "=" in line:
            key, value = line.split("=", 1)
            values[key] = value.strip().strip('"')
    return values.get("PRETTY_NAME") or values.get("NAME")


def _parse_updates(output: str | None) -> int | None:
    if output is None:
        return None
    return sum(
        1 for line in output.splitlines()
        if line.strip() and not line.startswith(("Listing", "WARNING")) and "/" in line
    )


def _parse_disk(output: str | None) -> int | None:
    if not output:
        return None
    match = re.search(r"\s(\d+)%\s", f" {output} ")
    return int(match.group(1)) if match else None


async def save_status(status: HostStatus) -> None:
    checked_at = status.checked_at or datetime.now(UTC)
    database = await connect()
    try:
        await database.execute(
            """
            INSERT INTO host_status (host_id, checked_at, status_json) VALUES (?, ?, ?)
            ON CONFLICT(host_id) DO UPDATE SET
                checked_at = excluded.checked_at,
                status_json = excluded.status_json
            """,
            (status.host_id, checked_at.isoformat(), status.model_dump_json()),
        )
        await database.commit()
    finally:
        await database.close()


async def latest_status(host: Host) -> HostStatus:
    database = await connect()
    try:
        cursor = await database.execute("SELECT status_json FROM host_status WHERE host_id = ?", (host.id,))
        row = await cursor.fetchone()
    finally:
        await database.close()
    return HostStatus.model_validate(json.loads(row["status_json"])) if row else fallback_status(host)


async def refresh_host(host: Host) -> HostStatus:
    checked_at = datetime.now(UTC)
    try:
        connection = await connect_host(host)
    except SSHServiceError as error:
        status = HostStatus(
            host_id=host.id, reachable=False, checked_at=checked_at, source="live",
            error_code=error.code, error=error.message,
        )
        if error.code != "ssh_not_configured":
            await save_status(status)
            await add_history(
                host_id=host.id, action="Host status refresh", result="Failed",
                source="status-check", details=error.message,
            )
        raise

    try:
        outputs = await asyncio.gather(*(
            run_read_only(connection, command) for command in READ_ONLY_COMMANDS.values()
        ))
        values = dict(zip(READ_ONLY_COMMANDS, outputs, strict=True))
        docker_version = values["docker_version"]
        docker_count = values["docker_count"]
        tailscale_version = values["tailscale_version"]
        status = HostStatus(
            host_id=host.id,
            reachable=True,
            os=_parse_os_release(values["os_release"]),
            kernel=values["kernel"],
            hostname=values["hostname"],
            uptime=values["uptime"],
            updates=_parse_updates(values["updates"]),
            reboot_required=values["reboot"] == "yes",
            disk=DiskStatus(used_percent=_parse_disk(values["disk"])),
            docker=DockerStatus(
                installed=docker_version is not None,
                version=docker_version,
                running_containers=int(docker_count) if docker_count and docker_count.isdigit() else None,
            ),
            tailscale=TailscaleStatus(
                installed=tailscale_version is not None,
                version=tailscale_version.splitlines()[0] if tailscale_version else None,
            ),
            checked_at=checked_at,
            source="live",
        )
        await save_status(status)
        await add_history(
            host_id=host.id, action="Host status refresh", result="Success",
            source="status-check", details="Read-only live inspection completed",
        )
        return status
    finally:
        connection.close()
        await connection.wait_closed()


async def refresh_all(inventory: Inventory, concurrency: int = 4) -> RefreshAllResponse:
    enabled = [host for host in inventory.hosts if host.connection.ssh.enabled]
    semaphore = asyncio.Semaphore(concurrency)

    async def refresh_one(host: Host) -> HostStatus:
        async with semaphore:
            try:
                return await refresh_host(host)
            except SSHServiceError:
                return await latest_status(host)

    results = await asyncio.gather(*(refresh_one(host) for host in enabled))
    succeeded = sum(status.reachable and not status.error for status in results)
    return RefreshAllResponse(
        checked=len(enabled), succeeded=succeeded, failed=len(enabled) - succeeded,
        skipped=len(inventory.hosts) - len(enabled), results=results,
    )


async def dashboard_status(inventory: Inventory) -> DashboardStatus:
    latest = await asyncio.gather(*(latest_status(host) for host in inventory.hosts))
    by_host = {status.host_id: status for status in latest}
    os_updates = 0
    docker_updates = 0
    for host in inventory.hosts:
        status = by_host[host.id]
        if status.updates is not None:
            os_updates += status.updates
        else:
            os_updates += sum(service.updates for service in host.services if service.type == "operating-system")
        docker_updates += sum(service.updates for service in host.services if service.type == "container-engine")
    timestamps = [status.checked_at for status in latest if status.checked_at]
    return DashboardStatus(
        hosts_online=sum(status.reachable for status in latest),
        hosts_total=len(inventory.hosts),
        os_updates=os_updates,
        docker_updates=docker_updates,
        reboot_required=sum(bool(status.reboot_required) for status in latest),
        last_check=max(timestamps).isoformat() if timestamps else "Not checked",
    )
