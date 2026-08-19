import type {
  DashboardStatus,
  HistoryCreate,
  HistoryRecord,
  HostStatus,
  Inventory,
  RefreshAllResponse,
  RunbookResponse,
} from "./types";

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    let code: string | undefined;
    try {
      const payload = await response.json() as { detail?: string | { message?: string; code?: string } };
      if (typeof payload.detail === "string") message = payload.detail;
      if (payload.detail && typeof payload.detail === "object") {
        message = payload.detail.message ?? message;
        code = payload.detail.code;
      }
    } catch { /* Keep the status-based message. */ }
    throw new ApiError(message, response.status, code);
  }
  return response.json() as Promise<T>;
}

function historyQuery(hostId?: string, serviceId?: string | null) {
  const params = new URLSearchParams();
  if (hostId) params.set("host_id", hostId);
  if (serviceId) params.set("service_id", serviceId);
  return params.size ? `?${params}` : "";
}

export const api = {
  inventory: () => request<Inventory>("/api/inventory"),
  status: () => request<DashboardStatus>("/api/status"),
  hostStatuses: () => request<HostStatus[]>("/api/hosts/statuses"),
  refreshHost: (hostId: string) => request<HostStatus>(`/api/hosts/${encodeURIComponent(hostId)}/refresh`, { method: "POST" }),
  refreshAll: () => request<RefreshAllResponse>("/api/hosts/refresh-all", { method: "POST" }),
  runbook: (name: string) => request<RunbookResponse>(`/api/runbooks/${encodeURIComponent(name)}`),
  history: (hostId?: string, serviceId?: string | null) => request<HistoryRecord[]>(`/api/history${historyQuery(hostId, serviceId)}`),
  createHistory: (payload: HistoryCreate) => request<HistoryRecord>("/api/history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }),
};
