import type { ResearchKind } from "../domain/models";
import { isTauriRuntime } from "../storage/createProjectRepository";

export const MAX_RESEARCH_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_BROWSER_RESEARCH_FILE_BYTES = 2 * 1024 * 1024;

export interface ImportedResearchFile {
  fileName: string;
  mediaType: string;
  byteSize: number;
  dataUrl: string;
  kind: Extract<ResearchKind, "pdf" | "image" | "document">;
}

const mediaByExtension: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  txt: "text/plain",
  md: "text/markdown",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  rtf: "application/rtf",
};

function extensionOf(fileName: string): string {
  return fileName.split(".").pop()?.toLocaleLowerCase() ?? "";
}

export function researchKindForFile(
  fileName: string,
  mediaType = "",
): ImportedResearchFile["kind"] {
  const extension = extensionOf(fileName);
  if (mediaType === "application/pdf" || extension === "pdf") return "pdf";
  if (mediaType.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension)) {
    return "image";
  }
  return "document";
}

function bytesToDataUrl(bytes: Uint8Array, mediaType: string): string {
  const chunks: string[] = [];
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    chunks.push(String.fromCharCode(...bytes.subarray(index, index + chunkSize)));
  }
  return `data:${mediaType};base64,${btoa(chunks.join(""))}`;
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const encoded = dataUrl.split(",", 2)[1] ?? "";
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function assertFileSize(size: number, maximum = MAX_RESEARCH_FILE_BYTES) {
  if (size > maximum) {
    const label = maximum === MAX_BROWSER_RESEARCH_FILE_BYTES ? "2 MB（瀏覽器模式）" : "15 MB";
    throw new Error(`單一研究附件目前上限為 ${label}。請改用桌面版、壓縮檔案或只保存來源網址。`);
  }
}

function selectBrowserFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,image/*,.txt,.md,.doc,.docx,.rtf";
    input.style.display = "none";
    input.addEventListener("change", () => {
      const file = input.files?.[0] ?? null;
      input.remove();
      resolve(file);
    }, { once: true });
    document.body.append(input);
    input.click();
  });
}

export async function importResearchFile(): Promise<ImportedResearchFile | null> {
  if (isTauriRuntime()) {
    const [{ open }, { readFile, stat }] = await Promise.all([
      import("@tauri-apps/plugin-dialog"),
      import("@tauri-apps/plugin-fs"),
    ]);
    const source = await open({
      title: "匯入研究素材",
      multiple: false,
      directory: false,
      filters: [
        { name: "研究素材", extensions: ["pdf", "png", "jpg", "jpeg", "gif", "webp", "svg", "txt", "md", "doc", "docx", "rtf"] },
      ],
    });
    if (!source) return null;
    const info = await stat(source);
    assertFileSize(info.size);
    const fileName = source.split(/[\\/]/).pop() ?? "attachment";
    const mediaType = mediaByExtension[extensionOf(fileName)] ?? "application/octet-stream";
    const bytes = await readFile(source);
    return {
      fileName,
      mediaType,
      byteSize: info.size,
      dataUrl: bytesToDataUrl(bytes, mediaType),
      kind: researchKindForFile(fileName, mediaType),
    };
  }

  const file = await selectBrowserFile();
  if (!file) return null;
  return importResearchFileObject(file, MAX_BROWSER_RESEARCH_FILE_BYTES);
}

export async function importResearchFileObject(
  file: File,
  maximum = isTauriRuntime()
    ? MAX_RESEARCH_FILE_BYTES
    : MAX_BROWSER_RESEARCH_FILE_BYTES,
): Promise<ImportedResearchFile> {
  assertFileSize(file.size, maximum);
  const mediaType = file.type || mediaByExtension[extensionOf(file.name)] || "application/octet-stream";
  return {
    fileName: file.name,
    mediaType,
    byteSize: file.size,
    dataUrl: bytesToDataUrl(new Uint8Array(await file.arrayBuffer()), mediaType),
    kind: researchKindForFile(file.name, mediaType),
  };
}

export async function saveResearchAttachment(
  fileName: string,
  mediaType: string,
  dataUrl: string,
): Promise<boolean> {
  if (!dataUrl) return false;
  const bytes = dataUrlToBytes(dataUrl);
  if (isTauriRuntime()) {
    const [{ save }, { writeFile }] = await Promise.all([
      import("@tauri-apps/plugin-dialog"),
      import("@tauri-apps/plugin-fs"),
    ]);
    const extension = extensionOf(fileName);
    const destination = await save({
      title: "另存研究附件",
      defaultPath: fileName || "attachment",
      filters: extension ? [{ name: "原始格式", extensions: [extension] }] : undefined,
    });
    if (!destination) return false;
    await writeFile(destination, bytes);
    return true;
  }

  const blobBytes = new Uint8Array(bytes);
  const blob = new Blob([blobBytes.buffer], {
    type: mediaType || "application/octet-stream",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName || "attachment";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
