import {
  Box,
  MoonStar,
  RefreshCw,
  RotateCcw,
  Server,
  ShieldCheck,
} from "lucide-react";
import type { DashboardStatus } from "../types";

interface HeaderProps {
  status: DashboardStatus | null;
  refreshing: boolean;
  onRefresh: () => void;
  onTheme: () => void;
}

const cards = [
  { key: "hosts", label: "Hosts Online", icon: ShieldCheck, tone: "green" },
  { key: "os", label: "OS Updates", icon: RotateCcw, tone: "orange" },
  { key: "docker", label: "Docker Updates", icon: Box, tone: "blue" },
  { key: "reboot", label: "Reboot Required", icon: RefreshCw, tone: "red" },
] as const;

function valueFor(key: (typeof cards)[number]["key"], status: DashboardStatus | null) {
  if (!status) return "—";
  if (key === "hosts") return `${status.hosts_online} / ${status.hosts_total}`;
  if (key === "os") return status.os_updates;
  if (key === "docker") return status.docker_updates;
  return status.reboot_required;
}

export function Header({ status, refreshing, onRefresh, onTheme }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">
          <Server size={24} />
        </div>
        <div>
          <h1>Homelab Maintenance Console</h1>
          <p>Operate <span>•</span> Maintain <span>•</span> Automate</p>
        </div>
      </div>

      <div className="dashboard-stats" aria-label="Infrastructure summary">
        {cards.map(({ key, label, icon: Icon, tone }) => (
          <div className="stat-card" key={key}>
            <span className={`stat-icon ${tone}`}><Icon size={17} /></span>
            <span>
              <small>{label}</small>
              <strong>{valueFor(key, status)}</strong>
            </span>
          </div>
        ))}
      </div>

      <div className="header-actions">
        <button className="icon-button" onClick={onRefresh} aria-label="Refresh dashboard" title="Refresh dashboard">
          <RefreshCw size={19} className={refreshing ? "spin" : ""} />
        </button>
        <button className="icon-button" onClick={onTheme} aria-label="Theme options" title="Theme options">
          <MoonStar size={19} />
        </button>
        <div className="avatar" aria-label="Signed in as admin">A</div>
      </div>
    </header>
  );
}
