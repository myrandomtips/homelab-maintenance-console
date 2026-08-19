import { BookOpen, FilePenLine, LoaderCircle } from "lucide-react";
import type { HistoryCreate, HistoryRecord, Host, ParsedRunbook, Service } from "../types";
import { CommandBlock } from "./CommandBlock";
import { MaintenanceHistory } from "./MaintenanceHistory";

interface RunbookPanelProps {
  runbook: ParsedRunbook | null;
  loading: boolean;
  history: HistoryRecord[];
  historyLoading: boolean;
  host: Host;
  service?: Service;
  onRun: (command: string) => void;
  onAddRecord: (payload: HistoryCreate) => Promise<void>;
  onNotice: (message: string) => void;
}

export function RunbookPanel({ runbook, loading, history, historyLoading, host, service, onRun, onAddRecord, onNotice }: RunbookPanelProps) {
  return <section className="panel runbook-panel">
    <div className="panel-heading"><div><span className="eyebrow">Procedures</span><h2>Runbook / Notes</h2></div><button className="icon-button small" onClick={() => onNotice("Runbook editing is planned for a future release.")} aria-label="Edit runbook"><FilePenLine size={17} /></button></div>
    <div className="runbook-content">
      {loading && <div className="loading-state"><LoaderCircle className="spin" /> Loading runbook…</div>}
      {!loading && runbook && <><div className="runbook-title"><span className="title-icon"><BookOpen size={20} /></span><div><h3>{runbook.title}</h3><p>{runbook.description}</p></div></div>
        <div className="steps">{runbook.steps.map((step) => <article className="runbook-step" key={step.title}><h4>{step.title}</h4>{step.description && <p>{step.description}</p>}{step.command && <CommandBlock command={step.command} runnable={step.runnable} onRun={onRun} />}</article>)}</div></>}
      {!loading && !runbook && <div className="runbook-empty"><BookOpen size={22} /><strong>Host overview selected</strong><span>Select a service to view its runbook.</span></div>}
      <MaintenanceHistory records={history} loading={historyLoading} host={host} service={service} onAdd={onAddRecord} />
    </div>
  </section>;
}
