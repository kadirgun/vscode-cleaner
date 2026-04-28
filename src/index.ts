#!/usr/bin/env node

import checkbox from "@inquirer/checkbox";
import confirm from "@inquirer/confirm";
import ansiEscapes from "ansi-escapes";
import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";
import { WorkspaceInfo } from "./types";
import { deleteWorkspaces } from "./utils/cleaner";
import { formatBytes, formatFullDateTime, formatRelativeDate } from "./utils/formatter";
import { getAllWorkspaces } from "./utils/workspace";

const clear = () => process.stdout.write(ansiEscapes.clearScreen);

const program = new Command();

program
  .name("vscode-cleaner")
  .description("Clean VS Code workspace storage files")
  .version("1.0.0")
  .option("-o, --only <types>", "Filter by type (deleted,remote,duplicate), comma-separated for multiple")
  .option("-f, --filter <text>", "Filter by target path name or workspace UUID (partial match, case-insensitive)")
  .option("-a, --age <duration>", "Filter by age (e.g., 1d, 1w, 1m, 1y)")
  .option("-s, --sort <field>", "Sort by field (date, age), default: date");

program.action(async () => {
  clear();

  const spinner = ora({
    text: "Scanning workspaces...",
    spinner: "dots",
  }).start();

  const updateProgress = (msg: string) => {
    spinner.text = msg;
    spinner.render();
  };

  let workspaces: WorkspaceInfo[] = [];

  try {
    workspaces = getAllWorkspaces(updateProgress);
    const sortField = program.opts().sort?.toLowerCase() || "date";
    const sortedWorkspaces = [...workspaces].sort((a, b) => {
      if (sortField === "age") {
        return a.lastModified.getTime() - b.lastModified.getTime();
      }
      return b.lastModified.getTime() - a.lastModified.getTime();
    });

    const folderPathCounts = new Map<string, number>();
    for (const ws of sortedWorkspaces) {
      if (ws.folderPath) {
        folderPathCounts.set(ws.folderPath, (folderPathCounts.get(ws.folderPath) || 0) + 1);
      }
    }

    const filterTypes =
      program
        .opts()
        .only?.split(",")
        .map((t: string) => t.trim().toLowerCase()) || [];
    const isFiltered = filterTypes.length > 0;
    const filterText = program.opts().filter?.toLowerCase();
    const ageStr = program.opts().age?.toLowerCase();

    let filteredWorkspaces = sortedWorkspaces;

    if (isFiltered) {
      filteredWorkspaces = filteredWorkspaces.filter((ws) => {
        if (filterTypes.includes("deleted") && ws.isOrphan) return true;
        if (filterTypes.includes("remote") && ws.folderPath?.startsWith("vscode-remote://")) return true;
        if (filterTypes.includes("duplicate") && ws.folderPath && folderPathCounts.get(ws.folderPath)! > 1) return true;
        return false;
      });
    }

    if (filterText) {
      filteredWorkspaces = filteredWorkspaces.filter((ws) => {
        const targetName = ws.folderPath?.split(/[\\/]/).pop()?.toLowerCase() || "";
        const uuid = ws.uuid.toLowerCase();
        return targetName.includes(filterText) || uuid.includes(filterText);
      });
    }

    if (ageStr) {
      const ageMatch = ageStr.match(/^(\d+)(d|w|m|y)$/);
      if (ageMatch) {
        const value = parseInt(ageMatch[1], 10);
        const unit = ageMatch[2];
        const now = new Date();
        let cutoff: Date;

        switch (unit) {
          case "d":
            cutoff = new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
            break;
          case "w":
            cutoff = new Date(now.getTime() - value * 7 * 24 * 60 * 60 * 1000);
            break;
          case "m":
            cutoff = new Date(now.getTime() - value * 30 * 24 * 60 * 60 * 1000);
            break;
          case "y":
            cutoff = new Date(now.getTime() - value * 365 * 24 * 60 * 60 * 1000);
            break;
          default:
            cutoff = new Date(0);
        }

        filteredWorkspaces = filteredWorkspaces.filter((ws) => ws.lastModified <= cutoff);
      }
    }

    if (workspaces.length === 0) {
      spinner.fail("No workspaces found");
      process.exit(0);
    }

    if (filteredWorkspaces.length === 0) {
      spinner.fail("No workspaces match the filter");
      process.exit(0);
    }

    const filteredCountMsg =
      isFiltered || filterText || ageStr ? ` (${filteredWorkspaces.length} of ${workspaces.length} shown)` : "";
    spinner.succeed(`Found ${workspaces.length} workspaces${filteredCountMsg}`);

    const maxSizeLen = Math.max(...filteredWorkspaces.map((ws) => formatBytes(ws.size).length));
    const maxNameLen = Math.max(
      ...filteredWorkspaces.map((ws) => {
        const folderName = ws.folderPath?.split(/[\\/]/).pop() || "(deleted)";
        const remoteLabelLen = ws.folderPath?.startsWith("vscode-remote://") ? 9 : 0;
        return (
          folderName.length +
          (ws.isOrphan ? 10 : 0) +
          remoteLabelLen +
          (ws.folderPath && folderPathCounts.get(ws.folderPath)! > 1 ? 11 : 0)
        );
      }),
    );
    const maxDateLen = Math.max(...filteredWorkspaces.map((ws) => formatRelativeDate(ws.lastModified).length));

    const choices = filteredWorkspaces.map((ws: WorkspaceInfo) => {
      const folderName = ws.folderPath?.split(/[\\/]/).pop() || "(deleted)";
      const sizeStr = formatBytes(ws.size);
      const dateStr = formatRelativeDate(ws.lastModified);
      const orphanLabel = ws.isOrphan ? " (deleted)" : "";
      const isRemote = ws.folderPath?.startsWith("vscode-remote://") ?? false;
      const remoteLabel = isRemote ? " (remote)" : "";
      const isDuplicate = ws.folderPath && folderPathCounts.get(ws.folderPath)! > 1;
      const duplicateLabel = isDuplicate ? " (duplicate)" : "";
      const paddedSize = sizeStr.padEnd(maxSizeLen);
      const paddedName = (folderName + orphanLabel + remoteLabel + duplicateLabel).padEnd(maxNameLen);
      const paddedDate = dateStr.padEnd(maxDateLen);
      return {
        value: ws.uuid,
        name: `${paddedSize} ${paddedDate} ${ws.uuid.slice(0, 8)} ${paddedName}`,
        description: [
          `Workspace Path   ${ws.workspaceJsonPath}`,
          `Modified At      ${formatFullDateTime(ws.lastModified)}`,
          `Target Path      ${ws.folderPath || "(deleted folder)"}`,
        ].join("\n"),
      };
    });

    const selectedUuids: string[] = await checkbox({
      message: `Select workspaces to delete:`,
      choices,
      pageSize: 10,
    });

    if (!selectedUuids || selectedUuids.length === 0) {
      console.log(chalk.yellow("\n  Operation cancelled.\n"));
      process.exit(0);
    }

    const selectedWorkspaces = filteredWorkspaces.filter((ws) => selectedUuids.includes(ws.uuid));
    const totalSize = selectedWorkspaces.reduce((sum: number, ws: WorkspaceInfo) => sum + ws.size, 0);

    clear();
    process.stdout.write(ansiEscapes.eraseLines(selectedUuids.length + 6));

    const confirmed = await confirm({
      message: `Delete ${selectedWorkspaces.length} workspaces (${formatBytes(totalSize)})?`,
      default: false,
    });

    if (!confirmed) {
      console.log(chalk.yellow("\n  Operation cancelled.\n"));
      process.exit(0);
    }

    const deleteSpinner = ora({
      text: "Deleting 0/0...",
      spinner: "dots",
    }).start();

    const updateDeleteProgress = (current: number, total: number, uuid: string) => {
      deleteSpinner.text = `Deleting ${current}/${total}: ${uuid}...`;
      deleteSpinner.render();
    };

    const results = await deleteWorkspaces(selectedWorkspaces, updateDeleteProgress);
    const successCount = results.filter((r) => r.success).length;
    const totalFreed = results.reduce((sum, r) => sum + (r.success ? r.size : 0), 0);
    deleteSpinner.succeed(`Deleted ${successCount} workspaces (${formatBytes(totalFreed)} freed)`);
  } catch (err) {
    spinner.fail("Operation cancelled");
    process.exit(0);
  }
});

program.parse(process.argv);
