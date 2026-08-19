import { AlertTriangle, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { Header } from "./components/Header";
import { HostDetails } from "./components/HostDetails";
import { RunbookPanel } from "./components/RunbookPanel";
import { ServerTree } from "./components/ServerTree";
import { terminalOutput } from "./components/TerminalPanel";
import type { CommandExecution, DashboardStatus, HistoryCreate, HistoryRecord, Host, HostStatus, Inventory, ParsedRunbook, Service } from "./types";
import { parseRunbook } from "./utils/runbook";

export default function App() {
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [status, setStatus] = useState<DashboardStatus | null>(null);
  const [liveStatuses, setLiveStatuses] = useState<Record<string, HostStatus>>({});
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHostId, setSelectedHostId] = useState("server-one");
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>("ubuntu");
  const [runbook, setRunbook] = useState<ParsedRunbook | null>(null);
  const [runbookLoading, setRunbookLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingHost, setRefreshingHost] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [executions, setExecutions] = useState<CommandExecution[]>([]);

  const loadDashboard = useCallback(async () => {
    try {
      const [inventoryData, statusData, statusesData] = await Promise.all([
        api.inventory(), api.status(), api.hostStatuses(),
      ]);
      setInventory(inventoryData);
      setStatus(statusData);
      setLiveStatuses(Object.fromEntries(statusesData.map((item) => [item.host_id, item])));
      setError(null);
      setSelectedHostId((currentHostId) => inventoryData.hosts.some((host) => host.id === currentHostId)
        ? currentHostId : (inventoryData.hosts[0]?.id ?? ""));
    } catch {
      setError("The console could not reach its API. Check that the backend is running.");
    }
  }, []);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  const selectedHost = useMemo(
    () => inventory?.hosts.find((host) => host.id === selectedHostId) ?? inventory?.hosts[0],
    [inventory, selectedHostId],
  );
  const selectedService = selectedServiceId
    ? selectedHost?.services.find((service) => service.id === selectedServiceId)
    : undefined;

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

  const loadHistory = useCallback(async () => {
    if (!selectedHost) return;
    setHistoryLoading(true);
    try {
      setHistory(await api.history(selectedHost.id, selectedService?.id));
    } catch {
      setError("Maintenance history could not be loaded.");
    } finally {
      setHistoryLoading(false);
    }
  }, [selectedHost, selectedService?.id]);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 3800);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  function selectHost(host: Host) {
    setSelectedHostId(host.id);
    setSelectedServiceId(null);
    setExecutions([]);
  }

  function selectService(host: Host, service: Service) {
    setSelectedHostId(host.id);
    setSelectedServiceId(service.id);
    setExecutions([]);
  }

  function simulateCommand(command: string) {
    setExecutions((current) => [...current, { id: Date.now(), command, output: terminalOutput(command) }]);
    setNotice("Command simulated locally. Nothing was sent to the host.");
  }

  async function refreshAllHosts() {
    setRefreshing(true);
    try {
      const result = await api.refreshAll();
      await loadDashboard();
      await loadHistory();
      setNotice(result.checked === 0
        ? "No SSH-enabled hosts are configured; inventory fallback remains active."
        : `Checked ${result.checked} hosts: ${result.succeeded} succeeded, ${result.failed} failed.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Host refresh failed.");
    } finally {
      setRefreshing(false);
    }
  }

  async function refreshSelectedHost() {
    if (!selectedHost) return;
    setRefreshingHost(true);
    try {
      const refreshed = await api.refreshHost(selectedHost.id);
      setLiveStatuses((current) => ({ ...current, [selectedHost.id]: refreshed }));
      setStatus(await api.status());
      await loadHistory();
      setNotice(`${selectedHost.name} status updated.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Host refresh failed.");
    } finally {
      setRefreshingHost(false);
    }
  }

  async function addMaintenanceRecord(payload: HistoryCreate) {
    await api.createHistory(payload);
    await loadHistory();
    setNotice("Maintenance record saved.");
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
      <Header status={status} refreshing={refreshing} onRefresh={() => void refreshAllHosts()} onTheme={() => setNotice("Theme controls are planned for a future release.")} />
      {error && <div className="error-banner" role="alert"><AlertTriangle size={16} /> {error}<button onClick={() => setError(null)} aria-label="Dismiss error"><X size={15} /></button></div>}
      <main className="workspace">
        <ServerTree
          hosts={inventory.hosts}
          statuses={liveStatuses}
          selectedHostId={selectedHost.id}
          selectedServiceId={selectedService?.id ?? null}
          onSelectHost={selectHost}
          onSelectService={selectService}
          lastCheck={status?.last_check ?? "—"}
        />
        <RunbookPanel
          runbook={runbook}
          loading={runbookLoading}
          history={history}
          historyLoading={historyLoading}
          host={selectedHost}
          service={selectedService}
          onRun={simulateCommand}
          onAddRecord={addMaintenanceRecord}
          onNotice={setNotice}
        />
        <HostDetails
          host={selectedHost}
          service={selectedService}
          liveStatus={liveStatuses[selectedHost.id]}
          refreshing={refreshingHost}
          executions={executions}
          onRefresh={() => void refreshSelectedHost()}
          onClearTerminal={() => setExecutions([])}
          onNotice={setNotice}
        />
      </main>
      {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice(null)} aria-label="Dismiss notification"><X size={14} /></button></div>}
    </div>
  );
}
