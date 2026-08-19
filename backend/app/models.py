from typing import Literal

from pydantic import BaseModel, Field


Status = Literal["online", "offline", "warning"]


class SSHConnection(BaseModel):
    enabled: bool = False
    user: str | None = None


class Connection(BaseModel):
    ssh: SSHConnection = Field(default_factory=SSHConnection)
    web_url: str | None = None


class Service(BaseModel):
    id: str
    name: str
    type: str
    status: Status = "online"
    updates: int = 0
    runbook: str | None = None


class Host(BaseModel):
    id: str
    name: str
    hostname: str
    address: str
    os: str
    status: Status = "online"
    updates: int = 0
    uptime: str = "Unknown"
    last_check: str = "Unknown"
    reboot_required: bool = False
    connection: Connection = Field(default_factory=Connection)
    services: list[Service] = Field(default_factory=list)


class ApplicationConfig(BaseModel):
    name: str
    version: str = "0.1.0"


class Inventory(BaseModel):
    application: ApplicationConfig
    hosts: list[Host]


class DashboardStatus(BaseModel):
    hosts_online: int
    hosts_total: int
    os_updates: int
    docker_updates: int
    reboot_required: int
    last_check: str


class RunbookResponse(BaseModel):
    name: str
    content: str


class HistoryRecord(BaseModel):
    date: str
    action: str
    user: str
    result: Literal["Success", "Failed", "Pending"]
