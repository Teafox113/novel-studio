import type { StoryProject } from "../domain/models";
import { isTauriRuntime } from "../storage/createProjectRepository";
import {
  parsePortableProject,
  portableProjectFileName,
  serializePortableProject,
} from "./projectArchive";

const MAX_IMPORT_BYTES = 100 * 1024 * 1024;

export interface ImportedProject {
  project: StoryProject;
  sourceName: string;
}

export interface ExportResult {
  cancelled: boolean;
  destination?: string;
}

export async function exportPortableProject(
  project: StoryProject,
): Promise<ExportResult> {
  const contents = serializePortableProject(project);
  const fileName = portableProjectFileName(project.title);

  if (isTauriRuntime()) {
    const [{ save }, { writeTextFile }] = await Promise.all([
      import("@tauri-apps/plugin-dialog"),
      import("@tauri-apps/plugin-fs"),
    ]);
    const destination = await save({
      title: "匯出 Novel Studio 專案",
      defaultPath: fileName,
      filters: [{ name: "Novel Studio 專案", extensions: ["novel"] }],
    });
    if (!destination) return { cancelled: true };
    await writeTextFile(destination, contents);
    return { cancelled: false, destination };
  }

  const blob = new Blob([contents], {
    type: "application/vnd.novel-studio.project+json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { cancelled: false, destination: fileName };
}

async function selectBrowserProjectFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".novel,application/json";
    input.style.display = "none";
    input.addEventListener(
      "change",
      () => {
        const file = input.files?.[0] ?? null;
        input.remove();
        resolve(file);
      },
      { once: true },
    );
    document.body.append(input);
    input.click();
  });
}

export async function importPortableProject(): Promise<ImportedProject | null> {
  if (isTauriRuntime()) {
    const [{ open }, { readTextFile, stat }] = await Promise.all([
      import("@tauri-apps/plugin-dialog"),
      import("@tauri-apps/plugin-fs"),
    ]);
    const source = await open({
      title: "匯入 Novel Studio 專案",
      multiple: false,
      directory: false,
      filters: [{ name: "Novel Studio 專案", extensions: ["novel", "json"] }],
    });
    if (!source) return null;
    const metadata = await stat(source);
    if (metadata.size > MAX_IMPORT_BYTES) {
      throw new Error("專案檔超過 100 MB，目前版本無法匯入。");
    }
    return {
      project: parsePortableProject(await readTextFile(source)),
      sourceName: source.split(/[\\/]/).pop() ?? source,
    };
  }

  const file = await selectBrowserProjectFile();
  if (!file) return null;
  if (file.size > MAX_IMPORT_BYTES) {
    throw new Error("專案檔超過 100 MB，目前版本無法匯入。");
  }
  return {
    project: parsePortableProject(await file.text()),
    sourceName: file.name,
  };
}
