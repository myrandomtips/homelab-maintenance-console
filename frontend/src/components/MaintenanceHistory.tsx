import { ExternalLink, History } from "lucide-react";
import type { HistoryRecord } from "../types";

export function MaintenanceHistory({ records }: { records: HistoryRecord[] }) {
  return (
    <section className="history-section">
      <h3><History size={17} /> Maintenance History</h3>
      <div className="history-table-wrap">
        <table>
          <thead>
            <tr><th>Date</th><th>Action</th><th>User</th><th>Result</th></tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={`${record.date}-${record.action}`}>
                <td>{record.date}</td>
                <td>{record.action}</td>
                <td>{record.user}</td>
                <td><span className={`result-badge ${record.result.toLowerCase()}`}>{record.result}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="button button-quiet history-button">View full history <ExternalLink size={13} /></button>
    </section>
  );
}
