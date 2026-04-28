import * as fs from "fs";
import * as path from "path";
import { CleanResult, WorkspaceInfo } from "../types";
import { getVSCodePaths } from "./paths";

export async function deleteWorkspace(workspace: WorkspaceInfo): Promise<CleanResult> {
  const { workspaceStorage } = getVSCodePaths();

  const workspacePath = path.join(workspaceStorage, workspace.uuid);

  try {
    fs.rmSync(workspacePath, { recursive: true, force: true });
    return {
      uuid: workspace.uuid,
      folderPath: workspace.folderPath,
      size: workspace.size,
      success: true,
    };
  } catch (error) {
    return {
      uuid: workspace.uuid,
      folderPath: workspace.folderPath,
      size: workspace.size,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function deleteWorkspaces(
  workspaces: WorkspaceInfo[],
  onProgress?: (current: number, total: number, uuid: string) => void,
): Promise<CleanResult[]> {
  const results: CleanResult[] = [];

  for (let i = 0; i < workspaces.length; i++) {
    const workspace = workspaces[i];
    onProgress?.(i + 1, workspaces.length, workspace.uuid.slice(0, 8));
    const result = await deleteWorkspace(workspace);
    results.push(result);
  }

  return results;
}
