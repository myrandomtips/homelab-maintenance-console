import type { DashboardStatus, HistoryRecord, Inventory, RunbookResponse } from "./types";

async function request<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  inventory: () => request<Inventory>("/api/inventory"),
  status: () => request<DashboardStatus>("/api/status"),
  runbook: (name: string) => request<RunbookResponse>(`/api/runbooks/${encodeURIComponent(name)}`),
  history: () => request<HistoryRecord[]>("/api/history"),
};
