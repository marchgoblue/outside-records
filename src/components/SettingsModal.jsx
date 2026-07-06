import React, { useState } from 'react';
import { getClientId, setClientId } from '../config.js';

export default function SettingsModal({ onClose }) {
  const [id, setId] = useState(getClientId());
  const launchUrl = new URL('launch.html', window.location.href).href;
  const redirectUri = new URL(import.meta.env.BASE_URL, window.location.origin).href;

  function save() {
    setClientId(id);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal card" onClick={(e) => e.stopPropagation()}>
        <h2>Settings</h2>
        <label className="field-label" htmlFor="client-id">
          Epic non-production client ID
        </label>
        <input
          id="client-id"
          className="text-input"
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="e.g. 0e7e3bfc-…"
          spellCheck={false}
        />
        <p className="muted small">
          Get one free at <b>fhir.epic.com</b> → Build Apps. Stored only in this
          browser's localStorage.
        </p>
        <div className="kv">
          <div>
            <span className="field-label">Launch URL (paste into Epic app registration)</span>
            <code className="copyable">{launchUrl}</code>
          </div>
          <div>
            <span className="field-label">Redirect URI</span>
            <code className="copyable">{redirectUri}</code>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
