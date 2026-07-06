// PDF text extraction with OCR fallback.
// 1. pdf.js reads the embedded text layer (fast, works for digital PDFs and
//    scans that were OCR'd upstream).
// 2. Pages with little/no text (true image-only scans) are rendered to a
//    canvas and run through Tesseract.js OCR in the browser.
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { OCR_MIN_CHARS_PER_PAGE, OCR_MAX_PAGES } from '../config.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

let ocrWorkerPromise = null;

async function getOcrWorker() {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = import('tesseract.js').then(({ createWorker }) =>
      createWorker('eng')
    );
  }
  return ocrWorkerPromise;
}

export async function extractPdfText(arrayBuffer, onProgress = () => {}) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  let text = '';
  let ocrPagesUsed = 0;
  let usedOcr = false;

  for (let i = 1; i <= numPages; i++) {
    onProgress({ stage: 'text', page: i, numPages });
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let pageText = content.items.map((item) => item.str).join(' ').trim();

    if (pageText.length < OCR_MIN_CHARS_PER_PAGE && ocrPagesUsed < OCR_MAX_PAGES) {
      // Looks like an image-only scan — OCR it.
      onProgress({ stage: 'ocr', page: i, numPages });
      try {
        const ocrText = await ocrPage(page);
        if (ocrText.length > pageText.length) {
          pageText = ocrText;
          usedOcr = true;
        }
        ocrPagesUsed++;
      } catch (e) {
        console.warn(`OCR failed on page ${i}:`, e);
      }
    }
    text += pageText + '\n\n';
  }

  return { text: text.trim(), numPages, usedOcr };
}

async function ocrPage(page) {
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  const worker = await getOcrWorker();
  const {
    data: { text },
  } = await worker.recognize(canvas);
  canvas.width = 0; // release backing store
  return (text || '').trim();
}
