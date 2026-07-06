import React from 'react';

export default function PatientBanner({ patient, conditions }) {
  if (!patient) return null;
  const sex = patient.gender ? patient.gender[0].toUpperCase() + patient.gender.slice(1) : '';
  return (
    <div className="patient-banner">
      <div className="patient-id">
        <div className="patient-avatar">{initials(patient.name)}</div>
        <div>
          <div className="patient-name">{patient.name}</div>
          <div className="patient-meta muted">
            {[patient.ageText, sex, patient.birthDate && `DOB ${patient.birthDate}`, patient.mrn && `MRN ${patient.mrn}`]
              .filter(Boolean)
              .join(' · ')}
          </div>
        </div>
      </div>
      <div className="condition-chips">
        <span className="chips-label muted small">Active problems:</span>
        {conditions.length === 0 && <span className="muted small">none on file</span>}
        {conditions.map((c) => (
          <span key={c.id} className="chip" title={c.onset ? `Onset ${c.onset}` : ''}>
            {c.display}
          </span>
        ))}
      </div>
    </div>
  );
}

function initials(name = '') {
  return name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}
