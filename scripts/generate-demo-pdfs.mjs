// Generates the synthetic "scanned outside records" bundled with demo mode.
// All patients, providers, and facilities are fictional.
//
//   node scripts/generate-demo-pdfs.mjs
//
// Most PDFs get a real text layer (simulating scans OCR'd upstream or digital
// faxes). ekg-scan.pdf, pharmacy-fax.pdf, and ed-note-fax.pdf are IMAGE-ONLY
// to exercise the in-browser OCR fallback; the latter two are deliberately
// degraded (noise, blur, streaks, skew) so OCR lands in the low- and
// very-low-confidence tiers the UI warns about.
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import Jimp from 'jimp';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'demo');
mkdirSync(OUT, { recursive: true });

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 56;

async function makeTextPdf(filename, header, body) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Courier);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const helv = await doc.embedFont(StandardFonts.Helvetica);

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const drawHeader = () => {
    page.drawRectangle({ x: 0, y: PAGE_H - 44, width: PAGE_W, height: 44, color: rgb(0.93, 0.95, 0.98) });
    page.drawText(header.org, { x: MARGIN, y: PAGE_H - 30, size: 12, font: bold, color: rgb(0.1, 0.2, 0.45) });
    page.drawText(header.sub, { x: MARGIN, y: PAGE_H - 41, size: 7.5, font: helv, color: rgb(0.35, 0.4, 0.5) });
    page.drawText('SCANNED / OUTSIDE RECORD', { x: PAGE_W - 190, y: PAGE_H - 30, size: 8, font: bold, color: rgb(0.6, 0.2, 0.2) });
    y = PAGE_H - 70;
  };
  drawHeader();

  const newPage = () => {
    page = doc.addPage([PAGE_W, PAGE_H]);
    drawHeader();
  };

  for (const raw of body.split('\n')) {
    const isHeading = raw.startsWith('## ');
    const text = isHeading ? raw.slice(3) : raw;
    const size = isHeading ? 10.5 : 9;
    const useFont = isHeading ? bold : font;
    const lineHeight = size + 4;
    const maxWidth = PAGE_W - MARGIN * 2;

    const words = text.split(' ');
    let line = '';
    const lines = [];
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (useFont.widthOfTextAtSize(test, size) > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    lines.push(line);

    if (isHeading) y -= 6;
    for (const l of lines) {
      if (y < MARGIN + 20) newPage();
      page.drawText(l, { x: MARGIN, y, size, font: useFont, color: rgb(0.12, 0.12, 0.15) });
      y -= lineHeight;
    }
  }

  // faint scanner artifacts for realism
  for (const p of doc.getPages()) {
    p.drawLine({ start: { x: 8, y: 12 }, end: { x: PAGE_W - 8, y: 14 }, thickness: 0.6, color: rgb(0.82, 0.82, 0.84) });
    p.drawText('Scanned by MediScan 4.2 - Page image quality: FAIR', { x: MARGIN, y: 18, size: 6.5, font: helv, color: rgb(0.6, 0.6, 0.62) });
  }

  writeFileSync(join(OUT, filename), await doc.save());
  console.log('wrote', filename);
}

const PT = 'PATIENT: BLACKWELL, THEODORE R    DOB: 09/14/1957    MRN: E4085221';

