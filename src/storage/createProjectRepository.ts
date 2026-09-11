import type { ProjectRepository } from "../domain/models";
import { BrowserProjectRepository } from "./browserProjectRepository";
import { TauriProjectRepository } from "./tauriProjectRepository";

export function isTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window;
}

export function createProjectRepository(): ProjectRepository {
  return isTauriRuntime()
    ? new TauriProjectRepository()
    : new BrowserProjectRepository();
}
