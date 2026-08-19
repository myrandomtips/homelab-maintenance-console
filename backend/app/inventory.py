from pathlib import Path

import yaml

from .models import Host, Inventory, Service


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


def get_host(host_id: str) -> Host:
    host = next((item for item in load_inventory().hosts if item.id == host_id), None)
    if host is None:
        raise LookupError("Host not found in inventory")
    return host


def get_service(host: Host, service_id: str) -> Service:
    service = next((item for item in host.services if item.id == service_id), None)
    if service is None:
        raise LookupError("Service not found for inventory host")
    return service


def load_runbook(name: str) -> str:
    if not name.replace("-", "").isalnum():
        raise ValueError("Invalid runbook name")
    path = RUNBOOK_DIR / f"{name}.md"
    if not path.is_file():
        raise FileNotFoundError(name)
    return path.read_text(encoding="utf-8")
