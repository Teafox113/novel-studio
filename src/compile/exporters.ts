import type { CompiledBook, CompiledScene } from "./compileModel";
import { createStoredZip } from "./zip";

const encoder = new TextEncoder();

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function safeFileStem(value: string): string {
  return (
    value
      .trim()
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
      .replace(/[.\s]+$/g, "")
      .slice(0, 80) || "未命名小說"
  );
}

function sceneBreak(book: CompiledBook): string {
  if (book.options.sceneBreakStyle === "asterism") return "⁂";
  return "";
}

export function compiledFileName(book: CompiledBook, extension: string): string {
  return `${safeFileStem(book.title)}.${extension}`;
}

export function createText(book: CompiledBook): Uint8Array {
  const lines: string[] = [];
  if (book.options.includeTitlePage) {
    lines.push(book.title, book.subtitle, book.author, "");
  }
  book.volumes.forEach((volume) => {
    if (book.options.includeVolumeTitles) lines.push(volume.title, "");
    volume.scenes.forEach((scene, index) => {
      if (book.options.includeSceneTitles) lines.push(scene.title, "");
      if (book.options.includeSynopsis && scene.synopsis) lines.push(`【摘要】${scene.synopsis}`, "");
      lines.push(...scene.paragraphs, "");
      if (index < volume.scenes.length - 1 && sceneBreak(book)) lines.push(sceneBreak(book), "");
    });
  });
  return encoder.encode(lines.join("\r\n").replace(/\r\n{4,}/g, "\r\n\r\n\r\n"));
}

function htmlScene(scene: CompiledScene, book: CompiledBook): string {
  return `<section class="scene${book.options.sceneBreakStyle === "page" ? " page-break" : ""}">
    ${book.options.includeSceneTitles ? `<h2>${escapeXml(scene.title)}</h2>` : ""}
    ${book.options.includeSynopsis && scene.synopsis ? `<aside class="synopsis">${escapeXml(scene.synopsis)}</aside>` : ""}
    ${scene.paragraphs.map((paragraph) => `<p>${escapeXml(paragraph)}</p>`).join("\n")}
    ${book.options.sceneBreakStyle === "asterism" ? `<div class="scene-break">⁂</div>` : ""}
  </section>`;
}

function bookStyles(): string {
  return `body{max-width:42em;margin:0 auto;padding:3em 2em;color:#242936;font-family:Georgia,"Noto Serif TC","Microsoft JhengHei",serif;line-height:1.9}h1,h2{text-align:center}h1{margin-top:30vh;font-size:2.3em}.subtitle,.author{text-align:center}.volume{break-before:page;margin-top:5em}.volume>h1{margin-top:2em}.scene{margin:4em 0}.scene.page-break{break-before:page}.scene p{text-indent:2em;margin:.35em 0}.synopsis{padding:1em;border-left:3px solid #aaa;color:#777;font-size:.9em}.scene-break{text-align:center;margin:2.5em 0}@media print{body{max-width:none;padding:0}.title-page{break-after:page}.volume{break-before:page}}`;
}

export function createHtmlString(book: CompiledBook): string {
  const volumes = book.volumes
    .map((volume) => `<article class="volume">${book.options.includeVolumeTitles ? `<h1>${escapeXml(volume.title)}</h1>` : ""}${volume.scenes.map((scene) => htmlScene(scene, book)).join("\n")}</article>`)
    .join("\n");
  return `<!doctype html><html lang="${escapeXml(book.language)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeXml(book.title)}</title><style>${bookStyles()}</style></head><body>${book.options.includeTitlePage ? `<header class="title-page"><h1>${escapeXml(book.title)}</h1><p class="subtitle">${escapeXml(book.subtitle)}</p><p class="author">${escapeXml(book.author)}</p></header>` : ""}${volumes}</body></html>`;
}

export function createHtml(book: CompiledBook): Uint8Array {
  return encoder.encode(createHtmlString(book));
}

