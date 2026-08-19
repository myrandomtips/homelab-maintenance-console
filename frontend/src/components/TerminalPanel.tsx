import { useEffect, useRef, useState } from "react";
import { Plug, PlugZap, Trash2 } from "lucide-react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import type { CommandExecution, Host } from "../types";

interface TerminalPanelProps { host: Host; executions: CommandExecution[]; onClear: () => void; onNotice: (message: string) => void; }
type TerminalState = "not-configured" | "disconnected" | "connecting" | "connected" | "error";

const mockUpdateOutput = ["Reading package lists... Done", "All packages are up to date."];

export function terminalOutput(command: string): string[] {
  if (command.includes("apt")) return mockUpdateOutput;
  if (command.includes("docker ps")) return ["CONTAINER ID   IMAGE          STATUS", "demo123        example/app    Up 12 days (healthy)"];
  if (command.includes("docker system df")) return ["TYPE       TOTAL   ACTIVE   SIZE", "Images     6       4        2.14GB"];
  if (command.includes("tailscale")) return ["[simulation] Tailscale status check completed."];
  if (command.includes("zpool")) return ["[simulation] Pool health: ONLINE"];
  if (command.includes("reboot")) return ["[simulation] Reboot was not executed."];
  return ["[simulation] Command was not executed remotely."];
}

export function TerminalPanel({ host, executions, onClear, onNotice }: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const renderedCount = useRef(0);
  const [state, setState] = useState<TerminalState>(host.connection.ssh.enabled ? "disconnected" : "not-configured");
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const terminal = new Terminal({
      cursorBlink: true, fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace', fontSize: 13,
      lineHeight: 1.25, scrollback: 1500, convertEol: true,
      theme: { background: "#0b1117", foreground: "#d8e1e8", cursor: "#a9b7c3", green: "#55c77a", blue: "#63a5ff" },
    });
    const fit = new FitAddon(); terminal.loadAddon(fit); terminal.open(containerRef.current);
    terminalRef.current = terminal; fitRef.current = fit;
    const resizeObserver = new ResizeObserver(() => { fit.fit(); const socket = socketRef.current; if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "resize", cols: terminal.cols, rows: terminal.rows })); });
    resizeObserver.observe(containerRef.current);
    const dataDisposable = terminal.onData((data) => { const socket = socketRef.current; if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "input", data })); });
    requestAnimationFrame(() => fit.fit());
    return () => { socketRef.current?.close(); resizeObserver.disconnect(); dataDisposable.dispose(); terminal.dispose(); terminalRef.current = null; };
  }, []);

  useEffect(() => {
    socketRef.current?.close(); socketRef.current = null;
    const nextState = host.connection.ssh.enabled ? "disconnected" : "not-configured";
    setState(nextState); setConnectionError(null); renderedCount.current = 0;
    const terminal = terminalRef.current;
    if (!terminal) return;
    terminal.clear();
    if (host.connection.ssh.enabled) terminal.writeln(`\x1b[36m${host.name}\x1b[0m — SSH is ready to connect.`);
    else {
      terminal.writeln("\x1b[33mSSH NOT CONFIGURED\x1b[0m");
      terminal.writeln("This public example remains in safe simulation mode.");
    }
  }, [host.id, host.connection.ssh.enabled, host.name]);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal || host.connection.ssh.enabled || executions.length <= renderedCount.current) return;
    executions.slice(renderedCount.current).forEach((execution) => {
      terminal.writeln(`\r\n\x1b[36m[simulation]\x1b[0m $ ${execution.command}`);
      execution.output.forEach((line) => terminal.writeln(line));
    });
    renderedCount.current = executions.length;
  }, [executions, host.connection.ssh.enabled]);

  function connect() {
    if (!host.connection.ssh.enabled || state === "connecting" || state === "connected") return;
    setState("connecting"); setConnectionError(null);
    terminalRef.current?.writeln("\r\nConnecting with backend-managed credentials…");
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws/ssh/${encodeURIComponent(host.id)}`);
    socketRef.current = socket;
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data) as { type: string; status?: string; data?: string; message?: string };
      if (message.type === "output" && message.data) terminalRef.current?.write(message.data);
      if (message.type === "status" && message.status === "connected") { setState("connected"); fitRef.current?.fit(); }
      if (message.type === "error") { setConnectionError(message.message ?? "SSH connection failed"); setState("error"); terminalRef.current?.writeln(`\r\n\x1b[31m${message.message ?? "SSH connection failed"}\x1b[0m`); }
    };
    socket.onerror = () => { if (socketRef.current === socket) { setConnectionError("Terminal WebSocket connection failed"); setState("error"); } };
    socket.onclose = () => { if (socketRef.current === socket) { socketRef.current = null; setState((current) => current === "error" ? "error" : "disconnected"); } };
  }

  function disconnect() { socketRef.current?.close(1000, "User disconnected"); socketRef.current = null; setState("disconnected"); terminalRef.current?.writeln("\r\n\x1b[33mDisconnected.\x1b[0m"); }
  function clearTerminal() { terminalRef.current?.clear(); renderedCount.current = 0; onClear(); }
  const badge = state === "not-configured" ? "SSH NOT CONFIGURED" : state.replace("-", " ").toUpperCase();

  return <section className="terminal-card">
    <div className="terminal-toolbar"><div className="terminal-label"><span className={`status-dot ${state === "connected" ? "online" : state === "error" ? "offline" : "warning"}`} /> Interactive Terminal <span className={`mock-badge terminal-${state}`}>{badge}</span></div>
      <div className="terminal-actions">{host.connection.ssh.enabled && state !== "connected" && <button className="button button-primary button-small" onClick={connect} disabled={state === "connecting"}><PlugZap size={14} /> {state === "connecting" ? "Connecting…" : "SSH Connect"}</button>}{state === "connected" && <button className="button button-quiet button-small" onClick={disconnect}><Plug size={14} /> Disconnect</button>}<button className="icon-button tiny" onClick={clearTerminal} aria-label="Clear terminal"><Trash2 size={16} /></button></div>
    </div>
    {connectionError && <div className="terminal-error">{connectionError}</div>}
    <div className="terminal-screen" ref={containerRef} aria-label={`Terminal for ${host.name}`} />
  </section>;
}
