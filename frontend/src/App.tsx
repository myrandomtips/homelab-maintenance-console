import { AlertTriangle, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { Header } from "./components/Header";
import { HostDetails } from "./components/HostDetails";
import { RunbookPanel } from "./components/RunbookPanel";
import { ServerTree } from "./components/ServerTree";
import { terminalOutput } from "./components/TerminalPanel";
import type { CommandExecution, DashboardStatus, HistoryRecord, Host, Inventory, ParsedRunbook, Service } from "./types";
import { parseRunbook } from "./utils/runbook";

export default function App() {
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [status, setStatus] = useState<DashboardStatus | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [selectedHostId, setSelectedHostId] = useState("server-one");
  const [selectedServiceId, setSelectedServiceId] = useState("ubuntu");
  const [runbook, setRunbook] = useState<ParsedRunbook | null>(null);
  const [runbookLoading, setRunbookLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [executions, setExecutions] = useState<CommandExecution[]>([]);

  const loadDashboard = useCallback(async () => {
    setRefreshing(true);
    try {
      const [inventoryData, statusData, historyData] = await Promise.all([
        api.inventory(),
        api.status(),
        api.history(),
      ]);
      setInventory(inventoryData);
      setStatus(statusData);
      setHistory(historyData);
      setError(null);
      setSelectedHostId((currentHostId) => {
        const currentHost = inventoryData.hosts.find((host) => host.id === currentHostId);
        const nextHost = currentHost ?? inventoryData.hosts[0];
        if (nextHost) {
          setSelectedServiceId((currentServiceId) =>
            nextHost.services.some((service) => service.id === currentServiceId)
              ? currentServiceId
              : (nextHost.services[0]?.id ?? ""),
          );
        }
        return nextHost?.id ?? currentHostId;
      });
    } catch {
      setError("The console could not reach its API. Check that the backend is running.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  const selectedHost = useMemo(
    () => inventory?.hosts.find((host) => host.id === selectedHostId) ?? inventory?.hosts[0],
    [inventory, selectedHostId],
  );
  const selectedService = selectedHost?.services.find((service) => service.id === selectedServiceId) ?? selectedHost?.services[0];

  useEffect(() => {
    if (!selectedService?.runbook) {
      setRunbook(null);
      setRunbookLoading(false);
      return;
    }
    let active = true;
    setRunbookLoading(true);
    api.runbook(selectedService.runbook)
      .then((response) => { if (active) setRunbook(parseRunbook(response.content)); })
      .catch(() => { if (active) setError("The selected runbook could not be loaded."); })
      .finally(() => { if (active) setRunbookLoading(false); });
    return () => { active = false; };
  }, [selectedService?.runbook]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  function selectService(host: Host, service: Service) {
    setSelectedHostId(host.id);
    setSelectedServiceId(service.id);
    setExecutions([]);
  }

  function runCommand(command: string) {
    setExecutions((current) => [...current, { id: Date.now(), command, output: terminalOutput(command) }]);
    setNotice("Command sent to the safe mock terminal. Nothing was executed remotely.");
  }

  if (!inventory || !selectedHost) {
    return (
      <div className="app-loading">
        {error ? <><AlertTriangle size={28} /><strong>Unable to load console</strong><p>{error}</p><button className="button button-primary" onClick={() => void loadDashboard()}>Try again</button></> : <><div className="loading-logo">H</div><strong>Loading maintenance console…</strong></>}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Header
        status={status}
        refreshing={refreshing}
        onRefresh={() => { void loadDashboard(); setNotice("Inventory and status refreshed."); }}
        onTheme={() => setNotice("Theme controls are planned for a future release.")}
      />
      {error && <div className="error-banner"><AlertTriangle size={16} /> {error}<button onClick={() => setError(null)} aria-label="Dismiss error"><X size={15} /></button></div>}
      <main className="workspace">
        <ServerTree
          hosts={inventory.hosts}
          selectedHostId={selectedHost.id}
          selectedServiceId={selectedService?.id ?? ""}
          onSelect={selectService}
          lastCheck={status?.last_check ?? "—"}
        />
        <RunbookPanel runbook={runbook} loading={runbookLoading} history={history} onRun={runCommand} onNotice={setNotice} />
        <HostDetails host={selectedHost} executions={executions} onClearTerminal={() => setExecutions([])} onNotice={setNotice} />
      </main>
      {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice(null)} aria-label="Dismiss notification"><X size={14} /></button></div>}
    </div>
  );
}
