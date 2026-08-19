import asyncio
import re
from pathlib import Path

import asyncssh

from .models import Host


ROOT_DIR = Path(__file__).resolve().parents[2]
SECRETS_DIR = ROOT_DIR / "secrets"
SAFE_FILENAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")


class SSHServiceError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def resolve_secret_file(filename: str | None, label: str) -> Path:
    if not filename or not SAFE_FILENAME.fullmatch(filename) or filename in {".", ".."}:
        raise SSHServiceError("invalid_configuration", f"{label} must be a filename only")
    base = SECRETS_DIR.resolve()
    candidate = (base / filename).resolve()
    if candidate.parent != base:
        raise SSHServiceError("invalid_configuration", f"{label} must resolve beneath the secrets directory")
    if not candidate.is_file():
        raise SSHServiceError("missing_secret", f"Configured {label} file is not available")
    return candidate


def validate_ssh_configuration(host: Host) -> tuple[Path, Path]:
    ssh = host.connection.ssh
    if not ssh.enabled:
        raise SSHServiceError("ssh_not_configured", "SSH is not enabled for this inventory host")
    if not ssh.user:
        raise SSHServiceError("invalid_configuration", "SSH user is not configured")
    key_path = resolve_secret_file(ssh.key_name, "SSH key")
    known_hosts_path = resolve_secret_file(ssh.known_hosts_name, "known_hosts")
    return key_path, known_hosts_path


async def connect_host(host: Host, timeout: float = 10.0) -> asyncssh.SSHClientConnection:
    key_path, known_hosts_path = validate_ssh_configuration(host)
    ssh = host.connection.ssh
    try:
        return await asyncio.wait_for(
            asyncssh.connect(
                host.address,
                port=ssh.port,
                username=ssh.user,
                client_keys=[str(key_path)],
                known_hosts=str(known_hosts_path),
                login_timeout=timeout,
                keepalive_interval=30,
                keepalive_count_max=3,
            ),
            timeout=timeout + 1,
        )
    except asyncio.TimeoutError as error:
        raise SSHServiceError("timeout", "SSH connection timed out") from error
    except asyncssh.PermissionDenied as error:
        raise SSHServiceError("authentication_failed", "SSH authentication failed") from error
    except asyncssh.HostKeyNotVerifiable as error:
        raise SSHServiceError("host_key_failed", "SSH host-key validation failed") from error
    except (asyncssh.Error, OSError) as error:
        raise SSHServiceError("unreachable", "SSH host is unreachable") from error


async def run_read_only(conn: asyncssh.SSHClientConnection, command: str, timeout: float = 8.0) -> str | None:
    try:
        result = await asyncio.wait_for(conn.run(command, check=False), timeout=timeout)
    except (asyncio.TimeoutError, asyncssh.Error):
        return None
    if result.exit_status != 0:
        return None
    return result.stdout.strip()