await makeTextPdf('cardiology-consult.pdf', { org: 'LAKEVIEW HEART INSTITUTE', sub: '4200 Shoreline Drive, Suite 300 · Cardiology Consultation' }, `
${PT}
DATE OF SERVICE: 05/12/2026    PROVIDER: Anita Deshpande, MD, FACC

## REASON FOR CONSULT
Follow-up of atrial fibrillation and heart failure with reduced ejection fraction (HFrEF), medication titration.

## HISTORY OF PRESENT ILLNESS
Mr. Blackwell is a 68-year-old man with persistent atrial fibrillation on apixaban, HFrEF (LVEF 35% on echo 05/10/2026), stage III sigmoid adenocarcinoma on FOLFOX, CKD stage 3, and type 2 diabetes. He reports mild exertional dyspnea, stable 2-pillow orthopnea, no PND. Weight up 1.5 kg over two weeks. Denies chest pain, syncope, palpitations. Chemotherapy tolerated with mild fatigue; oncology aware of cardiac status.

## MEDICATIONS REVIEWED
Apixaban 5 mg BID; metoprolol succinate 100 mg daily; sacubitril-valsartan 49-51 mg BID; spironolactone 25 mg daily; empagliflozin 10 mg daily; furosemide 40 mg daily (increased today to 40 mg BID); metformin 1000 mg BID.

## EXAM
BP 108/68, HR 74 irregular, O2 98% RA. JVP 9 cm. Irregularly irregular rhythm, II/VI systolic murmur at apex. Trace bilateral pitting edema. Lungs with faint bibasilar crackles.

## ASSESSMENT AND PLAN
1. HFrEF, LVEF 35% - mild congestion; increase furosemide to 40 mg BID, daily weights, repeat BMP in 1 week given CKD. Continue guideline-directed medical therapy (GDMT).
2. Atrial fibrillation, rate-controlled - continue apixaban 5 mg BID and metoprolol. CHA2DS2-VASc 4. No cardioversion planned while on active chemotherapy.
3. Cardio-oncology - monitor for oxaliplatin-related vasospasm; troponin and NT-proBNP q2 cycles. NT-proBNP today 1450 pg/mL (prior 1620).
4. Follow up 4 weeks or sooner if weight increases >2 kg. Patient advised to seek ED evaluation for chest pain, syncope, or worsening dyspnea.

Electronically signed: Anita Deshpande, MD, FACC — Lakeview Heart Institute
`);

await makeTextPdf('echo-report.pdf', { org: 'LAKEVIEW HEART INSTITUTE', sub: 'Echocardiography Laboratory · Transthoracic Echocardiogram Report' }, `
${PT}
STUDY DATE: 05/10/2026    SONOGRAPHER: R. Kim, RDCS    READING PHYSICIAN: Anita Deshpande, MD

## INDICATION
Heart failure with reduced ejection fraction; atrial fibrillation; surveillance during chemotherapy.

## MEASUREMENTS
LVEF (biplane Simpson): 35%. LVIDd 5.9 cm. LA volume index 44 mL/m2 (severely dilated). RVSP estimated 38 mmHg. TAPSE 1.7 cm.

## FINDINGS
Left ventricle: Moderately dilated with moderately reduced systolic function, LVEF 35%. Global hypokinesis without regional wall motion abnormality. Global longitudinal strain -11% (reduced).
Left atrium: Severely dilated.
Mitral valve: Moderate functional mitral regurgitation.
Aortic valve: Trileaflet, mild sclerosis without stenosis.
Right ventricle: Normal size, low-normal function. Mild tricuspid regurgitation.
Pericardium: No effusion.
Rhythm during study: Atrial fibrillation, controlled ventricular response.

## IMPRESSION
1. Moderately reduced LV systolic function, LVEF 35% (prior 38% on 11/2025) - continue cardio-oncology surveillance.
2. Moderate functional mitral regurgitation.
3. Severely dilated left atrium consistent with longstanding atrial fibrillation.
`);

await makeTextPdf('oncology-note.pdf', { org: 'RIVERBEND CANCER CENTER', sub: 'Medical Oncology · Clinic Follow-Up Note' }, `
${PT}
DATE OF SERVICE: 06/02/2026    PROVIDER: Marcus Oyelaran, MD (Medical Oncology)

## DIAGNOSIS
Stage III (pT3 pN1b M0) moderately differentiated adenocarcinoma of the sigmoid colon, status post laparoscopic sigmoid colectomy 03/25/2026, on adjuvant FOLFOX chemotherapy.

## INTERVAL HISTORY
Presents for FOLFOX cycle 4 of planned 8. Tolerating chemotherapy with grade 1 fatigue and grade 1 cold-induced peripheral neuropathy in fingertips. No fevers, no diarrhea, no rectal bleeding. Appetite fair, weight stable. Cardiology co-managing HFrEF and atrial fibrillation; no anginal symptoms with oxaliplatin to date.

## LABS (06/02/2026)
WBC 4.1, ANC 2100, Hgb 10.8, Plt 152. Creatinine 1.5 (baseline), eGFR 48. CEA 3.1 ng/mL (down from 8.4 pre-op). LFTs within normal limits.

## ASSESSMENT AND PLAN
1. Stage III colon adenocarcinoma - proceed with FOLFOX cycle 4 today at full dose; continue neuropathy monitoring, consider oxaliplatin dose reduction if grade 2.
2. Port-a-cath functioning well, accessed without difficulty.
3. Neutropenia precautions reviewed. Patient instructed to present to the ED for fever >= 100.4 F given chemotherapy - flagged as high priority for any acute care team.
4. Anticoagulation (apixaban) continues per cardiology; hold threshold Plt < 50k.
5. Next: CEA q3 cycles; surveillance CT chest/abdomen/pelvis after cycle 8.

Electronically signed: Marcus Oyelaran, MD — Riverbend Cancer Center
`);

