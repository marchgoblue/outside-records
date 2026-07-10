// Chart-style summary built from the extracted text of every outside document.
// Rule-based, like the rest of the engine: medication/lab lexicons + section
// heuristics. Every item keeps a pointer back to its source document(s).

// Canonical name -> aliases (brand names, abbreviations). Matched as whole words.
const MED_LEXICON = [
  ['apixaban', ['eliquis']],
  ['warfarin', ['coumadin']],
  ['rivaroxaban', ['xarelto']],
  ['metoprolol', []],
  ['carvedilol', []],
  ['diltiazem', []],
  ['amiodarone', []],
  ['digoxin', []],
  ['furosemide', ['lasix']],
  ['bumetanide', ['bumex']],
  ['spironolactone', []],
  ['sacubitril-valsartan', ['entresto', 'sacubitril[\\/ -]valsartan']],
  ['lisinopril', []],
  ['losartan', []],
  ['amlodipine', []],
  ['hydrochlorothiazide', ['hctz']],
  ['atorvastatin', ['lipitor']],
  ['rosuvastatin', ['crestor']],
  ['simvastatin', []],
  ['aspirin', []],
  ['clopidogrel', ['plavix']],
  ['insulin', ['insulin glargine', 'lantus', 'insulin lispro', 'humalog']],
  ['metformin', []],
  ['glipizide', []],
  ['empagliflozin', ['jardiance']],
  ['dapagliflozin', ['farxiga']],
  ['semaglutide', ['ozempic']],
  ['oxaliplatin', []],
  ['capecitabine', ['xeloda']],
  ['fluorouracil', ['5-fu', '5-fluorouracil']],
  ['leucovorin', []],
  ['ondansetron', ['zofran']],
  ['pantoprazole', ['protonix']],
  ['omeprazole', ['prilosec']],
  ['albuterol', []],
  ['tiotropium', ['spiriva']],
  ['budesonide', []],
  ['prednisone', []],
  ['levothyroxine', ['synthroid']],
  ['gabapentin', []],
  ['oxycodone', []],
  ['acetaminophen', ['tylenol']],
  ['sertraline', ['zoloft']],
  ['escitalopram', ['lexapro']],
  ['allopurinol', []],
  ['potassium chloride', ['kcl']],
];

// Analyte label -> detection regex; group 1 captures the value (+ optional unit).
const LAB_PATTERNS = [
  ['WBC', /\bwbc\b[:\s]*([\d.]+\s*(?:k\/[uµ]l)?)/i],
  ['Hemoglobin', /\b(?:hemoglobin|hgb)\b[:\s]*([\d.]+\s*(?:g\/dl)?)/i],
  ['Hematocrit', /\b(?:hematocrit|hct)\b[:\s]*([\d.]+\s*%?)/i],
  ['Platelets', /\bplatelets?\b[:\s]*([\d,.]+\s*(?:k\/[uµ]l)?)/i],
  ['Sodium', /\bsodium\b[:\s]*([\d.]+\s*(?:mmol\/l|meq\/l)?)/i],
  ['Potassium', /\bpotassium\b[:\s]*([\d.]+\s*(?:mmol\/l|meq\/l)?)/i],
  ['BUN', /\bbun\b[:\s]*([\d.]+\s*(?:mg\/dl)?)/i],
  ['Creatinine', /\bcreatinine\b[:\s]*([\d.]+\s*(?:mg\/dl)?)/i],
  ['eGFR', /\begfr\b[:\s]*(>?\s*[\d.]+)/i],
  ['Glucose', /\bglucose\b[:\s]*([\d.]+\s*(?:mg\/dl)?)/i],
  ['Calcium', /\bcalcium\b[:\s]*([\d.]+\s*(?:mg\/dl)?)/i],
  ['Magnesium', /\bmagnesium\b[:\s]*([\d.]+\s*(?:mg\/dl)?)/i],
  ['Hemoglobin A1c', /\b(?:hemoglobin\s+)?a1c\b[:\s]*([\d.]+\s*%?)/i],
  ['INR', /\binr\b[:\s]*([\d.]+)/i],
  ['BNP', /\b(?:nt-probnp|bnp)\b[:\s]*([\d,.]+\s*(?:pg\/ml)?)/i],
  ['Troponin', /\btroponin(?:\s*[it])?\b[:\s]*(<?\s*[\d.]+\s*(?:ng\/m?l)?)/i],
  ['CEA', /\bcea\b[:\s]*([\d.]+\s*(?:ng\/ml)?)/i],
  ['CA 19-9', /\bca\s*19-9\b[:\s]*([\d.]+\s*(?:u\/ml)?)/i],
  ['TSH', /\btsh\b[:\s]*([\d.]+)/i],
  ['ALT', /\balt\b[:\s]*([\d.]+\s*(?:u\/l)?)/i],
  ['AST', /\bast\b[:\s]*([\d.]+\s*(?:u\/l)?)/i],
  ['Alk phos', /\b(?:alkaline phosphatase|alk phos)\b[:\s]*([\d.]+\s*(?:u\/l)?)/i],
  ['Total bilirubin', /\b(?:total\s+)?bilirubin\b[:\s]*([\d.]+\s*(?:mg\/dl)?)/i],
  ['Albumin', /\balbumin\b[:\s]*([\d.]+\s*(?:g\/dl)?)/i],
  ['Lactate', /\blactate\b[:\s]*([\d.]+\s*(?:mmol\/l)?)/i],
];

