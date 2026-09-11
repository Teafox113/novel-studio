import { isTauriRuntime } from "../storage/createProjectRepository";
import type { CompiledBook, CompileFormat } from "./compileModel";
import {
  compiledFileName,
  createDocx,
  createEpub,
  createHtml,
  createText,
} from "./exporters";

const formats: Record<
  Exclude<CompileFormat, "pdf">,
  { extension: string; mediaType: string; create: (book: CompiledBook) => Uint8Array }
> = {
  docx: {
    extension: "docx",
    mediaType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    create: createDocx,
  },
  epub: {
    extension: "epub",
    mediaType: "application/epub+zip",
    create: createEpub,
  },
  html: {
    extension: "html",
    mediaType: "text/html;charset=utf-8",
    create: createHtml,
  },
  txt: {
    extension: "txt",
    mediaType: "text/plain;charset=utf-8",
    create: createText,
  },
};

export async function saveCompiledBook(
  book: CompiledBook,
  format: Exclude<CompileFormat, "pdf">,
): Promise<boolean> {
  const descriptor = formats[format];
  const fileName = compiledFileName(book, descriptor.extension);
  const bytes = descriptor.create(book);

  if (isTauriRuntime()) {
    const [{ save }, { writeFile }] = await Promise.all([
      import("@tauri-apps/plugin-dialog"),
      import("@tauri-apps/plugin-fs"),
    ]);
    const destination = await save({
      title: `匯出 ${format.toUpperCase()}`,
      defaultPath: fileName,
      filters: [{ name: format.toUpperCase(), extensions: [descriptor.extension] }],
    });
    if (!destination) return false;
    await writeFile(destination, bytes);
    return true;
  }

  const output = new Uint8Array(bytes);
  const blob = new Blob([output.buffer], { type: descriptor.mediaType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

export function printCompiledBook(): void {
  document.body.classList.add("compile-printing");
  const cleanup = () => document.body.classList.remove("compile-printing");
  window.addEventListener("afterprint", cleanup, { once: true });
  window.print();
  window.setTimeout(cleanup, 1500);
}