await makeTextPdf('pathology-report.pdf', { org: "ST. MARY'S MEDICAL CENTER", sub: 'Department of Pathology · Surgical Pathology Report' }, `
${PT}
ACCESSION: SP-26-08841    COLLECTED: 03/16/2026    REPORTED: 03/18/2026
PATHOLOGIST: Elena Vasquez, MD    ORDERING: J. Whitfield, MD (Colorectal Surgery)

## SPECIMEN
A. Sigmoid colon, biopsy (colonoscopy 03/16/2026, 28 cm from anal verge).

## GROSS DESCRIPTION
Received in formalin, five fragments of tan-pink soft tissue measuring 0.2 to 0.5 cm in greatest dimension. Entirely submitted in one cassette.

## MICROSCOPIC DESCRIPTION
Sections show colonic mucosa with an infiltrating glandular proliferation composed of atypical columnar cells with hyperchromatic, pseudostratified nuclei, forming irregular cribriform glands with central dirty necrosis. The proliferation invades through the muscularis mucosae into submucosa. Desmoplastic stromal reaction is present.

## IMMUNOHISTOCHEMISTRY / ANCILLARY
Mismatch repair proteins: MLH1, MSH2, MSH6, PMS2 - INTACT nuclear expression (microsatellite stable). KRAS/NRAS/BRAF sent to reference lab, results to follow.

## DIAGNOSIS
A. Sigmoid colon, biopsy: INVASIVE MODERATELY DIFFERENTIATED ADENOCARCINOMA arising in a tubulovillous adenoma. Lymphovascular invasion identified. Margins cannot be assessed on biopsy material.

Electronically signed: Elena Vasquez, MD — Department of Pathology
`);

await makeTextPdf('ct-abd-pelvis.pdf', { org: 'RIVERBEND IMAGING ASSOCIATES', sub: 'Diagnostic Radiology · CT Abdomen and Pelvis with IV Contrast' }, `
${PT}
EXAM DATE: 05/28/2026    RADIOLOGIST: Priya Natarajan, MD    ORDERING: Marcus Oyelaran, MD

## EXAM
CT abdomen and pelvis with IV contrast (reduced-dose contrast protocol given eGFR 48).

## INDICATION
Stage III sigmoid colon adenocarcinoma on adjuvant chemotherapy; interval assessment.

## TECHNIQUE
Helical CT of the abdomen and pelvis following administration of 75 mL Omnipaque 350. Oral contrast administered.

## FINDINGS
Postsurgical changes of sigmoid colectomy with intact anastomosis; no anastomotic leak. No pericolonic fluid collection or abscess. Liver: no focal hepatic lesion; hepatic steatosis. No new hepatic metastasis. Pancreas, spleen, adrenals unremarkable. Kidneys: bilateral cortical thinning consistent with chronic kidney disease; no hydronephrosis. No retroperitoneal or mesenteric lymphadenopathy by size criteria. Port-a-cath tip in the cavoatrial junction. Mild cardiomegaly. Trace bilateral pleural effusions at the imaged lung bases. No free air. Degenerative changes of the lumbar spine.

## IMPRESSION
1. No evidence of local recurrence or metastatic disease.
2. Postsurgical changes of sigmoid colectomy, intact anastomosis.
3. Trace bilateral pleural effusions and mild cardiomegaly - correlate with volume status given known heart failure.
`);

