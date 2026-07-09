import React, { useState } from 'react';
import OcrBadge from './OcrBadge.jsx';

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

          {tab === 'text' && (
            <pre className="extracted-text">{doc.text || 'No text extracted.'}</pre>
          )}

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
