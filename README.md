# Outside Records

**A SMART on FHIR app that surfaces, reads, categorizes, and ranks scanned outside-hospital records for acute care clinicians.**

Patients in the ED and inpatient settings frequently arrive with detailed outside records — cardiology and oncology clinic notes, imaging, lab, and pathology reports — buried as scanned PDFs in the Media section of the chart. Finding them is slow and they are frequently missed. Outside Records launches inside Epic, pulls every scanned document for the patient in context, reads each one (text extraction + in-browser OCR for image-only scans), auto-categorizes it, and ranks it by relevance to the patient's active problem list — with an explanation of *why* each document matters.

> ⚠️ **Demo only — not for clinical use.** All bundled demo data is synthetic.

**Live app:** https://marchgoblue.github.io/outside-records/
**Demo mode (no EHR needed):** https://marchgoblue.github.io/outside-records/?demo=1

## How it works

1. **Launch** — Epic opens `launch.html` with `iss` + `launch` params (SMART on FHIR EHR launch). OAuth2 completes via [fhirclient](https://github.com/smart-on-fhir/client-js) and lands on the app with the patient in context.
2. **Discover** — the app searches `DocumentReference` for the patient and keeps entries whose attachments are PDFs or scanned images, fetching the bytes from `Binary`.
3. **Read** — [pdf.js](https://mozilla.github.io/pdf.js/) extracts the embedded text layer. Pages with little or no text (true image-only scans/faxes) are rendered to canvas and OCR'd in the browser with [Tesseract.js](https://tesseract.projectnaptha.com/). No document content ever leaves the browser.
4. **Categorize** — a rule-based engine (`src/engine/categories.js`) classifies each document: Cardiology, ECG, Oncology, Imaging, Laboratory, Pathology, Discharge Summary, Operative Note, Consult/Clinic Note, Medication List.
5. **Rank** — `src/engine/relevance.js` maps the patient's active `Condition` list to clinical topics, scores each document against those topics, adds an acute-care value prior (discharge summaries and specialty reports first) and a recency boost, then explains the reasoning ("Relevant to Atrial fibrillation — mentions apixaban, cardioversion…").

## Demo mode

Click **Try the demo patient** (or append `?demo=1`). A synthetic 68-year-old with AFib, HFrEF, stage III colon cancer, CKD 3, and T2DM is loaded along with nine realistic "scanned" outside PDFs — including one deliberately image-only EKG fax so you can watch the OCR fallback work live.

Regenerate the demo PDFs with `npm run gen:demo`.

## Running locally

```bash
npm install
npm run dev        # http://localhost:5173/outside-records/
npm run build      # production build in dist/
```

## Connecting to the Epic sandbox

1. Create a free account at [fhir.epic.com](https://fhir.epic.com) and click **Build Apps** → **Create**.
2. Application audience: **Clinicians or Administrative Users** (provider-facing).
3. Add these APIs (R4): `Patient.Read`, `Condition.Search`, `DocumentReference.Search`, `DocumentReference.Read`, `Binary.Read`.
4. Set **Redirect URI**: `https://marchgoblue.github.io/outside-records/`
5. There is no separate "scopes" field — Epic derives the OAuth scopes from the APIs selected in step 3. The app requests `launch openid fhirUser patient/Patient.read patient/Condition.read patient/DocumentReference.read patient/Binary.read` at launch (see `src/config.js`). If asked, the app is a **public** (non-confidential) client; FHIR version **R4**.
6. Save and copy the **Non-Production Client ID** (it can take a few hours to sync to the sandbox).
7. Open the app, click **Settings**, paste the client ID.
8. Test the launch with Epic's [Launchpad / simulator](https://fhir.epic.com/Documentation?docId=testpatients), using launch URL `https://marchgoblue.github.io/outside-records/launch.html`.

Sandbox note: Epic's public sandbox test patients have limited scanned media, so the live connection demonstrates the FHIR plumbing while demo mode demonstrates the full extraction/OCR/ranking pipeline.

## Architecture

```
launch.html / src/launch.js     SMART EHR launch (OAuth2 authorize)
index.html  / src/main.jsx      App entry (OAuth2 ready → dashboard)
src/fhir/client.js              LiveSource (SMART) + DemoSource (bundled data), one interface
src/fhir/demoData.js            Synthetic patient, conditions, document index
src/engine/extract.js           pdf.js text layer + Tesseract.js OCR fallback
src/engine/categories.js        Rule-based categorization (weighted keyword patterns)
src/engine/relevance.js         Condition→topic mapping, scoring, snippets, explanations
src/components/                 Landing, Dashboard, PatientBanner, DocumentCard, Viewer, Settings
scripts/generate-demo-pdfs.mjs  Builds the synthetic scanned PDFs (pdf-lib + jimp)
.github/workflows/deploy.yml    Build + deploy to GitHub Pages on push to main
```

Everything is static and client-side: no backend, no PHI transmitted anywhere, deployable on any static host.

## License

MIT — demo/educational use.