await makeTextPdf('lab-results.pdf', { org: 'QUEST REGIONAL LABORATORY', sub: 'Outpatient Laboratory Report · Final Results' }, `
${PT}
COLLECTED: 06/20/2026 07:42    REPORTED: 06/20/2026 13:10    ORDERING: Marcus Oyelaran, MD

## COMPLETE BLOOD COUNT (CBC)
WBC 3.8 L (Reference Range 4.0-11.0 x10*9/L)
ANC 1900 L (Reference Range 2000-7500)
Hemoglobin 10.2 L (Reference Range 13.5-17.5 g/dL)
Hematocrit 31.4 L (Reference Range 40-52 %)
Platelets 141 L (Reference Range 150-400 x10*9/L)

## COMPREHENSIVE METABOLIC PANEL (CMP)
Sodium 136 (135-145 mmol/L)
Potassium 5.2 H (3.5-5.0 mmol/L)
Chloride 101 (98-107 mmol/L)
CO2 22 (22-29 mmol/L)
BUN 34 H (7-20 mg/dL)
Creatinine 1.7 H (0.7-1.3 mg/dL) - eGFR 44 mL/min/1.73m2, baseline ~1.5
Glucose 148 H (70-99 mg/dL)
Calcium 8.9 (8.5-10.2 mg/dL)
AST 28, ALT 31, Alk Phos 88, Total bilirubin 0.7 - within reference ranges

## TUMOR MARKER
CEA 3.4 ng/mL (Reference Range < 5.0 non-smoker) - stable

## COMMENT
Mild cytopenias consistent with recent chemotherapy cycle. Potassium 5.2 and creatinine above baseline - repeat BMP recommended; note patient on spironolactone and sacubitril-valsartan.
`);

await makeTextPdf('discharge-summary.pdf', { org: "ST. MARY'S MEDICAL CENTER", sub: 'Inpatient Services · Hospital Discharge Summary' }, `
${PT}
ADMISSION DATE: 04/26/2026    DISCHARGE DATE: 04/30/2026
ATTENDING: Robert Chen, MD (Hospital Medicine)

## ADMISSION DIAGNOSIS
Acute decompensated heart failure.

## DISCHARGE DIAGNOSES
1. Acute on chronic systolic heart failure (HFrEF, LVEF 35-40%), volume overload, improved.
2. Atrial fibrillation with controlled ventricular response, on apixaban.
3. Stage III sigmoid colon adenocarcinoma, on adjuvant FOLFOX (held during admission, oncology following).
4. Chronic kidney disease stage 3 with acute kidney injury on admission, resolved to baseline.
5. Type 2 diabetes mellitus.

## HOSPITAL COURSE
Mr. Blackwell presented to the Emergency Department with three days of progressive dyspnea, orthopnea, and 4 kg weight gain after cycle 2 of FOLFOX. BNP 1890, chest x-ray with pulmonary vascular congestion and small bilateral pleural effusions. He was diuresed with IV furosemide with 5.2 L net negative over the stay. Creatinine peaked at 1.9 and returned to baseline 1.5. Rate remained controlled in atrial fibrillation; apixaban continued. Echocardiogram showed LVEF 35-40%. Empagliflozin added. Chemotherapy held during admission and resumed per outpatient oncology.

## DISCHARGE MEDICATIONS
Apixaban 5 mg BID; metoprolol succinate 100 mg daily; sacubitril-valsartan 24-26 mg BID (uptitration per cardiology); spironolactone 25 mg daily; empagliflozin 10 mg daily (NEW); furosemide 40 mg daily; metformin 1000 mg BID; ondansetron PRN.

## FOLLOW-UP / DISPOSITION
Discharged home in improved condition. Cardiology (Dr. Deshpande) in 2 weeks; oncology (Dr. Oyelaran) in 1 week; labs (BMP) in 5 days. Strict return precautions reviewed, including neutropenic fever precautions while on chemotherapy.

Electronically signed: Robert Chen, MD — Hospital Medicine
`);

await makeTextPdf('derm-note.pdf', { org: 'NORTHSIDE DERMATOLOGY', sub: 'Dermatology Clinic Note' }, `
${PT}
DATE OF SERVICE: 11/14/2025    PROVIDER: S. Albright, PA-C (Dermatology)

## REASON FOR VISIT
Annual full-body skin examination.

## HISTORY
Pleasant gentleman presenting for routine skin check. History of seborrheic keratoses. No new or changing lesions reported. No personal or family history of melanoma.

## EXAM
Full body skin exam performed. Multiple stable seborrheic keratoses on the back and chest. Scattered cherry angiomas. Mild xerosis of bilateral shins. No atypical nevi. No lesions suspicious for malignancy.

## ASSESSMENT AND PLAN
1. Seborrheic keratoses - benign, no treatment required.
2. Xerosis - recommended daily emollient.
3. Return in 12 months for routine surveillance, sooner for any new or changing lesions.
`);

