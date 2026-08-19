# Homelab Maintenance Console

**Operate • Maintain • Automate**

Homelab Maintenance Console is an open-source, Dockerised dashboard for keeping a small self-hosted environment understandable and maintainable. Version 0.1 provides a safe UI and API foundation without connecting to real machines or executing commands.

## Features

- Host and service inventory loaded from YAML
- At-a-glance update, availability, and reboot status
- Markdown maintenance runbooks delivered through an API
- Searchable and collapsible infrastructure tree
- Host metadata and maintenance history
- Embedded mock terminal prepared for future SSH integration
- Copyable commands and safe, simulated Run actions
- Responsive three-column administration interface

> [!IMPORTANT]
> v0.1 does not make SSH connections, execute commands, open private web interfaces, or reboot hosts. Terminal output and maintenance history are examples only.

## Screenshot

> Screenshot placeholder — add an approved interface capture here before publishing the repository.

## Technology

- React, TypeScript, Vite, and xterm.js
- FastAPI, Uvicorn, PyYAML, and Pydantic
- Docker and Docker Compose

## Prerequisites

- Docker Desktop
- Docker Compose (included with current Docker Desktop releases)
- Git

## Start the console

```bash
git clone https://github.com/your-account/homelab-maintenance-console.git
cd homelab-maintenance-console
docker compose up --build
```

Then open:

- Frontend: <http://localhost:5173>
- API: <http://localhost:8000>
- API documentation: <http://localhost:8000/docs>

To stop the console, press `Ctrl+C`, then run:

```bash
docker compose down
```

## Configuration

The repository includes a safe generic example inventory. Copy it before adding private infrastructure details:

```bash
cp config/inventory.example.yaml config/inventory.yaml
```

On PowerShell:

```powershell
Copy-Item config/inventory.example.yaml config/inventory.yaml
```

Edit `config/inventory.yaml` with the hosts and services for your private deployment. The backend automatically prefers this private file when it exists and otherwise uses the example inventory.

Runbooks are Markdown files in `runbooks/`. A service's `runbook` field maps to a file such as `runbook: ubuntu` → `runbooks/ubuntu.md`.

## API endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Application health and version |
| `GET /api/inventory` | Parsed YAML host and service inventory |
| `GET /api/status` | Calculated dashboard totals |
| `GET /api/runbooks/{name}` | Markdown runbook content |
| `GET /api/history` | Example maintenance records for v0.1 |

## Project structure

```text
backend/       FastAPI application and container definition
config/        Generic example inventory; private inventory is ignored
data/          Ignored runtime-data location for future SQLite storage
frontend/      React console and container definition
runbooks/      Generic Markdown maintenance procedures
secrets/       Ignored placeholder for future secure integrations
```

## Security

Never commit real IP addresses, DNS names, usernames, SSH keys, passwords, tokens, or other infrastructure credentials. In particular, these paths are intentionally protected by `.gitignore`:

- `config/inventory.yaml`
- `.env`
- `secrets/`
- `data/`

SSH credentials should never be stored in Git. A later milestone should use an audited secret-management approach, strict host allowlists, authentication, authorisation, and command approval before any remote execution is enabled.

## Roadmap

- SQLite-backed maintenance history and audit events
- Authenticated, allowlisted SSH sessions
- Explicit approval gates for disruptive operations
- Editable runbooks and inventory validation
- Theme preferences and richer status polling

## License

A license has not yet been selected. Add an open-source license before publishing the repository.
