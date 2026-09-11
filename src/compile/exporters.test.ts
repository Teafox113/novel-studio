// @ts-nocheck -- Node built-ins are used only by this integration test.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sampleProject } from "../data/sampleProject";
import { compileProject, defaultCompileOptions } from "./compileModel";
import { createDocx, createEpub, createHtmlString, createText } from "./exporters";

const book = compileProject(sampleProject, defaultCompileOptions(sampleProject));

function binaryContains(bytes: Uint8Array, value: string): boolean {
  return new TextDecoder().decode(bytes).includes(value);
}

describe("compile exporters", () => {
  it("creates readable HTML and UTF-8 text", () => {
    expect(createHtmlString(book)).toContain("霧港十三夜");
    expect(new TextDecoder().decode(createText(book))).toContain("午夜過後");
  });

  it("creates a DOCX package with Word document parts", () => {
    const docx = createDocx(book);
    expect(Array.from(docx.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(binaryContains(docx, "[Content_Types].xml")).toBe(true);
    expect(binaryContains(docx, "word/document.xml")).toBe(true);
  });

  it("creates an EPUB 3 package with mimetype, navigation and chapters", () => {
    const epub = createEpub(book);
    expect(binaryContains(epub, "application/epub+zip")).toBe(true);
    expect(binaryContains(epub, "OEBPS/content.opf")).toBe(true);
    expect(binaryContains(epub, "OEBPS/nav.xhtml")).toBe(true);
    expect(binaryContains(epub, "OEBPS/title.xhtml")).toBe(true);
    expect(binaryContains(epub, "OEBPS/chapter-1.xhtml")).toBe(true);
  });

  it("passes independent ZIP and XML validation for DOCX and EPUB", () => {
    const directory = mkdtempSync(join(tmpdir(), "novel-studio-compile-"));
    const docxPath = join(directory, "validation.docx");
    const epubPath = join(directory, "validation.epub");
    const validator = String.raw`
import sys, zipfile
from xml.etree import ElementTree
docx_path, epub_path = sys.argv[1:3]
with zipfile.ZipFile(docx_path) as archive:
    assert archive.testzip() is None
    required = {'[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/styles.xml', 'word/_rels/document.xml.rels', 'docProps/core.xml'}
    assert required.issubset(archive.namelist())
    for name in required: ElementTree.fromstring(archive.read(name))
with zipfile.ZipFile(epub_path) as archive:
    assert archive.testzip() is None
    first = archive.infolist()[0]
    assert first.filename == 'mimetype' and first.compress_type == zipfile.ZIP_STORED
    assert archive.read('mimetype') == b'application/epub+zip'
    required = {'META-INF/container.xml', 'OEBPS/content.opf', 'OEBPS/nav.xhtml', 'OEBPS/title.xhtml', 'OEBPS/chapter-1.xhtml'}
    assert required.issubset(archive.namelist())
    for name in required: ElementTree.fromstring(archive.read(name))
`;
    try {
      writeFileSync(docxPath, createDocx(book));
      writeFileSync(epubPath, createEpub(book));
      expect(() =>
        execFileSync("python", ["-c", validator, docxPath, epubPath]),
      ).not.toThrow();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
