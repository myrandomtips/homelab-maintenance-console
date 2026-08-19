import { useEffect, useRef } from "react";
import { CopyPlus, Expand, Trash2 } from "lucide-react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import type { CommandExecution, Host } from "../types";

interface TerminalPanelProps {
  host: Host;
  executions: CommandExecution[];
  onClear: () => void;
  onNotice: (message: string) => void;
}

const mockUpdateOutput = [
  "Hit:1 http://archive.ubuntu.com/ubuntu noble InRelease",
  "Hit:2 http://archive.ubuntu.com/ubuntu noble-updates InRelease",
  "Hit:3 http://security.ubuntu.com/ubuntu noble-security InRelease",
  "Reading package lists... Done",
  "Building dependency tree... Done",
  "Reading state information... Done",
  "All packages are up to date.",
];

export function terminalOutput(command: string): string[] {
  if (command.includes("apt update")) return mockUpdateOutput;
  if (command.includes("autoremove")) return ["Reading package lists... Done", "0 upgraded, 0 newly installed, 0 to remove."];
  if (command.includes("docker ps")) return ["CONTAINER ID   IMAGE          STATUS", "a7f3d2c91b1e   example/app    Up 12 days (healthy)"];
  if (command.includes("docker system df")) return ["TYPE            TOTAL     ACTIVE    SIZE", "Images          6         4         2.14GB"];
  if (command.includes("docker compose pull")) return ["[+] Pulling 2/2", " ✔ api Pulled", " ✔ web Pulled"];
  if (command.includes("tailscale status")) return ["100.64.0.10  server-one  linux  active; direct"];
  if (command.includes("tailscale netcheck")) return ["Report:", "  UDP: true", "  IPv4: yes", "  MappingVariesByDestIP: false"];
  if (command.includes("zpool status")) return ["  pool: storage", " state: ONLINE", "  scan: scrub repaired 0B with 0 errors"];
  if (command.includes("zpool list")) return ["NAME      SIZE  ALLOC   FREE  HEALTH", "storage  7.25T  3.11T  4.14T  ONLINE"];
  if (command.includes("reboot")) return ["[simulation] Reboot was not executed in v0.1."];
  return ["[simulation] Command accepted by the mock terminal."];
}

export function TerminalPanel({ host, executions, onClear, onNotice }: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const renderedCount = useRef(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: "block",
      fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.25,
      scrollback: 1000,
      convertEol: true,
      theme: {
        background: "#0b1117",
        foreground: "#d8e1e8",
        cursor: "#a9b7c3",
        green: "#55c77a",
        blue: "#63a5ff",
      },
    });
    const fit = new FitAddon();
    terminal.loadAddon(fit);
    terminal.open(containerRef.current);
    terminalRef.current = terminal;
    fitRef.current = fit;
    requestAnimationFrame(() => fit.fit());

    const resizeObserver = new ResizeObserver(() => fit.fit());
    resizeObserver.observe(containerRef.current);
    return () => {
      resizeObserver.disconnect();
      terminal.dispose();
      terminalRef.current = null;
    };
  }, []);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;
    terminal.clear();
    terminal.write(`\x1b[32madmin@${host.hostname}\x1b[0m:\x1b[34m~\x1b[0m$ sudo apt update\r\n`);
    mockUpdateOutput.forEach((line) => terminal.writeln(line));
    terminal.writeln("Fetched 6,182 kB in 2s (3,091 kB/s)");
    terminal.writeln("3 packages can be upgraded. Run 'apt list --upgradable' to see them.");
    terminal.write(`\r\n\x1b[32madmin@${host.hostname}\x1b[0m:\x1b[34m~\x1b[0m$ `);
    renderedCount.current = 0;
  }, [host.id]);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal || executions.length <= renderedCount.current) return;
    executions.slice(renderedCount.current).forEach((execution) => {
      terminal.write(`\r\n\x1b[32madmin@${host.hostname}\x1b[0m:\x1b[34m~\x1b[0m$ ${execution.command}\r\n`);
      execution.output.forEach((line) => terminal.writeln(line));
      terminal.write(`\x1b[32madmin@${host.hostname}\x1b[0m:\x1b[34m~\x1b[0m$ `);
    });
    renderedCount.current = executions.length;
  }, [executions, host.hostname]);

  function clearTerminal() {
    terminalRef.current?.clear();
    terminalRef.current?.write(`\x1b[32madmin@${host.hostname}\x1b[0m:\x1b[34m~\x1b[0m$ `);
    renderedCount.current = 0;
    onClear();
  }

  return (
    <section className="terminal-card">
      <div className="terminal-toolbar">
        <div className="terminal-label"><span className="status-dot online" /> Live Terminal <span className="mock-badge">Simulation</span></div>
        <div className="terminal-actions">
          <button className="button button-quiet button-small" onClick={() => onNotice("A new terminal tab would open here in a future release.")}>
            <CopyPlus size={15} /> New Tab
          </button>
          <button className="icon-button tiny" onClick={() => onNotice("Fullscreen terminal is planned for a future release.")} aria-label="Expand terminal"><Expand size={16} /></button>
          <button className="icon-button tiny" onClick={clearTerminal} aria-label="Clear terminal"><Trash2 size={16} /></button>
        </div>
      </div>
      <div className="terminal-screen" ref={containerRef} aria-label={`Mock terminal for ${host.name}`} />
    </section>
  );
}
