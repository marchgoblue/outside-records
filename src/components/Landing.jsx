import React, { useState } from 'react';
import SettingsModal from './SettingsModal.jsx';
import { getClientId } from '../config.js';

export default function Landing({ onDemo }) {
  const [showSettings, setShowSettings] = useState(false);
  const hasClientId = !!getClientId();
  const launchUrl = new URL('launch.html', window.location.href).href;
  const redirectUri = new URL(import.meta.env.BASE_URL, window.location.origin).href;

  return (
    <div className="landing">
      <header className="landing-hero">
        <div className="landing-logo">
          <LogoMark />
          <span>Outside Records</span>
        </div>
        <h1>
          Outside records, <em>found.</em>
        </h1>
        <p className="landing-sub">
          A SMART on FHIR app that digs scanned outside-hospital PDFs out of the
          Media tab, reads them with text extraction + OCR, categorizes them,
          and ranks them by relevance to your patient's active problems —
          built for the pace of the ED and inpatient care.
        </p>
        <div className="landing-actions">
          <button className="btn btn-primary btn-lg" onClick={onDemo}>
            ▶ Try the demo patient
          </button>
          <button className="btn btn-ghost btn-lg" onClick={() => setShowSettings(true)}>
            ⚙ Settings {hasClientId ? '· client ID saved' : '· add Epic client ID'}
          </button>
        </div>
      </header>

      <section className="landing-grid">
        <Feature icon="🔎" title="Finds buried media">
          Queries DocumentReference for scanned PDFs across the chart, so
          outside cardiology notes, path reports, and imaging don't get missed.
        </Feature>
        <Feature icon="🧠" title="Reads every page">
          Extracts embedded text with pdf.js and falls back to in-browser
          Tesseract OCR for image-only scans and faxes.
        </Feature>
        <Feature icon="🏷️" title="Categorizes automatically">
          Cardiology, oncology, imaging, labs, pathology, discharge summaries,
          operative notes, and more — with confidence levels.
        </Feature>
        <Feature icon="🎯" title="Ranks by relevance">
          Cross-references the active problem list, boosts recent documents,
          and explains <em>why</em> each record matters for this patient.
        </Feature>
      </section>

      <section className="landing-launch card">
        <h3>Launching from Epic</h3>
        <ol>
          <li>
            Register a non-production app at <b>fhir.epic.com</b> with redirect URI{' '}
            <code>{redirectUri}</code>
          </li>
          <li>
            Set the launch URL to <code>{launchUrl}</code>
          </li>
          <li>Paste your client ID into Settings on this page</li>
          <li>
            Launch from the Epic sandbox — the app opens inside the EHR window
            with the patient in context
          </li>
        </ol>
        <p className="muted small">
          Demo only — not for clinical use. All demo data is synthetic.
        </p>
      </section>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}

function Feature({ icon, title, children }) {
  return (
    <div className="feature card">
      <div className="feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

export function LogoMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="2" y="4" width="20" height="26" rx="3" fill="#2563eb" />
      <rect x="10" y="1" width="20" height="26" rx="3" fill="#60a5fa" />
      <path d="M15 10h10M15 15h10M15 20h6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
