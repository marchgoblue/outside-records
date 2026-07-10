import React from 'react';
import { ocrConfidenceLevel } from '../engine/extract.js';

const OCR_TITLES = {
  ok: 'Text recovered via OCR',
  low: 'Text recovered via OCR with low confidence — it may contain errors. Verify against the original document.',
  'very-low':
    'Text recovered via OCR with very low confidence — it likely contains errors. Verify against the original document.',
};

// States where the document's text came from, and how much to trust it:
// a graded OCR badge when Tesseract transcribed it, otherwise a quiet
// "Digital text" badge for the PDF's own embedded text layer.
export default function TextSourceBadge({ usedOcr, confidence }) {
  if (!usedOcr) {
    return (
      <span
        className="badge badge-source"
        title="Text read directly from the PDF's embedded text layer — no OCR was needed. Note: if the text layer was produced by an outside system's OCR, its accuracy is unknown."
      >
        Digital text
      </span>
    );
  }
  const level = ocrConfidenceLevel(confidence);
  return (
    <span className={`badge badge-ocr ocr-${level}`} title={OCR_TITLES[level]}>
      {level !== 'ok' && '⚠ '}OCR
      {typeof confidence === 'number' && ` ${confidence}%`}
    </span>
  );
}

// Compact warning chip for dense lists (summary rail, recent events).
// Renders nothing unless the document's OCR confidence warrants a warning.
export function ScanQualityChip({ usedOcr, confidence }) {
  if (!usedOcr) return null;
  const level = ocrConfidenceLevel(confidence);
  if (level === 'ok') return null;
  return (
    <span
      className={`badge badge-ocr chip-sm ocr-${level}`}
      title={`Scanned at low image quality — OCR confidence ${confidence}%. The transcription may contain errors; verify against the original document.`}
    >
      ⚠ Low-quality scan
    </span>
  );
}
