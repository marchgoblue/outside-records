// PDF text extraction with OCR fallback.
// 1. pdf.js reads the embedded text layer (fast, works for digital PDFs and
//    scans that were OCR'd upstream).
// 2. Pages with little/no text (true image-only scans) are rendered to a
//    canvas and run through Tesseract.js OCR in the browser.
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  OCR_MIN_CHARS_PER_PAGE,
  OCR_MAX_PAGES,
  OCR_CONF_LOW,
  OCR_CONF_VERY_LOW,
} from '../config.js';

// Bucket a document-level OCR confidence for display: 'ok' | 'low' | 'very-low'.
// Unknown confidence (null) gets no warning.
export function ocrConfidenceLevel(confidence) {
  if (typeof confidence !== 'number') return 'ok';
  if (confidence < OCR_CONF_VERY_LOW) return 'very-low';
  if (confidence < OCR_CONF_LOW) return 'low';
  return 'ok';
}

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
  const ocrConfidences = [];

  for (let i = 1; i <= numPages; i++) {
    onProgress({ stage: 'text', page: i, numPages });
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let pageText = content.items.map((item) => item.str).join(' ').trim();

    if (pageText.length < OCR_MIN_CHARS_PER_PAGE && ocrPagesUsed < OCR_MAX_PAGES) {
      // Looks like an image-only scan — OCR it.
      onProgress({ stage: 'ocr', page: i, numPages });
      try {
        const { text: ocrText, confidence } = await ocrPage(page);
        if (ocrText.length > pageText.length) {
          pageText = ocrText;
          usedOcr = true;
          if (typeof confidence === 'number') ocrConfidences.push(confidence);
        }
        ocrPagesUsed++;
      } catch (e) {
        console.warn(`OCR failed on page ${i}:`, e);
      }
    }
    text += pageText + '\n\n';
  }

  // Mean Tesseract confidence (0-100) over the pages whose text came from OCR;
  // null when no page did.
  const ocrConfidence = ocrConfidences.length
    ? Math.round(
        ocrConfidences.reduce((a, b) => a + b, 0) / ocrConfidences.length
      )
    : null;

  return { text: text.trim(), numPages, usedOcr, ocrConfidence };
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
    data: { text, confidence },
  } = await worker.recognize(canvas);
  canvas.width = 0; // release backing store
  return { text: (text || '').trim(), confidence };
}
