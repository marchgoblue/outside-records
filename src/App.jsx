import React, { useEffect, useRef, useState } from 'react';
import { LiveSource, DemoSource } from './fhir/client.js';
import { extractPdfText } from './engine/extract.js';
import { categorize } from './engine/categories.js';
import { matchTopics, scoreRelevance, extractSnippets } from './engine/relevance.js';
import Landing from './components/Landing.jsx';
import Dashboard from './components/Dashboard.jsx';

// App phases: 'boot' -> 'landing' | 'connecting' -> 'ready' | 'error'
export default function App() {
  const [phase, setPhase] = useState('boot');
  const [error, setError] = useState('');
  const [source, setSource] = useState(null);
  const [patient, setPatient] = useState(null);
  const [conditions, setConditions] = useState([]);
  const [docs, setDocs] = useState([]);
  const [progress, setProgress] = useState(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isSmartRedirect =
      (params.get('code') && params.get('state')) ||
      sessionStorage.getItem('SMART_KEY');
    if (params.get('demo') === '1') {
      startSession(new DemoSource());
    } else if (isSmartRedirect) {
      setPhase('connecting');
      LiveSource.connect()
        .then((src) => startSession(src))
        .catch((e) => {
          setError(
            'Could not complete the SMART on FHIR connection: ' +
              (e?.message || e)
          );
          setPhase('error');
        });
    } else {
      setPhase('landing');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startSession(src) {
    if (startedRef.current) return;
    startedRef.current = true;
    setSource(src);
    setPhase('connecting');
    try {
      const [pt, conds, documents] = await Promise.all([
        src.getPatient(),
        src.getConditions(),
        src.getDocuments(),
      ]);
      setPatient(pt);
      setConditions(conds);
      setDocs(
        documents.map((d) => ({
          ...d,
          status: 'pending',
          category: null,
          relevance: null,
          snippets: [],
          text: '',
          blobUrl: null,
          usedOcr: false,
          ocrConfidence: null,
        }))
      );
      setPhase('ready');
      processDocuments(src, documents, conds);
    } catch (e) {
      setError('Failed to load chart data: ' + (e?.message || e));
      setPhase('error');
    }
  }

  async function processDocuments(src, documents, conds) {
    const topics = matchTopics(conds);
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      setProgress({ current: i + 1, total: documents.length, title: doc.title, stage: 'fetch' });
      patchDoc(doc.id, { status: 'processing' });
      try {
        const buffer = await src.fetchPdf(doc);
        const blobUrl = URL.createObjectURL(
          new Blob([buffer], { type: doc.contentType || 'application/pdf' })
        );
        const { text, numPages, usedOcr, ocrConfidence } = await extractPdfText(
          buffer.slice(0),
          ({ stage, page, numPages: n }) =>
            setProgress({
              current: i + 1,
              total: documents.length,
              title: doc.title,
              stage: stage === 'ocr' ? `OCR page ${page}/${n}` : `reading page ${page}/${n}`,
            })
        );
        const category = categorize(text, doc.title);
        const relevance = scoreRelevance(doc, text, category, topics);
        const snippets = extractSnippets(text, relevance.matchedTerms);
        patchDoc(doc.id, {
          status: 'ready',
          text,
          numPages,
          usedOcr,
          ocrConfidence,
          category,
          relevance,
          snippets,
          blobUrl,
        });
      } catch (e) {
        console.error('Failed to process document', doc.title, e);
        patchDoc(doc.id, { status: 'error', error: e?.message || String(e) });
      }
    }
    setProgress(null);
  }

  function patchDoc(id, patch) {
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  if (phase === 'boot' || phase === 'connecting') {
    return (
      <div className="fullscreen-center">
        <div className="spinner" />
        <h2>Outside Records</h2>
        <p className="muted">
          {phase === 'connecting' ? 'Connecting to the chart…' : 'Loading…'}
        </p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="fullscreen-center">
        <div className="error-box">
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <a className="btn btn-primary" href={import.meta.env.BASE_URL}>
            Back to start
          </a>
        </div>
      </div>
    );
  }

  if (phase === 'landing') {
    return <Landing onDemo={() => startSession(new DemoSource())} />;
  }

  return (
    <Dashboard
      mode={source?.mode}
      patient={patient}
      conditions={conditions}
      docs={docs}
      progress={progress}
    />
  );
}
