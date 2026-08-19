# Docker Maintenance

Review container status and clean unused Docker resources safely.

## 1. Check containers

List running containers and their current state.

```bash
docker ps
```
<!-- runnable -->

## 2. Review disk usage

Inspect how much disk space Docker is using.

```bash
docker system df
```
<!-- runnable -->

## 3. Pull images

Fetch newer images for the active Compose project.

```bash
docker compose pull
```
<!-- runnable -->

## 4. Remove unused images

Preview cleanup needs before removing unused images.

```bash
docker image prune
```
