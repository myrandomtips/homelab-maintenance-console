export type Status = "online" | "offline" | "warning";

export interface Service {
  id: string;
  name: string;
  type: string;
  status: Status;
  updates: number;
  runbook: string | null;
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
    ssh: { enabled: boolean; user: string | null };
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

export interface RunbookResponse {
  name: string;
  content: string;
}

export interface HistoryRecord {
  date: string;
  action: string;
  user: string;
  result: "Success" | "Failed" | "Pending";
}

export interface RunbookStep {
  title: string;
  description: string;
  command?: string;
  runnable: boolean;
}

export interface ParsedRunbook {
  title: string;
  description: string;
  steps: RunbookStep[];
}

export interface CommandExecution {
  id: number;
  command: string;
  output: string[];
}
