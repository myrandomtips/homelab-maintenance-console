import {
  AppWindow,
  Box,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Database,
  Network,
  Search,
  Server,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Host, Service } from "../types";

interface ServerTreeProps {
  hosts: Host[];
  selectedHostId: string;
  selectedServiceId: string;
  onSelect: (host: Host, service: Service) => void;
  lastCheck: string;
}

function ServiceIcon({ type }: { type: string }) {
  if (type === "container-engine") return <Box size={16} />;
  if (type === "networking") return <Network size={16} />;
  if (type === "storage") return <Database size={16} />;
  if (type === "application") return <AppWindow size={16} />;
  return <CircleDot size={16} />;
}

export function ServerTree({ hosts, selectedHostId, selectedServiceId, onSelect, lastCheck }: ServerTreeProps) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(hosts.map((host) => host.id)));

  useEffect(() => {
    setExpanded((current) => current.size ? current : new Set(hosts.map((host) => host.id)));
  }, [hosts]);

  const normalized = query.toLowerCase().trim();
  const filtered = hosts
    .map((host) => ({
      ...host,
      services: normalized
        ? host.services.filter((service) =>
            `${service.name} ${service.type}`.toLowerCase().includes(normalized),
          )
        : host.services,
    }))
    .filter((host) =>
      !normalized || host.name.toLowerCase().includes(normalized) || host.services.length > 0,
    );

  function toggleHost(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <aside className="panel server-panel">
      <div className="panel-heading compact-heading">
        <div>
          <span className="eyebrow">Infrastructure</span>
          <h2>Servers</h2>
        </div>
        <span className="host-count">{hosts.length} hosts</span>
      </div>

      <div className="search-row">
        <label className="search-box">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search servers & services..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search servers and services"
          />
        </label>
        <button className="icon-button small" aria-label="Filter options" title="Filter options">
          <SlidersHorizontal size={17} />
        </button>
      </div>

      <nav className="server-tree" aria-label="Server inventory">
        {filtered.length === 0 && <div className="empty-state">No servers or services match “{query}”.</div>}
        {filtered.map((host) => {
          const isExpanded = expanded.has(host.id) || Boolean(normalized);
          const selectedHost = host.id === selectedHostId;
          return (
            <div className="host-group" key={host.id}>
              <button
                className={`tree-host ${selectedHost ? "host-active" : ""}`}
                onClick={() => toggleHost(host.id)}
                aria-expanded={isExpanded}
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <Server size={17} className="tree-main-icon" />
                <span className="tree-label">{host.name}</span>
                {host.updates > 0 && <span className="count-badge">{host.updates}</span>}
                <span className={`status-dot ${host.status}`} aria-label={host.status} />
              </button>

              {isExpanded && (
                <div className="service-list">
                  {host.services.map((service) => {
                    const selected = selectedHost && service.id === selectedServiceId;
                    return (
                      <button
                        className={`tree-service ${selected ? "selected" : ""}`}
                        onClick={() => onSelect(host, service)}
                        key={`${host.id}-${service.id}`}
                      >
                        <span className={`service-icon type-${service.type}`}><ServiceIcon type={service.type} /></span>
                        <span className="tree-label">{service.name}</span>
                        {service.updates > 0 && <span className="count-badge">{service.updates}</span>}
                        <span className={`status-dot ${service.status}`} aria-label={service.status} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="panel-footer">
        <span><i className="status-dot online" /> All systems nominal</span>
        <span>Last check: {lastCheck}</span>
      </div>
    </aside>
  );
}
