import React, { useMemo, useState } from 'react';
import { buildSummary } from '../engine/summarize.js';
import { ScanQualityChip } from './TextSourceBadge.jsx';

const RELEVANCE_ORDER = { high: 0, medium: 1, low: 2 };

// Records Summary view: a compact, sortable document rail on the left and a
// center column summarizing everything extracted from the outside records.
export default function SummaryView({ docs, conditions, onOpenDoc }) {
  const [sortBy, setSortBy] = useState('date');
  const [railOpen, setRailOpen] = useState(false);

  const summary = useMemo(() => buildSummary(docs, conditions), [docs, conditions]);

  const sortedDocs = useMemo(() => {
    const list = [...docs];
    if (sortBy === 'date') {
      list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    } else {
      list.sort((a, b) => {
        const ra = a.relevance ? RELEVANCE_ORDER[a.relevance.level] : 3;
        const rb = b.relevance ? RELEVANCE_ORDER[b.relevance.level] : 3;
        if (ra !== rb) return ra - rb;
        return (b.relevance?.score ?? -1) - (a.relevance?.score ?? -1);
      });
    }
    return list;
  }, [docs, sortBy]);

  const pending = docs.length - summary.analyzedCount - docs.filter((d) => d.status === 'error').length;

  return (
    <div className="summary-body">
      {!railOpen && (
        <button
          className="rail-tab"
          onClick={() => setRailOpen(true)}
          aria-label={`Show the ${docs.length} source documents`}
          aria-expanded="false"
        >
          <span className="rail-tab-btn">
            <DocIcon />
            <span className="rail-tab-count">{docs.length}</span>
          </span>
          <span className="rail-tab-label">Documents</span>
          <span className="rail-tab-chevron">›</span>
        </button>
      )}

      {railOpen && (
      <aside className="summary-rail">
        <div className="rail-head">
          <div className="rail-head-row">
            <h4>Documents ({docs.length})</h4>
            <button
              className="rail-collapse"
              onClick={() => setRailOpen(false)}
              aria-label="Hide the document tray"
              aria-expanded="true"
            >
              ‹
            </button>
          </div>
          <div className="sort-toggle" role="group" aria-label="Sort documents">
            {[
              ['date', 'Date'],
              ['relevance', 'Relevance'],
            ].map(([val, label]) => (
              <button
                key={val}
                className={sortBy === val ? 'active' : ''}
                onClick={() => setSortBy(val)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="rail-list">
          {sortedDocs.map((d) => (
            <button
              key={d.id}
              className="mini-doc"
              onClick={() => d.status === 'ready' && onOpenDoc(d.id)}
              disabled={d.status !== 'ready'}
            >
              <span className="mini-doc-top">
                <span
                  className="cat-dot"
                  style={{ background: d.category?.color || 'var(--low)' }}
                />
                <span className="mini-doc-title">{d.title}</span>
              </span>
              <span className="mini-doc-meta muted">
                {fmtDate(d.date)}
                {d.relevance && (
                  <span className={`rel-text rel-${d.relevance.level}`}>
                    {' '}· {d.relevance.level} relevance
                  </span>
                )}
                {d.status === 'processing' && ' · analyzing…'}
                {d.status === 'error' && ' · unreadable'}
                <ScanQualityChip usedOcr={d.usedOcr} confidence={d.ocrConfidence} />
              </span>
            </button>
          ))}
        </div>
      </aside>
      )}

      <main className="summary-main">
        <div className="summary-col">
          <h2 className="summary-title">Outside Records Summary</h2>
          <p className="muted small summary-caption">
            Compiled from {summary.analyzedCount} analyzed outside document
            {summary.analyzedCount === 1 ? '' : 's'}
            {pending > 0 && ` — ${pending} still being analyzed; the summary updates live`}
            . Rule-based extraction; verify against the source documents.
          </p>

          {summary.analyzedCount === 0 ? (
            <div className="empty-state card">
              <h3>Nothing to summarize yet</h3>
              <p className="muted">
                The summary is built from document text as each outside record is analyzed.
              </p>
            </div>
          ) : (
            <div className="summary-grid">
              <div className="summary-hero">
                <Section title="Recent events" empty={!summary.recentEvents.length}>
                  <div className="timeline">
                    {summary.recentEvents.map((e) => (
                      <button
                        key={e.docId}
                        className="timeline-row"
                        onClick={() => onOpenDoc(e.docId)}
                      >
                        <span className="timeline-date">{fmtDate(e.date)}</span>
                        <span className="timeline-dot" style={{ background: e.category?.color }} />
                        <span className="timeline-content">
                          <span className="timeline-title">
                            {e.title}
                            {e.sourceOrg && <span className="muted"> — {e.sourceOrg}</span>}
                            <ScanQualityChip
                              usedOcr={e.usedOcr}
                              confidence={e.ocrConfidence}
                            />
                          </span>
                          {e.detail && <span className="timeline-detail muted">{e.detail}</span>}
                        </span>
                      </button>
                    ))}
                  </div>
                </Section>
              </div>

              <div className="summary-side">
                <Section title="Problem list" empty={!summary.problems.length}>
                  <ul className="problem-list">
                    {summary.problems.map((p) => (
                      <li key={p.display}>
                        <b>{p.display}</b>
                        {p.sources.length > 0 ? (
                          <span className="muted small">
                            {' '}—{' '}
                            {p.sources.slice(0, 3).map((s, i) => (
                              <React.Fragment key={s.docId}>
                                {i > 0 && ', '}
                                <a
                                  className="src-link"
                                  onClick={(ev) => {
                                    ev.preventDefault();
                                    onOpenDoc(s.docId);
                                  }}
                                  href="#"
                                >
                                  {s.title}
                                </a>
                              </React.Fragment>
                            ))}
                            {p.sources.length > 3 && ` +${p.sources.length - 3} more`}
                          </span>
                        ) : (
                          <span className="muted small"> — on the chart problem list</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </Section>

                <Section title="Medications" empty={!summary.medications.length}>
                  <ul className="med-list">
                    {summary.medications.map((m) => (
                      <li key={m.name}>
                        <a
                          className="src-link med-name"
                          href="#"
                          title={`Seen in: ${m.sources.map((s) => s.title).join(', ')}`}
                          onClick={(ev) => {
                            ev.preventDefault();
                            onOpenDoc(m.sources[0].docId);
                          }}
                        >
                          {capitalize(m.name)}
                        </a>
                        {m.dose && <span className="med-dose muted"> {m.dose}</span>}
                      </li>
                    ))}
                  </ul>
                  <p className="muted small section-note">
                    Extracted from document text — not a reconciled list.
                  </p>
                </Section>

                <Section title="Labs" empty={!summary.labs.length}>
                  <table className="lab-table">
                    <thead>
                      <tr>
                        <th>Test</th>
                        <th>Value</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.labs.map((l) => (
                        <tr
                          key={l.label}
                          className="lab-row"
                          title={`Source: ${l.docTitle}`}
                          onClick={() => onOpenDoc(l.docId)}
                        >
                          <td>{l.label}</td>
                          <td className="lab-value">{l.value}</td>
                          <td className="muted">{fmtDate(l.date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Section>

                <Section
                  title="Imaging & other diagnostic studies"
                  empty={!summary.studies.length}
                >
                  {summary.studies.map((s) => (
                    <button
                      key={s.docId}
                      className="study-item"
                      onClick={() => onOpenDoc(s.docId)}
                    >
                      <div className="study-head">
                        {s.category && (
                          <span
                            className="badge badge-cat"
                            style={{ background: s.category.color }}
                          >
                            {s.category.label}
                          </span>
                        )}
                        <span className="study-title">{s.title}</span>
                        <span className="muted small">{fmtDate(s.date)}</span>
                      </div>
                      {s.impression && <p className="study-impression muted">{s.impression}</p>}
                    </button>
                  ))}
                </Section>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function DocIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 2v6h6M9 13h6M9 17h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Section({ title, empty, children }) {
  return (
    <section className="summary-section card">
      <h3 className="summary-section-title">{title}</h3>
      {empty ? (
        <p className="muted small">Nothing found in the analyzed documents.</p>
      ) : (
        children
      )}
    </section>
  );
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fmtDate(d) {
  if (!d) return 'No date';
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? d + 'T00:00:00' : d);
  if (isNaN(date)) return d;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
