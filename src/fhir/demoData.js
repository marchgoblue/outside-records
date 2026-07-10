// Synthetic demo patient. All data is fictional and generated for this demo.
// The PDFs in public/demo/ are produced by scripts/generate-demo-pdfs.mjs;
// ekg-scan.pdf, pharmacy-fax.pdf, and ed-note-fax.pdf are intentionally
// image-only (the latter two degraded) to exercise the OCR fallback and its
// confidence tiers.

const BASE = import.meta.env.BASE_URL;

export const DEMO_PATIENT = {
  id: 'demo-patient-1',
  name: 'Theodore R. Blackwell',
  birthDate: '1957-09-14',
  gender: 'male',
  mrn: 'E4085221',
  ageText: '68 yo',
};

export const DEMO_CONDITIONS = [
  { id: 'c1', display: 'Atrial fibrillation', clinicalStatus: 'active', onset: '2023-02-01' },
  { id: 'c2', display: 'Heart failure with reduced ejection fraction (HFrEF)', clinicalStatus: 'active', onset: '2024-08-15' },
  { id: 'c3', display: 'Adenocarcinoma of sigmoid colon, stage III', clinicalStatus: 'active', onset: '2026-03-10' },
  { id: 'c4', display: 'Chronic kidney disease, stage 3', clinicalStatus: 'active', onset: '2022-06-01' },
  { id: 'c5', display: 'Type 2 diabetes mellitus', clinicalStatus: 'active', onset: '2015-01-01' },
];

export const DEMO_DOCUMENTS = [
  {
    id: 'd1',
    title: 'Cardiology Consultation',
    date: '2026-05-12',
    contentType: 'application/pdf',
    url: `${BASE}demo/cardiology-consult.pdf`,
    sourceOrg: 'Lakeview Heart Institute',
    docType: 'Consult note (scanned)',
  },
  {
    id: 'd2',
    title: 'Transthoracic Echocardiogram',
    date: '2026-05-10',
    contentType: 'application/pdf',
    url: `${BASE}demo/echo-report.pdf`,
    sourceOrg: 'Lakeview Heart Institute',
    docType: 'Diagnostic report (scanned)',
  },
  {
    id: 'd3',
    title: 'Medical Oncology Follow-Up',
    date: '2026-06-02',
    contentType: 'application/pdf',
    url: `${BASE}demo/oncology-note.pdf`,
    sourceOrg: 'Riverbend Cancer Center',
    docType: 'Clinic note (scanned)',
  },
  {
    id: 'd4',
    title: 'Surgical Pathology Report',
    date: '2026-03-18',
    contentType: 'application/pdf',
    url: `${BASE}demo/pathology-report.pdf`,
    sourceOrg: "St. Mary's Medical Center",
    docType: 'Pathology (scanned)',
  },
  {
    id: 'd5',
    title: 'CT Abdomen/Pelvis W Contrast',
    date: '2026-05-28',
    contentType: 'application/pdf',
    url: `${BASE}demo/ct-abd-pelvis.pdf`,
    sourceOrg: 'Riverbend Imaging Associates',
    docType: 'Imaging result (scanned)',
  },
  {
    id: 'd6',
    title: 'Outside Lab Results',
    date: '2026-06-20',
    contentType: 'application/pdf',
    url: `${BASE}demo/lab-results.pdf`,
    sourceOrg: 'Quest Regional Laboratory',
    docType: 'Lab report (scanned)',
  },
  {
    id: 'd7',
    title: 'Hospital Discharge Summary',
    date: '2026-04-30',
    contentType: 'application/pdf',
    url: `${BASE}demo/discharge-summary.pdf`,
    sourceOrg: "St. Mary's Medical Center",
    docType: 'Discharge summary (scanned)',
  },
  {
    id: 'd8',
    title: 'Scanned Media',
    date: '2026-05-09',
    contentType: 'application/pdf',
    url: `${BASE}demo/ekg-scan.pdf`,
    sourceOrg: 'Lakeview Heart Institute',
    docType: 'Scanned media (image only)',
  },
  {
    id: 'd10',
    title: 'Pharmacy Medication List',
    date: '2026-06-15',
    contentType: 'application/pdf',
    url: `${BASE}demo/pharmacy-fax.pdf`,
    sourceOrg: 'Cornerstone Community Pharmacy',
    docType: 'Medication list (faxed copy)',
  },
  {
    id: 'd11',
    title: 'ED Visit Summary',
    date: '2026-06-28',
    contentType: 'application/pdf',
    url: `${BASE}demo/ed-note-fax.pdf`,
    sourceOrg: 'Mercy General Hospital',
    docType: 'ED note (faxed copy)',
  },
  {
    id: 'd9',
    title: 'Dermatology Clinic Note',
    date: '2025-11-14',
    contentType: 'application/pdf',
    url: `${BASE}demo/derm-note.pdf`,
    sourceOrg: 'Northside Dermatology',
    docType: 'Clinic note (scanned)',
  },
];
