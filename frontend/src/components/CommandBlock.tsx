import { Check, Copy, Play } from "lucide-react";
import { useState } from "react";

interface CommandBlockProps {
  command: string;
  runnable: boolean;
  onRun: (command: string) => void;
}

export function CommandBlock({ command, runnable, onRun }: CommandBlockProps) {
  const [copied, setCopied] = useState(false);

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = command;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="command-block">
      <code>{command}</code>
      <div className="command-actions">
        <button className="button button-quiet button-small" onClick={copyCommand}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
        {runnable && (
          <button className="button button-primary button-small" onClick={() => onRun(command)}>
            <Play size={14} fill="currentColor" /> Run
          </button>
        )}
      </div>
    </div>
  );
}
