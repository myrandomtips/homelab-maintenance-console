import { History, Plus, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { HistoryCreate, HistoryRecord, HistoryResult, Host, Service } from "../types";

interface Props { records: HistoryRecord[]; loading: boolean; host: Host; service?: Service; onAdd: (payload: HistoryCreate) => Promise<void>; }

export function MaintenanceHistory({ records, loading, host, service, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState("");
  const [result, setResult] = useState<HistoryResult>("Success");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setFormError(null);
    try {
      await onAdd({ host_id: host.id, service_id: service?.id ?? null, action, result, details: details.trim() || null });
      setAction(""); setDetails(""); setResult("Success"); setOpen(false);
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "Record could not be saved.");
    } finally { setSaving(false); }
  }

  return <section className="history-section">
    <div className="history-heading"><h3><History size={17} /> Maintenance History</h3><button className="button button-quiet button-small" onClick={() => setOpen(true)}><Plus size={14} /> Add Maintenance Record</button></div>
    {loading ? <div className="history-empty">Loading history…</div> : records.length === 0 ? <div className="history-empty"><History size={22} /><strong>No maintenance records yet</strong><span>Add the first record for {service?.name ?? host.name}.</span></div> :
      <div className="history-table-wrap"><table><thead><tr><th>Date</th><th>Action</th><th>User</th><th>Result</th></tr></thead><tbody>{records.map((record) => <tr key={record.id} title={record.details ?? undefined}><td>{new Date(record.timestamp).toLocaleString()}</td><td>{record.action}</td><td>{record.user}</td><td><span className={`result-badge ${record.result.toLowerCase()}`}>{record.result}</span></td></tr>)}</tbody></table></div>}
    {open && <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><form className="record-dialog" role="dialog" aria-modal="true" aria-label="Add maintenance record" onSubmit={submit}>
      <div className="dialog-title"><div><span className="eyebrow">{host.name}{service ? ` / ${service.name}` : ""}</span><h3>Add Maintenance Record</h3></div><button type="button" className="icon-button tiny" onClick={() => setOpen(false)} aria-label="Close"><X size={16} /></button></div>
      <label>Action<input required maxLength={160} value={action} onChange={(event) => setAction(event.target.value)} placeholder="Routine maintenance completed" /></label>
      <label>Result<select value={result} onChange={(event) => setResult(event.target.value as HistoryResult)}><option>Success</option><option>Failed</option><option>Pending</option></select></label>
      <label>Notes<textarea maxLength={2000} rows={4} value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Optional details" /></label>
      {formError && <p className="form-error">{formError}</p>}
      <div className="dialog-actions"><button type="button" className="button button-quiet" onClick={() => setOpen(false)}>Cancel</button><button className="button button-primary" disabled={saving || !action.trim()}>{saving ? "Saving…" : "Save Record"}</button></div>
    </form></div>}
  </section>;
}
