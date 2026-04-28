import chalk from "chalk";
import { WorkspaceInfo } from "../types";

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHour < 24) return `${diffHour}h`;
  if (diffDay < 7) return `${diffDay}d`;
  if (diffWeek < 4) return `${diffWeek}w`;
  if (diffMonth < 12) return `${diffMonth}mo`;
  return `${diffYear}y`;
}

export function formatFullDateTime(date: Date): string {
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function printWorkspaceTable(workspaces: WorkspaceInfo[]): void {
  if (workspaces.length === 0) {
    console.log(chalk.yellow("  No workspace storage found."));
    return;
  }

  console.log(chalk.bold("\n  Found workspaces:\n"));

  const rows: string[] = [];
  let index = 1;

  for (const ws of workspaces) {
    const label = ws.isOrphan ? chalk.red("(deleted)") : chalk.green(ws.folderPath || "(unknown)");
    const size = chalk.cyan(formatBytes(ws.size));
    const date = formatDate(ws.lastModified);

    rows.push(`  ${chalk.dim(String(index).padStart(2, " "))}  ${ws.uuid.slice(0, 8)}  ${label}  ${size}  ${date}`);
    index++;
  }

  console.log(chalk.dim("  ") + chalk.dim("##"));
  console.log(chalk.dim("  ID    UUID      PATH                     SIZE       DATE"));
  console.log();
  rows.forEach((row) => console.log(row));
  console.log();
}

export function printSummary(results: { success: boolean; size: number }[]): void {
  const totalSize = results.reduce((sum, r) => sum + (r.success ? r.size : 0), 0);
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.length - successCount;

  console.log(chalk.green(`\n  ${successCount} workspaces deleted (${formatBytes(totalSize)} freed)`));

  if (failCount > 0) {
    console.log(chalk.red(`  ${failCount} workspaces could not be deleted`));
  }
}
