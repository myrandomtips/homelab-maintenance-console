export type Status = "online" | "offline" | "warning";
export type HistoryResult = "Success" | "Failed" | "Pending";

export interface Service {
  id: string;
  name: string;
  type: string;
  status: Status;
  updates: number;
  runbook: string | null;
  web_url: string | null;
}

export interface Host {
  id: string;
  name: string;
  hostname: string;
  address: string;
  os: string;
  status: Status;
  updates: number;
  uptime: string;
  last_check: string;
  reboot_required: boolean;
  connection: {
    ssh: {
      enabled: boolean;
      user: string | null;
      port: number;
    };
    web_url: string | null;
  };
  services: Service[];
}

export interface Inventory {
  application: { name: string; version: string };
  hosts: Host[];
}

export interface DashboardStatus {
  hosts_online: number;
  hosts_total: number;
  os_updates: number;
  docker_updates: number;
  reboot_required: number;
  last_check: string;
}

export interface DiskStatus { used_percent: number | null; }
export interface DockerStatus { installed: boolean; version: string | null; running_containers: number | null; }
export interface TailscaleStatus { installed: boolean; version: string | null; }

export interface HostStatus {
  host_id: string;
  reachable: boolean;
  os: string | null;
  kernel: string | null;
  hostname: string | null;
  uptime: string | null;
  updates: number | null;
  reboot_required: boolean | null;
  disk: DiskStatus;
  docker: DockerStatus;
  tailscale: TailscaleStatus;
  checked_at: string | null;
  source: "inventory" | "live";
  error_code: string | null;
  error: string | null;
}

export interface RefreshAllResponse {
  checked: number;
  succeeded: number;
  failed: number;
  skipped: number;
  results: HostStatus[];
}

export interface RunbookResponse { name: string; content: string; }

export interface HistoryRecord {
  id: number;
  timestamp: string;
  host_id: string;
  service_id: string | null;
  action: string;
  user: string;
  result: HistoryResult;
  details: string | null;
  source: "manual" | "system" | "ssh" | "status-check";
}

export interface HistoryCreate {
  host_id: string;
  service_id: string | null;
  action: string;
  result: HistoryResult;
  details: string | null;
}

export interface RunbookStep {
  title: string;
  description: string;
  command?: string;
  runnable: boolean;
}

export interface ParsedRunbook { title: string; description: string; steps: RunbookStep[]; }
export interface CommandExecution { id: number; command: string; output: string[]; }
