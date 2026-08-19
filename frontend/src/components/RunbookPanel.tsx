import { BookOpen, FilePenLine, LoaderCircle } from "lucide-react";
import type { HistoryRecord, ParsedRunbook } from "../types";
import { CommandBlock } from "./CommandBlock";
import { MaintenanceHistory } from "./MaintenanceHistory";

interface RunbookPanelProps {
  runbook: ParsedRunbook | null;
  loading: boolean;
  history: HistoryRecord[];
  onRun: (command: string) => void;
  onNotice: (message: string) => void;
}

export function RunbookPanel({ runbook, loading, history, onRun, onNotice }: RunbookPanelProps) {
  return (
    <section className="panel runbook-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Procedures</span>
          <h2>Runbook / Notes</h2>
        </div>
        <button className="icon-button small" onClick={() => onNotice("Runbook editing is planned for a future release.")} aria-label="Edit runbook">
          <FilePenLine size={17} />
        </button>
      </div>

      <div className="runbook-content">
        {loading && <div className="loading-state"><LoaderCircle className="spin" /> Loading runbook…</div>}
        {!loading && runbook && (
          <>
            <div className="runbook-title">
              <span className="title-icon"><BookOpen size={20} /></span>
              <div><h3>{runbook.title}</h3><p>{runbook.description}</p></div>
            </div>
            <div className="steps">
              {runbook.steps.map((step) => (
                <article className="runbook-step" key={step.title}>
                  <h4>{step.title}</h4>
                  {step.description && <p>{step.description}</p>}
                  {step.command && <CommandBlock command={step.command} runnable={step.runnable} onRun={onRun} />}
                </article>
              ))}
            </div>
            <MaintenanceHistory records={history} />
          </>
        )}
      </div>
    </section>
  );
}
