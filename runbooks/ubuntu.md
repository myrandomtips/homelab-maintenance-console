# Ubuntu Upgrade

Standard procedure for keeping Ubuntu hosts up to date.

## 1. Normal update

Refresh package indexes and install available updates.

```bash
sudo apt update
sudo apt full-upgrade -y
```
<!-- runnable -->

## 2. Cleanup

Remove unused packages and clear the local package cache.

```bash
sudo apt autoremove -y
sudo apt autoclean
```
<!-- runnable -->

## 3. Check reboot

Check whether the operating system recommends a reboot.

```bash
test -f /var/run/reboot-required && cat /var/run/reboot-required
```

## 4. Reboot if required

Reboot only during an approved maintenance window.

```bash
sudo reboot
```
<!-- runnable -->
