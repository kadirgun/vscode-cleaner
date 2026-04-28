import * as fs from "fs";
import * as path from "path";
import { WorkspaceInfo } from "../types";
import { expandHomeDir, getVSCodePaths } from "./paths";

interface WorkspaceJson {
  folder?: string;
  workspace?: string;
  id?: string;
}

function getAllUuids(workspaceStoragePath: string): string[] {
  if (!fs.existsSync(workspaceStoragePath)) {
    return [];
  }

  return fs.readdirSync(workspaceStoragePath).filter((item) => {
    const itemPath = path.join(workspaceStoragePath, item);
    return fs.statSync(itemPath).isDirectory();
  });
}

function parseWorkspaceJson(uuidPath: string): { folderPath: string | null; lastModified: Date } {
  const workspaceJsonPath = path.join(uuidPath, "workspace.json");

  if (!fs.existsSync(workspaceJsonPath)) {
    return { folderPath: null, lastModified: fs.statSync(uuidPath).mtime };
  }

  try {
    const content = fs.readFileSync(workspaceJsonPath, "utf-8");
    const data: WorkspaceJson = JSON.parse(content);

    const folderValue = data.folder ?? data.workspace;
    if (folderValue && typeof folderValue === "string") {
      return {
        folderPath: expandHomeDir(folderValue),
        lastModified: fs.statSync(uuidPath).mtime,
      };
    }

    return { folderPath: null, lastModified: fs.statSync(uuidPath).mtime };
  } catch {
    return { folderPath: null, lastModified: fs.statSync(uuidPath).mtime };
  }
}

function calculateFolderSize(folderPath: string): number {
  if (!fs.existsSync(folderPath)) {
    return 0;
  }

  let totalSize = 0;
  const stack: string[] = [folderPath];

  while (stack.length > 0) {
    const currentPath = stack.pop()!;
    const stat = fs.statSync(currentPath);

    if (stat.isFile()) {
      totalSize += stat.size;
    } else if (stat.isDirectory()) {
      const items = fs.readdirSync(currentPath);
      for (const item of items) {
        stack.push(path.join(currentPath, item));
      }
    }
  }

  return totalSize;
}

export type ProgressCallback = (message: string) => void;

export function getAllWorkspaces(progress?: ProgressCallback): WorkspaceInfo[] {
  const { workspaceStorage } = getVSCodePaths();
  const uuids = getAllUuids(workspaceStorage);

  const workspaces: WorkspaceInfo[] = [];

  for (let i = 0; i < uuids.length; i++) {
    const uuid = uuids[i];
    progress?.(`Scanning ${i + 1}/${uuids.length}: ${uuid.slice(0, 8)}...`);
    const uuidPath = path.join(workspaceStorage, uuid);
    const { folderPath, lastModified } = parseWorkspaceJson(uuidPath);

    let size = 0;
    const stack: string[] = [uuidPath];
    while (stack.length > 0) {
      const currentPath = stack.pop()!;
      const stat = fs.statSync(currentPath);
      if (stat.isFile()) {
        size += stat.size;
      } else if (stat.isDirectory()) {
        const items = fs.readdirSync(currentPath);
        for (const item of items) {
          if (item === "Backups") continue;
          stack.push(path.join(currentPath, item));
        }
      }
    }

    const isRemote = folderPath?.startsWith("vscode-remote://") ?? false;
    const isOrphan = folderPath === null || (!isRemote && !fs.existsSync(folderPath));

    workspaces.push({
      uuid,
      folderPath,
      isOrphan,
      size,
      lastModified,
      workspaceJsonPath: path.join(uuidPath, "workspace.json"),
    });
  }

  return workspaces.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
}