// ---- Image-only "scanned fax" EKG report (exercises the OCR fallback) ----
async function makeEkgScan() {
  const W = 1700;
  const H = 2200;
  const img = new Jimp(W, H, 0xffffffff);
  const fontBig = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK);
  const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);

  let y = 110;
  const title = (t) => { img.print(fontBig, 120, y, t); y += 95; };
  const line = (t) => { img.print(font, 120, y, t); y += 52; };

  title('12-LEAD ELECTROCARDIOGRAM');
  line('LAKEVIEW HEART INSTITUTE - CARDIOLOGY');
  line('PATIENT: BLACKWELL, THEODORE R   DOB: 09/14/1957');
  line('DATE: 05/09/2026 14:22   TECH: B. Ramos');
  y += 40;
  line('VENT RATE: 78 BPM       PR: --      QRS: 96 ms');
  line('QT/QTC: 382/424 ms      AXIS: -12   RR IRREGULAR');
  y += 40;
  line('INTERPRETATION:');
  line('ATRIAL FIBRILLATION WITH CONTROLLED');
  line('VENTRICULAR RESPONSE.');
  line('NONSPECIFIC ST AND T WAVE CHANGES.');
  line('NO ACUTE ST ELEVATION.');
  line('WHEN COMPARED WITH ECG OF 02/11/2026,');
  line('NO SIGNIFICANT CHANGE.');
  y += 40;
  line('CONFIRMED BY: ANITA DESHPANDE MD');

  // fake ECG traces
  const black = Jimp.rgbaToInt(20, 20, 30, 255);
  for (let row = 0; row < 3; row++) {
    const baseY = 1560 + row * 190;
    for (let x = 120; x < W - 120; x++) {
      const t = (x - 120) / 6;
      let dy = Math.sin(t * 0.55 + row) * 9;
      if (Math.floor(t) % 42 === 0) dy -= 62; // QRS-ish spike
      const yy = Math.round(baseY + dy);
      for (let k = 0; k < 3; k++) img.setPixelColor(black, x, yy + k);
    }
  }

  const png = await img.getBufferAsync(Jimp.MIME_PNG);
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_W, PAGE_H]);
  const embedded = await doc.embedPng(png);
  page.drawImage(embedded, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });
  writeFileSync(join(OUT, 'ekg-scan.pdf'), await doc.save());
  console.log('wrote ekg-scan.pdf (image-only)');
}

await makeEkgScan();

// ---- Degraded image-only faxes (exercise the OCR confidence tiers) ----

function addNoise(img, amount) {
  img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
    if (Math.random() < amount) {
      const v = Math.random() < 0.5 ? 45 : 205;
      this.bitmap.data[idx] = v;
      this.bitmap.data[idx + 1] = v;
      this.bitmap.data[idx + 2] = v;
    }
  });
}

function addStreaks(img, count) {
  const W = img.bitmap.width;
  for (let s = 0; s < count; s++) {
    const yy = Math.floor(Math.random() * img.bitmap.height);
    const shade = 110 + Math.floor(Math.random() * 110);
    const col = Jimp.rgbaToInt(shade, shade, shade, 255);
    for (let x = 0; x < W; x++) {
      if (Math.random() < 0.8) img.setPixelColor(col, x, yy);
    }
  }
}

// Rotate slightly and re-composite on white, like a page fed crooked.
function skew(img, degrees) {
  const { width, height } = img.bitmap;
  const rotated = img.clone().rotate(degrees, false);
  const out = new Jimp(width, height, 0xffffffff);
  out.composite(
    rotated,
    Math.round((width - rotated.bitmap.width) / 2),
    Math.round((height - rotated.bitmap.height) / 2)
  );
  return out;
}

// Fax resolution loss: shrink and blow back up.
function crush(img, factor) {
  const { width, height } = img.bitmap;
  return img
    .resize(Math.round(width * factor), Math.round(height * factor))
    .resize(width, height);
}

// Wavy "handwritten annotation" strokes near the bottom margin. Tesseract
// reads these as garbage words, which is exactly what drags real-world fax
// confidence down.
function addScrawl(img, count) {
  const black = Jimp.rgbaToInt(30, 30, 40, 255);
  const W = img.bitmap.width;
  const H = img.bitmap.height;
  for (let s = 0; s < count; s++) {
    const x0 = 90 + Math.random() * (W - 500);
    const y0 = H - 550 + s * 90 + Math.random() * 40;
    const len = 260 + Math.random() * 320;
    for (let x = 0; x < len; x++) {
      const yy = Math.round(
        y0 +
          Math.sin(x * 0.09 + s * 2) * 14 +
          Math.sin(x * 0.023 + s) * 9 +
          (Math.random() - 0.5) * 2
      );
      for (let k = 0; k < 3; k++) img.setPixelColor(black, Math.round(x0 + x), yy + k);
    }
  }
}

