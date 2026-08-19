from datetime import datetime
from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel, Field, field_validator


Status = Literal["online", "offline", "warning"]
HistoryResult = Literal["Success", "Failed", "Pending"]
HistorySource = Literal["manual", "system", "ssh", "status-check"]


def _validate_web_url(value: str | None) -> str | None:
    if value is None:
        return None
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("web_url must be an absolute http or https URL")
    return value


class SSHConnection(BaseModel):
    enabled: bool = False
    user: str | None = None
    port: int = Field(default=22, ge=1, le=65535)
    key_name: str | None = Field(default=None, exclude=True)
    known_hosts_name: str | None = Field(default=None, exclude=True)


class Connection(BaseModel):
    ssh: SSHConnection = Field(default_factory=SSHConnection)
    web_url: str | None = None

    _web_url = field_validator("web_url")(_validate_web_url)


class Service(BaseModel):
    id: str
    name: str
    type: str
    status: Status = "online"
    updates: int = Field(default=0, ge=0)
    runbook: str | None = None
    web_url: str | None = None

    _web_url = field_validator("web_url")(_validate_web_url)


class Host(BaseModel):
    id: str
    name: str
    hostname: str
    address: str
    os: str
    status: Status = "online"
    updates: int = Field(default=0, ge=0)
    uptime: str = "Unknown"
    last_check: str = "Unknown"
    reboot_required: bool = False
    connection: Connection = Field(default_factory=Connection)
    services: list[Service] = Field(default_factory=list)


class ApplicationConfig(BaseModel):
    name: str
    version: str = "0.2.0"


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


class DiskStatus(BaseModel):
    used_percent: int | None = None


class DockerStatus(BaseModel):
    installed: bool = False
    version: str | None = None
    running_containers: int | None = None


class TailscaleStatus(BaseModel):
    installed: bool = False
    version: str | None = None


class HostStatus(BaseModel):
    host_id: str
    reachable: bool
    os: str | None = None
    kernel: str | None = None
    hostname: str | None = None
    uptime: str | None = None
    updates: int | None = None
    reboot_required: bool | None = None
    disk: DiskStatus = Field(default_factory=DiskStatus)
    docker: DockerStatus = Field(default_factory=DockerStatus)
    tailscale: TailscaleStatus = Field(default_factory=TailscaleStatus)
    checked_at: datetime | None = None
    source: Literal["inventory", "live"] = "inventory"
    error_code: str | None = None
    error: str | None = None


class RefreshAllResponse(BaseModel):
    checked: int
    succeeded: int
    failed: int
    skipped: int
    results: list[HostStatus]


class HistoryRecord(BaseModel):
    id: int
    timestamp: datetime
    host_id: str
    service_id: str | None = None
    action: str
    user: str
    result: HistoryResult
    details: str | None = None
    source: HistorySource


class HistoryCreate(BaseModel):
    host_id: str
    service_id: str | None = None
    action: str = Field(min_length=1, max_length=160)
    result: HistoryResult
    details: str | None = Field(default=None, max_length=2000)

    @field_validator("action", "details")
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            return None
        return stripped