function wordParagraph(text: string, style?: string, italic = false): string {
  const properties = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : "";
  return `<w:p>${properties}<w:r>${italic ? "<w:rPr><w:i/></w:rPr>" : ""}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

export function createDocx(book: CompiledBook): Uint8Array {
  const body: string[] = [];
  if (book.options.includeTitlePage) {
    body.push(wordParagraph(book.title, "Title"));
    if (book.subtitle) body.push(wordParagraph(book.subtitle, "Subtitle"));
    if (book.author) body.push(wordParagraph(book.author, "Author"));
    body.push(`<w:p><w:r><w:br w:type="page"/></w:r></w:p>`);
  }
  book.volumes.forEach((volume) => {
    if (book.options.includeVolumeTitles) body.push(wordParagraph(volume.title, "Heading1"));
    volume.scenes.forEach((scene, index) => {
      if (book.options.sceneBreakStyle === "page" && index > 0) body.push(`<w:p><w:r><w:br w:type="page"/></w:r></w:p>`);
      if (book.options.includeSceneTitles) body.push(wordParagraph(scene.title, "Heading2"));
      if (book.options.includeSynopsis && scene.synopsis) body.push(wordParagraph(`摘要：${scene.synopsis}`, "Synopsis", true));
      scene.paragraphs.forEach((paragraph) => body.push(wordParagraph(paragraph, "BodyText")));
      if (book.options.sceneBreakStyle === "asterism" && index < volume.scenes.length - 1) body.push(wordParagraph("⁂", "SceneBreak"));
      else body.push(wordParagraph(""));
    });
  });
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body.join("")}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia" w:eastAsia="Microsoft JhengHei"/><w:sz w:val="24"/></w:rPr></w:rPrDefault></w:docDefaults>${[
    ["Title", "書名", 42, "center"], ["Subtitle", "副標題", 26, "center"], ["Author", "作者", 24, "center"], ["Heading1", "卷標題", 34, "center"], ["Heading2", "場景標題", 28, "center"], ["BodyText", "正文", 24, "both"], ["Synopsis", "摘要", 20, "left"], ["SceneBreak", "分隔符", 24, "center"],
  ].map(([id, name, size, align]) => `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:pPr><w:jc w:val="${align}"/><w:spacing w:line="420" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="${size}"/></w:rPr></w:style>`).join("")}</w:styles>`;
  const now = new Date().toISOString();
  return createStoredZip([
    { name: "[Content_Types].xml", data: `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>` },
    { name: "_rels/.rels", data: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>` },
    { name: "word/document.xml", data: documentXml },
    { name: "word/styles.xml", data: styles },
    { name: "word/_rels/document.xml.rels", data: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: "docProps/core.xml", data: `<?xml version="1.0" encoding="UTF-8"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"><dc:title>${escapeXml(book.title)}</dc:title><dc:creator>${escapeXml(book.author)}</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">${now}</dcterms:created></cp:coreProperties>` },
  ]);
}

function xhtmlDocument(title: string, body: string, language: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${escapeXml(language)}"><head><title>${escapeXml(title)}</title><link rel="stylesheet" type="text/css" href="styles.css"/></head><body>${body}</body></html>`;
}

export function createEpub(book: CompiledBook): Uint8Array {
  const titlePage = book.options.includeTitlePage
    ? xhtmlDocument(
        book.title,
        `<section class="title-page"><h1>${escapeXml(book.title)}</h1>${book.subtitle ? `<p class="subtitle">${escapeXml(book.subtitle)}</p>` : ""}${book.author ? `<p class="author">${escapeXml(book.author)}</p>` : ""}</section>`,
        book.language,
      )
    : "";
  const chapters = book.volumes.map((volume, index) => ({
    id: `chapter-${index + 1}`,
    href: `chapter-${index + 1}.xhtml`,
    title: volume.title,
    content: xhtmlDocument(volume.title, `${book.options.includeVolumeTitles ? `<h1>${escapeXml(volume.title)}</h1>` : ""}${volume.scenes.map((scene) => htmlScene(scene, book)).join("")}`, book.language),
  }));
  const modified = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const nav = xhtmlDocument("目錄", `<nav epub:type="toc" xmlns:epub="http://www.idpf.org/2007/ops"><h1>目錄</h1><ol>${chapters.map((chapter) => `<li><a href="${chapter.href}">${escapeXml(chapter.title)}</a></li>`).join("")}</ol></nav>`, book.language);
  const packageXml = `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="${escapeXml(book.language)}"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">urn:uuid:${escapeXml(book.projectId)}</dc:identifier><dc:title>${escapeXml(book.title)}</dc:title><dc:creator>${escapeXml(book.author)}</dc:creator><dc:language>${escapeXml(book.language)}</dc:language><meta property="dcterms:modified">${modified}</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="css" href="styles.css" media-type="text/css"/>${titlePage ? `<item id="title-page" href="title.xhtml" media-type="application/xhtml+xml"/>` : ""}${chapters.map((chapter) => `<item id="${chapter.id}" href="${chapter.href}" media-type="application/xhtml+xml"/>`).join("")}</manifest><spine>${titlePage ? `<itemref idref="title-page"/>` : ""}${chapters.map((chapter) => `<itemref idref="${chapter.id}"/>`).join("")}</spine></package>`;
  return createStoredZip([
    { name: "mimetype", data: "application/epub+zip" },
    { name: "META-INF/container.xml", data: `<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>` },
    { name: "OEBPS/content.opf", data: packageXml },
    { name: "OEBPS/nav.xhtml", data: nav },
    { name: "OEBPS/styles.css", data: bookStyles() },
    ...(titlePage ? [{ name: "OEBPS/title.xhtml", data: titlePage }] : []),
    ...chapters.map((chapter) => ({ name: `OEBPS/${chapter.href}`, data: chapter.content })),
  ]);
}