async function makeDegradedFax(filename, titleText, bodyLines, degrade) {
  const W = 1275; // US letter at 150 dpi
  const H = 1650;
  let img = new Jimp(W, H, 0xffffffff);
  const fontBig = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK);
  // Small body font: after fax-style resolution loss the glyphs are only a
  // few pixels tall, which is what actually pushes Tesseract below the
  // confidence thresholds (32 px text survives almost any abuse).
  const font = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);

  let y = 80;
  img.print(fontBig, 90, y, titleText);
  y += 115;
  for (const t of bodyLines) {
    img.print(font, 90, y, t);
    y += t === '' ? 16 : 30;
  }

  img = degrade(img);

  const png = await img.getBufferAsync(Jimp.MIME_PNG);
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_W, PAGE_H]);
  const embedded = await doc.embedPng(png);
  page.drawImage(embedded, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });
  writeFileSync(join(OUT, filename), await doc.save());
  console.log('wrote', filename, '(image-only, degraded)');
}

// Moderately degraded — should land in the "low" (amber) confidence tier.
await makeDegradedFax(
  'pharmacy-fax.pdf',
  'PHARMACY MEDICATION LIST - FAX',
  [
    'CORNERSTONE COMMUNITY PHARMACY   FAX 555-0182',
    'PATIENT: BLACKWELL, THEODORE R   DOB: 09/14/1957',
    'DISPENSED MEDICATIONS AS OF 06/15/2026',
    '',
    'APIXABAN 5 MG TABLET - TAKE 1 TABLET TWICE DAILY',
    'METOPROLOL SUCCINATE ER 100 MG - 1 TABLET DAILY',
    'SACUBITRIL-VALSARTAN 49-51 MG - 1 TABLET TWICE DAILY',
    'SPIRONOLACTONE 25 MG TABLET - 1 TABLET DAILY',
    'EMPAGLIFLOZIN 10 MG TABLET - 1 TABLET DAILY',
    'FUROSEMIDE 40 MG TABLET - 1 TABLET TWICE DAILY',
    'METFORMIN 1000 MG TABLET - 1 TABLET TWICE DAILY',
    'ONDANSETRON 4 MG ODT - AS NEEDED FOR NAUSEA',
    '',
    'LAST SYNC WITH PRESCRIBER: DR DESHPANDE, CARDIOLOGY',
    'NOTE: PATIENT DECLINED AUTO-REFILL FOR FUROSEMIDE.',
  ],
  (img) => {
    addScrawl(img, 3);
    addNoise(img, 0.05);
    addStreaks(img, 20);
    return crush(img, 0.42).contrast(-0.18);
  }
);

// Heavily degraded — should land in the "very low" (red) confidence tier.
await makeDegradedFax(
  'ed-note-fax.pdf',
  'EMERGENCY DEPT VISIT SUMMARY',
  [
    'MERCY GENERAL HOSPITAL - EMERGENCY DEPARTMENT',
    'PATIENT: BLACKWELL, THEODORE R   DOB: 09/14/1957',
    'VISIT DATE: 06/28/2026 03:41   DISPO: DISCHARGED',
    '',
    'CHIEF COMPLAINT: PALPITATIONS, LIGHTHEADEDNESS',
    'HR 132 IRREGULAR ON ARRIVAL. ECG: ATRIAL',
    'FIBRILLATION WITH RAPID VENTRICULAR RESPONSE.',
    'RECEIVED IV DILTIAZEM 10 MG X2 WITH RATE',
    'CONTROL TO 88. TROPONIN X2 NEGATIVE.',
    'BNP 1650. CHEST XRAY: MILD CONGESTION.',
    '',
    'DISCHARGED WITH INSTRUCTIONS TO FOLLOW UP',
    'WITH CARDIOLOGY WITHIN 1 WEEK. RETURN FOR',
    'CHEST PAIN, SYNCOPE, OR WORSENING DYSPNEA.',
    'ATTENDING: K. OSEI, MD',
  ],
  (img) => {
    addScrawl(img, 8);
    addNoise(img, 0.07);
    addStreaks(img, 35);
    return skew(crush(img, 0.36).contrast(-0.22), 1.4);
  }
);

console.log('Done. Output in', OUT);
