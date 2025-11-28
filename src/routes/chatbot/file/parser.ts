import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import mammoth from "mammoth";

export async function extractText(buffer: ArrayBuffer, type: string) {
  // -------- PDF --------
  if (type.includes("pdf")) {
    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    const pdf = await loadingTask.promise;

    let text = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((i: any) => i.str).join(" ") + "\n";
    }

    return text.trim();
  }

  // -------- DOCX --------
  if (type.includes("word") || type.includes("docx")) {
    const res = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
    return res.value;
  }

  // -------- TXT --------
  return new TextDecoder().decode(buffer);
}
