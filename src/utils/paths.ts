import * as os from "os";
import * as path from "path";
import { Platform } from "../types";

export function getPlatform(): Platform {
  switch (os.platform()) {
    case "win32":
      return "windows";
    case "darwin":
      return "macos";
    default:
      return "linux";
  }
}

export function getVSCodePaths(platform: Platform = getPlatform()): {
  workspaceStorage: string;
  backups: string;
} {
  const homeDir = os.homedir();
  const appData = process.env.APPDATA || path.join(homeDir, "AppData", "Roaming");
  const localAppData = process.env.LOCALAPPDATA || path.join(homeDir, "AppData", "Local");

  switch (platform) {
    case "windows":
      return {
        workspaceStorage: path.join(appData, "Code", "User", "workspaceStorage"),
        backups: path.join(appData, "Code", "User", "Backups"),
      };
    case "macos":
      return {
        workspaceStorage: path.join(homeDir, "Library", "Application Support", "Code", "User", "workspaceStorage"),
        backups: path.join(homeDir, "Library", "Application Support", "Code", "User", "Backups"),
      };
    case "linux":
      return {
        workspaceStorage: path.join(homeDir, ".config", "Code", "User", "workspaceStorage"),
        backups: path.join(homeDir, ".config", "Code", "User", "Backups"),
      };
  }
}

export function expandHomeDir(filePath: string): string {
  if (filePath.startsWith("~")) {
    return path.join(os.homedir(), filePath.slice(1));
  }
  if (filePath.startsWith("file://")) {
    let decoded = decodeURIComponent(filePath);
    const withoutProtocol = decoded.replace(/^\w+:\/\//, "");
    let windowsPath = withoutProtocol.replace(/^\/([a-z]):\//i, (_, letter) => `${letter.toUpperCase()}:\\`);
    if (os.platform() === "win32") {
      windowsPath = windowsPath.replace(/\//g, "\\");
    }
    return windowsPath;
  }
  return filePath;
}
