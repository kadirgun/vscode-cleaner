export interface WorkspaceInfo {
  uuid: string;
  folderPath: string | null;
  isOrphan: boolean;
  size: number;
  lastModified: Date;
  workspaceJsonPath: string;
}

export interface CleanResult {
  uuid: string;
  folderPath: string | null;
  size: number;
  success: boolean;
  error?: string;
}

export type Platform = "windows" | "macos" | "linux";
