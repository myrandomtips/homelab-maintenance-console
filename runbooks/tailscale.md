# Tailscale Checks

Basic health checks for a host connected to a Tailscale network.

## 1. Connection status

Review the local node and its visible peers.

```bash
tailscale status
```
<!-- runnable -->

## 2. Network diagnostics

Run the built-in connectivity report.

```bash
tailscale netcheck
```
<!-- runnable -->

## 3. Version check

Record the installed client version.

```bash
tailscale version
```
