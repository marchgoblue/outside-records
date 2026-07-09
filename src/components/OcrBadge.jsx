import React from 'react';
import { ocrConfidenceLevel } from '../engine/extract.js';

const TITLES = {
  ok: 'Text recovered via OCR',
  low: 'Text recovered via OCR with low confidence — it may contain errors. Verify against the original document.',
  'very-low':
    'Text recovered via OCR with very low confidence — it likely contains errors. Verify against the original document.',
};

export default function OcrBadge({ confidence }) {
  const level = ocrConfidenceLevel(confidence);
  return (
    <span className={`badge badge-ocr ocr-${level}`} title={TITLES[level]}>
      {level !== 'ok' && '⚠ '}OCR
      {typeof confidence === 'number' && ` ${confidence}%`}
    </span>
  );
}
