import {
  ChevronDown,
  Copy,
  EllipsisVertical,
  ExternalLink,
  Globe,
  Power,
  RotateCw,
  Server,
  TerminalSquare,
} from "lucide-react";
import type { CommandExecution, Host } from "../types";
import { TerminalPanel } from "./TerminalPanel";

interface HostDetailsProps {
  host: Host;
  executions: CommandExecution[];
  onClearTerminal: () => void;
  onNotice: (message: string) => void;
}

export function HostDetails({ host, executions, onClearTerminal, onNotice }: HostDetailsProps) {
  async function copyAddress() {
    await navigator.clipboard.writeText(host.address);
    onNotice("IP address copied to clipboard.");
  }

  return (
    <section className="panel host-panel">
      <div className="host-header-row">
        <div className="host-identity">
          <span className="host-icon"><Server size={24} /></span>
          <h2>{host.name}</h2>
          <span className={`status-pill ${host.status}`}>{host.status}</span>
        </div>
        <button className="icon-button" onClick={() => onNotice("Additional host actions are planned for a future release.")} aria-label="More host options"><EllipsisVertical size={18} /></button>
      </div>

      <dl className="host-metadata">
        <div><dt>Hostname</dt><dd>{host.hostname}</dd></div>
        <div><dt>IP Address</dt><dd>{host.address}<button className="copy-inline" onClick={copyAddress} aria-label="Copy IP address"><Copy size={14} /></button></dd></div>
        <div><dt>Operating System</dt><dd>{host.os}</dd></div>
        <div><dt>Uptime</dt><dd>{host.uptime}</dd></div>
        <div><dt>Last Check</dt><dd className="last-check">{host.last_check} <span className="status-dot online" /></dd></div>
      </dl>

      <div className="host-actions">
        <button className="button button-primary" onClick={() => onNotice("SSH is simulated in v0.1; no connection was opened.")}>
          <TerminalSquare size={17} /> SSH Connect
        </button>
        <button className="button button-quiet" onClick={() => onNotice("Web UI launch is disabled for the generic example inventory.")}>
          <Globe size={17} /> Web UI <ExternalLink size={12} />
        </button>
        <button className="button button-quiet" onClick={() => onNotice("Safety lock: reboot was not executed in v0.1.")}>
          <RotateCw size={17} /> Reboot
        </button>
        <button className="button button-quiet" onClick={() => onNotice("Additional actions are planned for a future release.")}>
          More <ChevronDown size={15} />
        </button>
        {host.reboot_required && <span className="reboot-note"><Power size={14} /> Reboot recommended</span>}
      </div>

      <TerminalPanel host={host} executions={executions} onClear={onClearTerminal} onNotice={onNotice} />
    </section>
  );
}
