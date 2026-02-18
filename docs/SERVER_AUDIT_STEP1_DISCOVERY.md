# STEP 1 — System Discovery (Server Audit)

You asked for a full infrastructure audit and documentation of your Ubuntu home server (Jellyfin, *arr stack, Gluetun, Prometheus, Grafana, Homarr, Cloudflare tunnel, etc.).

To produce the documentation, diagrams, security review, and improvement plan, the following outputs are required. **Please run each command on the server and paste the full output** (or attach files). Do not redact unless necessary for security (e.g. you can replace public IP with `REDACTED` if you prefer).

---

## 1. Docker

```bash
docker ps
```

```bash
docker ps -a
```

```bash
docker network ls
```

```bash
docker volume ls
```

```bash
docker images
```

---

## 2. Docker Compose

Provide the **full contents** of every `docker-compose.yml` (and any `docker-compose.*.yml` you use), e.g.:

- Main stack: path and full file content
- Any override or env-specific files

Example (adjust paths to your setup):

```bash
cat /path/to/your/docker-compose.yml
```

```bash
cat /path/to/your/docker-compose.override.yml
```

If you have multiple compose projects (e.g. media, monitoring, tunnel), list each project path and paste each compose file.

---

## 3. Storage and Disks

```bash
lsblk
```

```bash
df -h
```

```bash
mount | grep -E '^/dev'
```

(Optional) List where important data lives:

```bash
# Example — adjust to your layout
ls -la /mnt
ls -la /opt
```

---

## 4. Networking

```bash
ip a
```

```bash
ip route
```

```bash
ss -tlnp
```

---

## 5. Cloudflare Tunnel

- **Config file(s):** full content of your cloudflared config (e.g. `config.yml` or where you define ingress/public hostnames).
- **How you run it:** systemd unit, Docker, or manual command (paste unit file or `docker run`/compose service if applicable).

Example:

```bash
cat /etc/cloudflared/config.yml
# or
cat /path/to/your/tunnel/config.yml
```

```bash
systemctl cat cloudflared
# or
docker ps | grep cloudflare
```

---

## 6. Nginx (if used)

- Full contents of Nginx config files that define servers/proxies (e.g. under `sites-enabled/` or `conf.d/`).

Example:

```bash
ls -la /etc/nginx/sites-enabled
```

```bash
cat /etc/nginx/sites-enabled/*
```

(If you use Nginx Proxy Manager or Caddy, provide the equivalent config or export.)

---

## 7. Firewall

```bash
sudo ufw status verbose
```

If you use iptables/nftables instead of or in addition to UFW:

```bash
sudo iptables -L -n -v
```

---

## 8. Scheduled Jobs

```bash
crontab -l
```

```bash
sudo crontab -l
```

(If you have cron files in `/etc/cron.d/` or similar for this stack, list them.)

---

## 9. System Services

```bash
systemctl list-units --type=service --state=running
```

```bash
systemctl list-units --type=service --all | grep -E 'docker|nginx|cloudflare|jellyfin|prometheus|grafana'
```

---

## 10. Optional but Helpful

- **Environment files:** If you use `.env` files for Docker Compose, paste **variable names only** (no secrets), or a redacted sample, so we can see what’s configured.
- **Hardware:**  
  `lscpu` and `ls /dev/dri` (for Intel iGPU transcoding).
- **Grafana/Prometheus:** Screenshot or list of main dashboards and scrape configs (e.g. `prometheus.yml` and which exporters you use).
- **Cloudflare:** Whether you use Zero Trust, WARP, or only public hostnames/tunnel.

---

## What Happens Next

After you provide all of the above (or as much as you can), the next steps will be:

1. **STEP 2 — Documentation:** Executive overview, infrastructure summary, network/storage/container/security architecture, monitoring stack, media stack, remote access, risks, performance, backup/DR, simplification plan, future growth.
2. **STEP 3 — Diagrams (Mermaid):** High-level architecture, Docker networking, media flow (Prowlarr → Sonarr → Radarr → Jellyfin), monitoring stack, Cloudflare tunnel flow, storage mounts.
3. **STEP 4 — Security review:** Port exposure, container privileges, VPN isolation, Cloudflare, reverse proxy, secrets, network segmentation; security score out of 10.
4. **STEP 5 — Improvement plan:** Critical fixes, medium-term improvements, long-term upgrades, Kubernetes feasibility, overengineering assessment.

Please paste the outputs in your next message (or attach files), grouped by section (Docker, Compose, Storage, etc.). Once received, the full audit and documentation will be generated.
