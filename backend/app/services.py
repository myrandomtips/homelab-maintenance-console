from pathlib import Path

import yaml

from .models import DashboardStatus, HistoryRecord, Inventory


ROOT_DIR = Path(__file__).resolve().parents[2]
CONFIG_DIR = ROOT_DIR / "config"
RUNBOOK_DIR = ROOT_DIR / "runbooks"


def inventory_path() -> Path:
    private_inventory = CONFIG_DIR / "inventory.yaml"
    return private_inventory if private_inventory.exists() else CONFIG_DIR / "inventory.example.yaml"


def load_inventory() -> Inventory:
    with inventory_path().open("r", encoding="utf-8") as inventory_file:
        payload = yaml.safe_load(inventory_file) or {}
    return Inventory.model_validate(payload)


def dashboard_status(inventory: Inventory) -> DashboardStatus:
    os_updates = 0
    docker_updates = 0
    for host in inventory.hosts:
        for service in host.services:
            if service.type == "operating-system":
                os_updates += service.updates
            if service.type == "container-engine":
                docker_updates += service.updates

    return DashboardStatus(
        hosts_online=sum(host.status == "online" for host in inventory.hosts),
        hosts_total=len(inventory.hosts),
        os_updates=os_updates,
        docker_updates=docker_updates,
        reboot_required=sum(host.reboot_required for host in inventory.hosts),
        last_check="1m ago",
    )


def load_runbook(name: str) -> str:
    if not name.replace("-", "").isalnum():
        raise ValueError("Invalid runbook name")
    path = RUNBOOK_DIR / f"{name}.md"
    if not path.is_file():
        raise FileNotFoundError(name)
    return path.read_text(encoding="utf-8")


def sample_history() -> list[HistoryRecord]:
    return [
        HistoryRecord(date="2026-08-12 09:14", action="Ubuntu upgrade", user="admin", result="Success"),
        HistoryRecord(date="2026-08-05 21:47", action="Package cleanup", user="admin", result="Success"),
        HistoryRecord(date="2026-07-29 08:02", action="Kernel update", user="admin", result="Success"),
    ]
