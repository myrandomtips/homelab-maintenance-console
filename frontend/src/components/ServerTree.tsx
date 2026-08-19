import { AppWindow, Box, ChevronDown, ChevronRight, CircleDot, Database, Network, Search, Server, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import type { Host, HostStatus, Service } from "../types";

interface ServerTreeProps {
  hosts: Host[];
  statuses: Record<string, HostStatus>;
  selectedHostId: string;
  selectedServiceId: string | null;
  onSelectHost: (host: Host) => void;
  onSelectService: (host: Host, service: Service) => void;
  lastCheck: string;
}

function ServiceIcon({ type }: { type: string }) {
  if (type === "container-engine") return <Box size={16} />;
  if (type === "networking") return <Network size={16} />;
  if (type === "storage") return <Database size={16} />;
  if (type === "application") return <AppWindow size={16} />;
  return <CircleDot size={16} />;
}

export function ServerTree({ hosts, statuses, selectedHostId, selectedServiceId, onSelectHost, onSelectService, lastCheck }: ServerTreeProps) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(hosts.map((host) => host.id)));

  useEffect(() => { setExpanded((current) => current.size ? current : new Set(hosts.map((host) => host.id))); }, [hosts]);
  const normalized = query.toLowerCase().trim();
  const filtered = hosts.map((host) => ({
    ...host,
    services: normalized ? host.services.filter((service) => `${service.name} ${service.type}`.toLowerCase().includes(normalized)) : host.services,
  })).filter((host) => !normalized || `${host.name} ${host.hostname}`.toLowerCase().includes(normalized) || host.services.length > 0);

  function chooseHost(host: Host) {
    onSelectHost(host);
    setExpanded((current) => {
      const next = new Set(current);
      next.has(host.id) ? next.delete(host.id) : next.add(host.id);
      return next;
    });
  }

  const checkedLabel = lastCheck === "Not checked" ? lastCheck : new Date(lastCheck).toLocaleString();

  return (
    <aside className="panel server-panel">
      <div className="panel-heading compact-heading"><div><span className="eyebrow">Infrastructure</span><h2>Servers</h2></div><span className="host-count">{hosts.length} hosts</span></div>
      <div className="search-row">
        <label className="search-box"><Search size={16} /><input type="search" placeholder="Search servers & services..." value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search servers and services" /></label>
        <button className="icon-button small" aria-label="Filter options" title="Filter options"><SlidersHorizontal size={17} /></button>
      </div>
      <nav className="server-tree" aria-label="Server inventory">
        {filtered.length === 0 && <div className="empty-state">No servers or services match “{query}”.</div>}
        {filtered.map((host) => {
          const isExpanded = expanded.has(host.id) || Boolean(normalized);
          const selectedHost = host.id === selectedHostId;
          const live = statuses[host.id];
          const hostStatus = live ? (live.reachable ? "online" : "offline") : host.status;
          const updates = live?.updates ?? host.updates;
          return <div className="host-group" key={host.id}>
            <button className={`tree-host ${selectedHost && !selectedServiceId ? "host-active" : ""}`} onClick={() => chooseHost(host)} aria-expanded={isExpanded}>
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}<Server size={17} className="tree-main-icon" />
              <span className="tree-label">{host.name}</span>{updates > 0 && <span className="count-badge">{updates}</span>}<span className={`status-dot ${hostStatus}`} aria-label={hostStatus} />
            </button>
            {isExpanded && <div className="service-list">{host.services.map((service) => {
              const selected = selectedHost && service.id === selectedServiceId;
              return <button className={`tree-service ${selected ? "selected" : ""}`} onClick={() => onSelectService(host, service)} key={`${host.id}-${service.id}`}>
                <span className={`service-icon type-${service.type}`}><ServiceIcon type={service.type} /></span><span className="tree-label">{service.name}</span>
                {service.updates > 0 && <span className="count-badge">{service.updates}</span>}<span className={`status-dot ${service.status}`} aria-label={service.status} />
              </button>;
            })}</div>}
          </div>;
        })}
      </nav>
      <div className="panel-footer"><span><i className="status-dot online" /> Inventory ready</span><span>Last check: {checkedLabel}</span></div>
    </aside>
  );
}
