import { Copy, ExternalLink, Globe, HardDrive, Power, RefreshCw, RotateCw, Server, TerminalSquare } from "lucide-react";
import type { CommandExecution, Host, HostStatus, Service } from "../types";
import { TerminalPanel } from "./TerminalPanel";

interface HostDetailsProps {
  host: Host;
  service?: Service;
  liveStatus?: HostStatus;
  refreshing: boolean;
  executions: CommandExecution[];
  onRefresh: () => void;
  onClearTerminal: () => void;
  onNotice: (message: string) => void;
}

function displayDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "Not checked";
}

export function HostDetails({ host, service, liveStatus, refreshing, executions, onRefresh, onClearTerminal, onNotice }: HostDetailsProps) {
  const reachable = liveStatus?.reachable ?? host.status === "online";
  const effectiveStatus = reachable ? "online" : "offline";
  const webUrl = service?.web_url ?? host.connection.web_url;
  const isLive = liveStatus?.source === "live";

  async function copyAddress() {
    await navigator.clipboard.writeText(host.address);
    onNotice("Host address copied to clipboard.");
  }

  return <section className="panel host-panel">
    <div className="host-header-row">
      <div className="host-identity"><span className="host-icon">{service ? <Globe size={24} /> : <Server size={24} />}</span><div><span className="eyebrow">{service ? `Service on ${host.name}` : "Host details"}</span><h2>{service?.name ?? host.name}</h2></div><span className={`status-pill ${effectiveStatus}`}>{effectiveStatus}</span>{isLive && <span className="live-badge">Live</span>}</div>
      <button className="icon-button" onClick={onRefresh} disabled={refreshing} aria-label={`Refresh ${host.name}`} title="Run read-only host check"><RefreshCw size={18} className={refreshing ? "spin" : ""} /></button>
    </div>

    {refreshing && <div className="inline-status"><RefreshCw className="spin" size={14} /> Checking…</div>}
    {liveStatus?.error && <div className="status-warning"><Power size={14} /> {liveStatus.error}</div>}

    <dl className="host-metadata">
      <div><dt>Hostname</dt><dd>{liveStatus?.hostname ?? host.hostname}</dd></div>
      <div><dt>Address</dt><dd>{host.address}<button className="copy-inline" onClick={() => void copyAddress()} aria-label="Copy address"><Copy size={14} /></button></dd></div>
      <div><dt>Operating System</dt><dd>{liveStatus?.os ?? host.os}</dd></div>
      <div><dt>Kernel</dt><dd>{liveStatus?.kernel ?? "Unknown"}</dd></div>
      <div><dt>Uptime</dt><dd>{liveStatus?.uptime ?? host.uptime}</dd></div>
      <div><dt>Last Check</dt><dd>{displayDate(liveStatus?.checked_at)}</dd></div>
      <div><dt>Disk Usage</dt><dd><HardDrive size={13} /> {liveStatus?.disk.used_percent != null ? `${liveStatus.disk.used_percent}%` : "Unknown"}</dd></div>
      <div><dt>Package Updates</dt><dd>{liveStatus?.updates ?? host.updates}</dd></div>
      <div><dt>Docker</dt><dd>{isLive ? (liveStatus.docker.installed ? `${liveStatus.docker.running_containers ?? 0} running` : "Not installed") : "Not checked"}</dd></div>
      <div><dt>Tailscale</dt><dd>{isLive ? (liveStatus.tailscale.installed ? liveStatus.tailscale.version : "Not installed") : "Not checked"}</dd></div>
      {webUrl && <div className="metadata-wide"><dt>Web UI</dt><dd title={webUrl}>{webUrl}</dd></div>}
    </dl>

    <div className="host-actions">
      <span className="terminal-action-label"><TerminalSquare size={17} /> {host.connection.ssh.enabled ? "SSH available below" : "SSH not configured"}</span>
      {webUrl ? <a className="button button-quiet" href={webUrl} target="_blank" rel="noopener noreferrer"><Globe size={17} /> Open Web UI <ExternalLink size={12} /></a>
        : <button className="button button-quiet" disabled><Globe size={17} /> Open Web UI <ExternalLink size={12} /></button>}
      <button className="button button-quiet" onClick={() => onNotice("Remote reboot is not enabled in v0.2.")}><RotateCw size={17} /> Reboot</button>
      {(liveStatus?.reboot_required ?? host.reboot_required) && <span className="reboot-note"><Power size={14} /> Reboot recommended</span>}
    </div>
    <TerminalPanel host={host} executions={executions} onClear={onClearTerminal} onNotice={onNotice} />
  </section>;
}
