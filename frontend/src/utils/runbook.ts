import type { ParsedRunbook, RunbookStep } from "../types";

export function parseRunbook(markdown: string): ParsedRunbook {
  const title = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "Maintenance Notes";
  const firstSection = markdown.search(/^##\s+/m);
  const introduction = markdown.slice(0, firstSection === -1 ? undefined : firstSection);
  const description = introduction
    .replace(/^#\s+.+$/m, "")
    .trim()
    .split("\n\n")[0]
    .trim();

  const sections = markdown.split(/^##\s+/m).slice(1);
  const steps: RunbookStep[] = sections.map((section) => {
    const [heading = "Maintenance step", ...lines] = section.split("\n");
    const body = lines.join("\n");
    const command = body.match(/```(?:bash|sh)?\s*\n([\s\S]*?)```/)?.[1]?.trim();
    const descriptionText = body
      .replace(/```[\s\S]*?```/g, "")
      .replace(/<!--\s*runnable\s*-->/g, "")
      .trim()
      .split("\n\n")[0]
      .trim();
    return {
      title: heading.trim(),
      description: descriptionText,
      command,
      runnable: /<!--\s*runnable\s*-->/.test(body),
    };
  });

  return { title, description, steps };
}
