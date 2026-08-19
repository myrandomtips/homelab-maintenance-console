# TrueNAS Maintenance

Routine checks for a generic TrueNAS host and its storage pools.

## 1. Review system version

Confirm the installed TrueNAS release.

```bash
cat /etc/version
```

## 2. Check pool health

Review pool state and identify degraded devices.

```bash
zpool status
```
<!-- runnable -->

## 3. Review capacity

Display pool capacity and free space.

```bash
zpool list
```
<!-- runnable -->

## 4. Check alerts

Review alerts in the TrueNAS web interface before maintenance.
