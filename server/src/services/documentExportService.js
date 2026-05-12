import { createZip } from "./archiveService.js";

function xmlEscape(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function pdfEscape(value = "") {
  return String(value)
    .replace(/[^\x20-\x7e\n]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function slug(value = "document") {
  return String(value).replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim() || "document";
}

export function toRtfBuffer(document) {
  const escaped = document.content
    .replace(/\\/g, "\\\\")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}")
    .replace(/\n/g, "\\par\n");

  return Buffer.from(`{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0 Arial;}}
\\fs24 ${escaped}
\\par\\par
\\fs18 Сформировано в ProblemOS. Сервис помогает структурировать данные и документы, но не заменяет юридическую консультацию.
}`, "utf8");
}

export function toDocxBuffer(document) {
  const paragraphs = String(document.content)
    .split(/\r?\n/)
    .map((line) => `<w:p><w:r><w:t xml:space="preserve">${xmlEscape(line || " ")}</w:t></w:r></w:p>`)
    .join("");

  const files = [
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
    },
    {
      name: "word/document.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs}
    <w:p><w:r><w:t>Сформировано в ProblemOS. Сервис помогает подготовить документы, но не заменяет юридическую консультацию.</w:t></w:r></w:p>
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
  </w:body>
</w:document>`
    }
  ];

  return createZip(files);
}

export function toPdfBuffer(document) {
  const lines = String(document.content)
    .split(/\r?\n/)
    .flatMap((line) => {
      const chunks = [];
      for (let index = 0; index < line.length; index += 82) {
        chunks.push(line.slice(index, index + 82));
      }
      return chunks.length ? chunks : [""];
    })
    .slice(0, 46);
  const stream = [
    "BT",
    "/F1 11 Tf",
    "50 790 Td",
    "14 TL",
    ...lines.map((line, index) => `${index === 0 ? "" : "T* "}(${pdfEscape(line)}) Tj`),
    "ET"
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

export function exportDocument(document, requestedFormat = "rtf") {
  const format = ["rtf", "docx", "pdf"].includes(requestedFormat) ? requestedFormat : "rtf";
  const title = slug(document.title);

  if (format === "docx") {
    return {
      body: toDocxBuffer(document),
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileName: `${title}.docx`
    };
  }

  if (format === "pdf") {
    return {
      body: toPdfBuffer(document),
      contentType: "application/pdf",
      fileName: `${title}.pdf`
    };
  }

  return {
    body: toRtfBuffer(document),
    contentType: "application/rtf; charset=utf-8",
    fileName: `${title}.rtf`
  };
}
