import React from 'react';

export default function DocumentCard({ doc, selected, onOpen }) {
  const cat = doc.category;
  const rel = doc.relevance;

  return (
    <article
      className={`doc-card card ${selected ? 'selected' : ''} ${doc.status}`}
      onClick={doc.status === 'ready' ? onOpen : undefined}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && doc.status === 'ready' && onOpen()}
    >
      <div className="doc-card-top">
        <div className="doc-titleblock">
          {cat ? (
            <span className="badge badge-cat" style={{ background: cat.color }}>
              {cat.label}
            </span>
          ) : (
            <span className="badge badge-cat badge-pending">Analyzing…</span>
          )}
          <h3 className="doc-title">{doc.title}</h3>
        </div>
        {rel && (
          <span className={`badge badge-rel rel-${rel.level}`}>
            {rel.level === 'high' ? '● High' : rel.level === 'medium' ? '● Medium' : '○ Low'} relevance
          </span>
        )}
      </div>

      <div className="doc-meta muted small">
        {[fmtDate(doc.date), doc.sourceOrg, doc.docType, doc.numPages && `${doc.numPages} pg`]
          .filter(Boolean)
          .join('  ·  ')}
        {doc.usedOcr && <span className="badge badge-ocr" title="Text recovered via OCR">OCR</span>}
      </div>

      {doc.status === 'processing' && (
        <div className="doc-processing">
          <div className="skeleton" style={{ width: '85%' }} />
          <div className="skeleton" style={{ width: '60%' }} />
        </div>
      )}

      {doc.status === 'error' && (
        <p className="doc-error small">Could not read this document: {doc.error}</p>
      )}

      {doc.status === 'ready' && rel?.reasons?.length > 0 && (
        <div className="doc-reasons">
          {rel.reasons.map((r, i) => (
            <div key={i} className="reason small">
              <span className="reason-label">Relevant to {r.condition}</span>
              {r.terms.length > 0 && (
                <span className="reason-terms muted"> — mentions {r.terms.join(', ')}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {doc.status === 'ready' &&
        doc.snippets.map((s, i) => (
          <blockquote key={i} className="doc-snippet small">
            “{s}”
          </blockquote>
        ))}

      {doc.status === 'ready' && (
        <div className="doc-card-foot">
          <span className="open-hint">Open document →</span>
        </div>
      )}
    </article>
  );
}

function fmtDate(d) {
  if (!d) return '';
  // Parse date-only strings as local time so the displayed day doesn't shift.
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? d + 'T00:00:00' : d);
  if (isNaN(date)) return d;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