const STUDY_CATEGORIES = new Set(['imaging', 'ecg', 'pathology']);
const STUDY_TITLE_RE =
  /echo|stress test|holter|\beeg\b|\bemg\b|pft|pulmonary function|colonoscop|endoscop|cath|angiogra|biopsy/i;

// Trailing "sig"-style dose text right after a medication mention.
const DOSE_RE =
  /^[\s,]*(\d[\d.\/]*\s*(?:mg|mcg|g|units?|ml)\b(?:\s*(?:po|iv|sq|subq|daily|bid|tid|qid|qhs|q\d+h|weekly|nightly|twice daily|once daily|every other day|prn|at bedtime))*)/i;

export function buildSummary(docs, conditions) {
  const ready = docs.filter((d) => d.status === 'ready' && d.text);

  return {
    analyzedCount: ready.length,
    recentEvents: buildRecentEvents(ready),
    problems: buildProblems(ready, conditions),
    medications: buildMedications(ready),
    labs: buildLabs(ready),
    studies: buildStudies(ready),
  };
}

function buildRecentEvents(docs) {
  return [...docs]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 10)
    .map((d) => ({
      docId: d.id,
      date: d.date,
      title: d.title,
      category: d.category,
      sourceOrg: d.sourceOrg,
      usedOcr: d.usedOcr,
      ocrConfidence: d.ocrConfidence,
      detail: eventDetail(d),
    }));
}

function eventDetail(doc) {
  const impression = extractSection(doc.text, /impression:?/i);
  if (impression) return truncate(impression, 180);
  if (doc.snippets?.length) return truncate(doc.snippets[0], 180);
  return '';
}

function buildProblems(docs, conditions) {
  return conditions.map((cond) => {
    const sources = [];
    for (const d of docs) {
      const reason = d.relevance?.reasons?.find((r) => r.condition === cond.display);
      if (reason) sources.push({ docId: d.id, title: d.title, date: d.date, terms: reason.terms });
    }
    sources.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return { display: cond.display, onset: cond.onset, sources };
  });
}

function buildMedications(docs) {
  const found = new Map();
  for (const doc of docs) {
    for (const [canonical, aliases] of MED_LEXICON) {
      const re = new RegExp(`\\b(${[canonical, ...aliases].join('|')})\\b`, 'i');
      const m = re.exec(doc.text);
      if (!m) continue;
      const dose = DOSE_RE.exec(doc.text.slice(m.index + m[0].length, m.index + m[0].length + 60));
      const entry = found.get(canonical) || { name: canonical, dose: '', sources: [] };
      entry.sources.push({ docId: doc.id, title: doc.title, date: doc.date });
      // Keep the dose from the most recent document that states one.
      if (dose && (!entry.dose || (doc.date || '') >= (entry.doseDate || ''))) {
        entry.dose = dose[1].replace(/\s+/g, ' ').trim();
        entry.doseDate = doc.date;
      }
      found.set(canonical, entry);
    }
  }
  return [...found.values()]
    .map((e) => {
      e.sources.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      return e;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildLabs(docs) {
  const byAnalyte = new Map();
  for (const doc of docs) {
    for (const [label, re] of LAB_PATTERNS) {
      const m = re.exec(doc.text);
      if (!m) continue;
      const prev = byAnalyte.get(label);
      // Keep the most recent result per analyte.
      if (!prev || (doc.date || '') > (prev.date || '')) {
        byAnalyte.set(label, {
          label,
          value: m[1].replace(/\s+/g, ' ').trim().replace(/[.,]+$/, ''),
          date: doc.date,
          docId: doc.id,
          docTitle: doc.title,
        });
      }
    }
  }
  return [...byAnalyte.values()];
}

function buildStudies(docs) {
  return docs
    .filter(
      (d) =>
        STUDY_CATEGORIES.has(d.category?.category) ||
        STUDY_TITLE_RE.test(d.title || '')
    )
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .map((d) => ({
      docId: d.id,
      date: d.date,
      title: d.title,
      category: d.category,
      sourceOrg: d.sourceOrg,
      impression: truncate(
        extractSection(d.text, /impression:?/i) ||
          extractSection(d.text, /(?:final )?diagnosis:?/i) ||
          extractSection(d.text, /findings:?/i) ||
          (d.snippets?.[0] ?? ''),
        260
      ),
    }));
}

// Grab the text that follows a section heading, stopping at the next heading
// (an ALL-CAPS or Title-Case line ending in ":") or a blank line gap.
function extractSection(text, headingRe) {
  if (!text) return '';
  const m = headingRe.exec(text);
  if (!m) return '';
  const rest = text.slice(m.index + m[0].length);
  const stop = rest.search(/\n\s*\n|\n[A-Z][A-Za-z /-]{2,40}:/);
  const section = (stop === -1 ? rest : rest.slice(0, stop)).replace(/\s+/g, ' ').trim();
  return section.slice(0, 500);
}

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
}
