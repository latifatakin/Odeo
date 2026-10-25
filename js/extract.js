// Gets plain text out of PDF and TXT files, entirely in the browser.

export const MAX_FILE_MB = 20;

export class ExtractError extends Error {}

let pdfjsPromise = null;
function loadPdfjs() {
  // pdf.js is ~1.8 MB, so only load it when someone picks a PDF.
  pdfjsPromise ||= import('../vendor/pdfjs/pdf.min.mjs').then((lib) => {
    lib.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
    return lib;
  });
  return pdfjsPromise;
}

export function fileKind(file) {
  const name = file.name.toLowerCase();
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (file.type === 'text/plain' || name.endsWith('.txt')) return 'txt';
  return null;
}

export async function extractText(file, { onProgress } = {}) {
  const kind = fileKind(file);
  if (!kind) throw new ExtractError('This file type isn’t supported. Choose a PDF or TXT file.');
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    throw new ExtractError(`This file is larger than ${MAX_FILE_MB} MB. Choose a smaller file.`);
  }
  if (file.size === 0) throw new ExtractError('This file is empty.');

  if (kind === 'txt') {
    const text = clean((await file.text()).replace(/^﻿/, ''));
    if (!text) throw new ExtractError('This file has no text in it.');
    return { text, pages: null, kind };
  }

  const pdfjs = await loadPdfjs();
  let pdf;
  try {
    pdf = await pdfjs.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false }).promise;
  } catch (err) {
    if (err?.name === 'PasswordException') {
      throw new ExtractError('This PDF is password-protected. Remove the password and try again.');
    }
    throw new ExtractError('This PDF couldn’t be opened. It may be damaged.');
  }

  const pages = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    let pageText = '';
    for (const item of content.items) {
      if (!('str' in item)) continue;
      pageText += item.str;
      if (item.hasEOL) pageText += '\n';
      else if (item.str && !/\s$/.test(item.str)) pageText += ' ';
    }
    pages.push(pageText);
    onProgress?.(n, pdf.numPages);
    page.cleanup();
  }
  await pdf.destroy();

  const text = clean(pages.join('\n\n'));
  if (text.replace(/\s/g, '').length < 20) {
    throw new ExtractError(
      'We couldn’t find any text in this PDF. It may be a scanned image. Try a PDF with selectable text, or copy the text and paste it instead.'
    );
  }
  return { text, pages: pdf.numPages, kind };
}

// Tidy up text from PDFs: join words split across lines, merge broken
// lines into paragraphs, and drop extra spaces.
function clean(text) {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t ]+/g, ' ')
    .replace(/(\p{L})-\n(\p{Ll})/gu, '$1$2')
    .replace(/([^\n.!?:;])\n(?=[^\n])/g, '$1 ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
