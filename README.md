# Homelab Maintenance Console

**Operate • Maintain • Automate**

Homelab Maintenance Console is an open-source, Dockerised dashboard for understanding and safely maintaining a small self-hosted environment. Version 0.2 adds optional allowlisted live operations while keeping the public example useful without credentials.

## v0.2 features

- YAML host and service inventory with host- and service-specific Web UI URLs
- Read-only Linux status checks over SSH, using a fixed server-side command set
- Structured OS, kernel, uptime, update, reboot, disk, Docker, and Tailscale status
- SQLite-backed maintenance and audit history with host/service filtering
- Optional interactive xterm.js SSH shell over an inventory-scoped WebSocket
- Host refresh and bounded-concurrency Refresh All controls
- Safe simulation for runbook commands; no automatic upgrades or reboot API
- Localhost-only Docker ports by default, with environment-based overrides

## Start the public example

Requirements: Docker Desktop (with Docker Compose) and Git.

```bash
git clone https://github.com/myrandomtips/homelab-maintenance-console.git
cd homelab-maintenance-console
docker compose up --build
```

Open <http://localhost:5173>. The API and documentation are available at <http://localhost:8000> and <http://localhost:8000/docs>.

The example inventory uses reserved documentation addresses and has SSH disabled. No keys are required.

## Private deployment ports

Copy the environment template and choose deployment-specific ports without editing `docker-compose.yml`:

```bash
cp .env.example .env
```

Example `.env`:

```dotenv
BIND_ADDRESS=127.0.0.1
BACKEND_PORT=8001
FRONTEND_PORT=5174
CORS_ORIGINS=
```

The console binds to `127.0.0.1` by default. Setting `BIND_ADDRESS=0.0.0.0` exposes both services on the LAN and should only be done deliberately, with appropriate network controls and authentication in front of the application.

HTTP CORS and the interactive SSH WebSocket use the same exact origin allowlist. By default, only `http://localhost:${FRONTEND_PORT}` and `http://127.0.0.1:${FRONTEND_PORT}` are accepted. If the frontend is deliberately opened through another hostname or LAN address, set a comma-separated allowlist with schemes and ports but no paths, for example:

```dotenv
BIND_ADDRESS=0.0.0.0
FRONTEND_PORT=5174
CORS_ORIGINS=http://console.example.test:5174,http://192.0.2.50:5174
```

When `CORS_ORIGINS` is non-empty it replaces, rather than extends, the localhost defaults. Missing and unlisted WebSocket origins are rejected before inventory lookup or any SSH connection attempt.

## Inventory and Web UI URLs

Copy the example to the ignored private inventory:

```bash
cp config/inventory.example.yaml config/inventory.yaml
```

PowerShell:

```powershell
Copy-Item config/inventory.example.yaml config/inventory.yaml
```

A host may define `connection.web_url`, and each service may define its own `web_url`. When a service is selected its URL takes precedence.

```yaml
connection:
  web_url: http://192.0.2.10

services:
  - id: example-app
    name: Example App
    type: application
    web_url: http://192.0.2.10:8080
```

## Optional SSH configuration

SSH targets are always resolved from a host ID in the inventory. The browser cannot submit an address, credential, or backend command. Key and known-host settings are filenames only and are resolved beneath `secrets/`.

```yaml
connection:
  ssh:
    enabled: true
    user: admin
    port: 22
    key_name: homelab_ed25519
    known_hosts_name: known_hosts
```

Provide these untracked files:

```text
secrets/homelab_ed25519
secrets/known_hosts
```

Populate `known_hosts` from a trusted network and verify the fingerprint out of band before use. For example, the output of the following command may be reviewed and then saved:

```bash
ssh-keyscan -p 22 your-inventory-host
```

Do not pipe an unverified scan directly into the production file. Host-key verification is mandatory; missing or mismatched host keys fail closed. Never commit `config/inventory.yaml`, `.env`, anything under `secrets/`, or runtime data under `data/`.

The status collector uses fixed, read-only commands without `sudo`. Missing platform tools such as APT, Docker, or Tailscale are handled as unavailable capabilities rather than a whole-host failure. The interactive terminal is user-driven and is not recorded in SQLite or application logs.

## SQLite history

The database is created automatically at `data/homelab.db` on the host and `/app/data/homelab.db` in the backend container. It stores manual records and high-level status/SSH lifecycle events. It does not store passwords, keys, terminal input, command history, or session output.

## API

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Health and application version |
| `GET /api/inventory` | Validated host/service inventory |
| `GET /api/status` | Dashboard totals using latest known status |
| `GET /api/hosts/statuses` | Latest/fallback status for all hosts |
| `GET /api/hosts/{host_id}/status` | Latest status for one inventory host |
| `POST /api/hosts/{host_id}/refresh` | Run the fixed read-only checks |
| `POST /api/hosts/refresh-all` | Refresh SSH-enabled hosts with bounded concurrency |
| `GET /api/runbooks/{name}` | Load an allowlisted Markdown runbook name |
| `GET /api/history?host_id=...&service_id=...` | Read filtered SQLite history |
| `POST /api/history` | Add a validated manual maintenance record |
| `WS /ws/ssh/{host_id}` | Optional interactive SSH shell for an inventory host |

## Tests

Install the backend test dependency and run the focused validation suite:

```bash
python -m pip install -r backend/requirements-dev.txt
python -m unittest discover -s backend/tests -v
```

## v0.1 migration

1. Pull or copy the v0.2 files; no database migration is required.
2. Optionally add `port`, `key_name`, `known_hosts_name`, and service `web_url` fields. Existing inventories remain valid because the new fields have safe defaults.
3. Keep SSH disabled until both secret files and verified host keys are ready.
4. Create `.env` only when overriding the localhost binding or ports.
5. Rebuild with `docker compose up -d --build`. SQLite is created automatically.

## Project structure

```text
backend/app/  FastAPI routes plus inventory, database, history, SSH, and status services
config/       Generic example inventory; private inventory is ignored
data/         Ignored persistent SQLite storage
frontend/     React, TypeScript, Vite, and xterm.js interface
runbooks/     Generic Markdown procedures (copy/simulate only)
secrets/      Ignored, read-only container mount for SSH material
```

## Security scope and limitations

v0.2 does not include application authentication or authorisation, automatic upgrades, package installation, Docker updates, arbitrary command REST endpoints, remote reboot, or controlled runbook execution. Put an authentication-aware reverse proxy in front before deliberate multi-user or LAN exposure. SSH host verification is never disabled, CORS is limited to configured local frontend origins, and the inventory is the host allowlist.

## Roadmap

- Authentication and role-based authorisation
- Explicit approval workflows for controlled maintenance actions
- Inventory editing and richer validation feedback
- Editable runbooks, themes, and historical trend views

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
