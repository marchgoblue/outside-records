import React, { useMemo, useState } from 'react';
import PatientBanner from './PatientBanner.jsx';
import DocumentCard from './DocumentCard.jsx';
import DocumentViewer from './DocumentViewer.jsx';
import SummaryView from './SummaryView.jsx';
import { CATEGORIES } from '../engine/categories.js';
import { LogoMark } from './Landing.jsx';

const RELEVANCE_ORDER = { high: 0, medium: 1, low: 2 };

const SORTS = {
  relevance: {
    label: 'Relevance',
    fn: (a, b) => {
      const ra = a.relevance ? RELEVANCE_ORDER[a.relevance.level] : 3;
      const rb = b.relevance ? RELEVANCE_ORDER[b.relevance.level] : 3;
      if (ra !== rb) return ra - rb;
      const sa = a.relevance?.score ?? -1;
      const sb = b.relevance?.score ?? -1;
      if (sa !== sb) return sb - sa;
      return (b.date || '').localeCompare(a.date || '');
    },
  },
  date: {
    label: 'Date (newest first)',
    fn: (a, b) => (b.date || '').localeCompare(a.date || ''),
  },
  type: {
    label: 'Document type',
    fn: (a, b) => {
      const la = a.category?.label || 'zzz';
      const lb = b.category?.label || 'zzz';
      if (la !== lb) return la.localeCompare(lb);
      return SORTS.relevance.fn(a, b);
    },
  },
};

export default function Dashboard({ mode, patient, conditions, docs, progress }) {
  const [view, setView] = useState('documents'); // 'documents' | 'summary'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [relevanceFilter, setRelevanceFilter] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const counts = useMemo(() => {
    const c = { all: docs.length };
    for (const d of docs) {
      const key = d.category?.category || 'pending';
      c[key] = (c[key] || 0) + 1;
    }
    return c;
  }, [docs]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return docs
      .filter((d) => {
        if (categoryFilter !== 'all' && d.category?.category !== categoryFilter) return false;
        if (relevanceFilter !== 'all' && d.relevance?.level !== relevanceFilter) return false;
        if (q) {
          const hay = `${d.title} ${d.sourceOrg} ${d.docType} ${d.text}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort(SORTS[sortBy].fn);
  }, [docs, categoryFilter, relevanceFilter, search, sortBy]);

  const selected = docs.find((d) => d.id === selectedId) || null;
  const highCount = docs.filter((d) => d.relevance?.level === 'high').length;
  const doneCount = docs.filter((d) => d.status === 'ready' || d.status === 'error').length;

  const usedCategories = Object.keys(CATEGORIES).filter((k) => counts[k]);

  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="topbar-brand">
          <LogoMark size={24} />
          <span>Outside Records</span>
          {mode === 'demo' && <span className="badge badge-demo">DEMO — synthetic data</span>}
        </div>
        <nav className="view-toggle" aria-label="View">
          <button
            className={view === 'documents' ? 'active' : ''}
            onClick={() => setView('documents')}
          >
            Document Review
          </button>
          <button
            className={view === 'summary' ? 'active' : ''}
            onClick={() => setView('summary')}
          >
            Records Summary
          </button>
        </nav>
        {view === 'documents' && (
          <div className="topbar-search">
            <input
              className="text-input search-input"
              placeholder="Search all outside documents… (full text, incl. OCR)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}
      </header>

      <PatientBanner patient={patient} conditions={conditions} />

      {progress && (
        <div className="progress-strip" role="status">
          <div className="spinner spinner-sm" />
          <span>
            Analyzing document {progress.current} of {progress.total}
            {progress.title ? ` — ${progress.title}` : ''}
            {progress.stage ? ` (${progress.stage})` : ''}
          </span>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${Math.round((doneCount / Math.max(docs.length, 1)) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {view === 'summary' ? (
        <SummaryView docs={docs} conditions={conditions} onOpenDoc={setSelectedId} />
      ) : (
        <div className="dash-body">
          <aside className="sidebar">
            <div className="sidebar-section">
              <h4>Sort by</h4>
              {Object.entries(SORTS).map(([val, s]) => (
                <button
                  key={val}
                  className={`side-item ${sortBy === val ? 'active' : ''}`}
                  onClick={() => setSortBy(val)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="sidebar-section">
              <h4>Relevance</h4>
              {[
                ['all', `All documents (${docs.length})`],
                ['high', `High relevance (${highCount})`],
                ['medium', 'Medium'],
                ['low', 'Low'],
              ].map(([val, label]) => (
                <button
                  key={val}
                  className={`side-item ${relevanceFilter === val ? 'active' : ''}`}
                  onClick={() => setRelevanceFilter(val)}
                >
                  {val !== 'all' && <span className={`rel-dot rel-${val}`} />}
                  {label}
                </button>
              ))}
            </div>
            <div className="sidebar-section">
              <h4>Category</h4>
              <button
                className={`side-item ${categoryFilter === 'all' ? 'active' : ''}`}
                onClick={() => setCategoryFilter('all')}
              >
                All categories ({counts.all})
              </button>
              {usedCategories.map((k) => (
                <button
                  key={k}
                  className={`side-item ${categoryFilter === k ? 'active' : ''}`}
                  onClick={() => setCategoryFilter(k)}
                >
                  <span className="cat-dot" style={{ background: CATEGORIES[k].color }} />
                  {CATEGORIES[k].label} ({counts[k]})
                </button>
              ))}
            </div>
            <div className="sidebar-foot muted small">
              {doneCount}/{docs.length} documents analyzed
              <br />
              Demo only — not for clinical use.
            </div>
          </aside>

          <main className="doc-list">
            {docs.length === 0 && (
              <div className="empty-state card">
                <h3>No scanned outside documents found</h3>
                <p className="muted">
                  No DocumentReference resources with PDF/image attachments were
                  returned for this patient.
                </p>
              </div>
            )}
            {visible.map((d) => (
              <DocumentCard
                key={d.id}
                doc={d}
                selected={d.id === selectedId}
                onOpen={() => setSelectedId(d.id)}
              />
            ))}
            {docs.length > 0 && visible.length === 0 && (
              <div className="empty-state card">
                <h3>No documents match the current filters</h3>
                <p className="muted">Try clearing the search or filters.</p>
              </div>
            )}
          </main>
        </div>
      )}

      {selected && (
        <DocumentViewer doc={selected} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
