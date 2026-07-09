import React, { useState } from 'react';
import OcrBadge from './OcrBadge.jsx';
import { ocrConfidenceLevel } from '../engine/extract.js';

export default function DocumentViewer({ doc, onClose }) {
  const [tab, setTab] = useState('pdf');

  return (
    <div className="viewer-backdrop" onClick={onClose}>
      <div className="viewer" onClick={(e) => e.stopPropagation()}>
        <header className="viewer-head">
          <div>
            <h3>{doc.title}</h3>
            <div className="muted small">
              {[doc.date, doc.sourceOrg].filter(Boolean).join(' · ')}
              {doc.usedOcr && <OcrBadge confidence={doc.ocrConfidence} />}
            </div>
          </div>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close viewer">
            ✕ Close
          </button>
        </header>

        <nav className="viewer-tabs">
          <button className={tab === 'pdf' ? 'active' : ''} onClick={() => setTab('pdf')}>
            Document
          </button>
          <button className={tab === 'text' ? 'active' : ''} onClick={() => setTab('text')}>
            Extracted text
          </button>
          <button className={tab === 'why' ? 'active' : ''} onClick={() => setTab('why')}>
            Why it's relevant
          </button>
        </nav>

        <div className="viewer-body">
          {tab === 'pdf' &&
            (doc.blobUrl ? (
              <iframe title={doc.title} src={doc.blobUrl} className="pdf-frame" />
            ) : (
              <p className="muted">Document not loaded.</p>
            ))}

          {tab === 'text' && <ExtractedText doc={doc} />}

          {tab === 'why' && (
            <div className="why-panel">
              <div className="why-row">
                <span className="field-label">Category</span>
                <span className="badge badge-cat" style={{ background: doc.category?.color }}>
                  {doc.category?.label}
                </span>{' '}
                <span className="muted small">
                  ({doc.category?.confidence} confidence, score {doc.category?.score})
                </span>
              </div>
              <div className="why-row">
                <span className="field-label">Relevance</span>
                <span className={`badge badge-rel rel-${doc.relevance?.level}`}>
                  {doc.relevance?.level} · score {doc.relevance?.score}
                </span>
              </div>
              {doc.relevance?.reasons?.length ? (
                <ul className="why-list">
                  {doc.relevance.reasons.map((r, i) => (
                    <li key={i}>
                      <b>{r.condition}</b>
                      {r.terms.length > 0 && (
                        <span className="muted"> — document mentions: {r.terms.join(', ')}</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">
                  No active problem on the patient's list is strongly referenced in this
                  document. Ranking reflects document type and recency only.
                </p>
              )}
              <p className="muted small">
                Scores combine problem-list keyword matching, document-category value for
                acute care, and recency. Rule-based — no data leaves the browser.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Plain <pre> for digital text; for OCR'd pages, render word-by-word so
// low-confidence words can be flagged.
function ExtractedText({ doc }) {
  const hasOcrWords = doc.segments?.some((s) => s.lines?.length);
  if (!hasOcrWords) {
    return <pre className="extracted-text">{doc.text || 'No text extracted.'}</pre>;
  }
  return (
    <div className="extracted-text">
      <p className="ocr-legend small muted">
        Words the OCR engine was unsure of are marked:{' '}
        <span className="ocr-word low">low confidence</span>{' '}
        <span className="ocr-word very-low">very low confidence</span>. Hover a
        word to see its confidence.
      </p>
      {doc.segments.map((seg) =>
        seg.lines?.length ? (
          <div key={seg.page} className="ocr-words">
            {seg.lines.map((words, li) => (
              <div key={li} className="ocr-line">
                {words.map((w, wi) => {
                  const level = ocrConfidenceLevel(w.confidence);
                  return (
                    <React.Fragment key={wi}>
                      {wi > 0 && ' '}
                      <span
                        className={level === 'ok' ? undefined : `ocr-word ${level}`}
                        title={`OCR confidence: ${w.confidence}%`}
                      >
                        {w.text}
                      </span>
                    </React.Fragment>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <pre key={seg.page} className="seg-text">{seg.text}</pre>
        )
      )}
    </div>
  );
}
