// Relevance scoring: how much does a document matter for THIS patient's
// active problems, and for an acute care clinician generally?
//
// 1. Map each active Condition to a topic (regexes over the condition text).
// 2. Score each document's extracted text against every matched topic's terms.
// 3. Add category affinity (e.g., cardiology docs matter for cardiac problems),
//    an acute-care value prior, and a recency boost.

const TOPICS = [
  {
    id: 'afib',
    conditionRe: /atrial fib|a[- ]?fib|atrial flutter/i,
    terms: [
      [/atrial fibrillation|afib|atrial flutter/gi, 5],
      [/anticoagul|apixaban|eliquis|warfarin|rivaroxaban|xarelto|coumadin/gi, 4],
      [/rate control|rhythm control|cardiovers|ablation/gi, 4],
      [/metoprolol|diltiazem|amiodarone|digoxin/gi, 3],
      [/\bekg\b|\becg\b|electrocardiogram|ventricular rate/gi, 3],
      [/chads?2?[- ]?vasc|\binr\b/gi, 3],
    ],
    categoryAffinity: { cardiology: 8, ecg: 8, dischargeSummary: 3 },
  },
  {
    id: 'heartFailure',
    conditionRe: /heart failure|hfr?ef|cardiomyopathy|chf/i,
    terms: [
      [/heart failure|hfr?ef|cardiomyopathy|chf\b/gi, 5],
      [/ejection fraction|\bl?vef\b/gi, 5],
      [/echocardiogram|\becho\b/gi, 4],
      [/furosemide|lasix|bumetanide|diure/gi, 3],
      [/entresto|sacubitril|carvedilol|spironolactone|dapagliflozin|empagliflozin/gi, 3],
      [/\bbnp\b|nt-probnp|volume overload|edema/gi, 3],
      [/guideline[- ]directed|gdmt/gi, 3],
    ],
    categoryAffinity: { cardiology: 8, ecg: 4, imaging: 2, dischargeSummary: 3 },
  },
  {
    id: 'cancer',
    conditionRe: /cancer|carcinoma|adenocarcinoma|malignan|lymphoma|leukemia|neoplasm|tumor/i,
    terms: [
      [/carcinoma|adenocarcinoma|malignan|neoplasm|tumor|mass\b/gi, 5],
      [/oncolog|chemotherap|immunotherap|radiation/gi, 5],
      [/folfox|folfiri|oxaliplatin|5-fu|fluorouracil|capecitabine/gi, 4],
      [/metasta|staging|stage (i{1,3}v?|[1-4])/gi, 4],
      [/\bcea\b|ca 19-9|tumor marker/gi, 4],
      [/biopsy|patholog|margins|lymph node/gi, 3],
      [/neutropeni|cycle \d|port[- ]?a?[- ]?cath/gi, 3],
    ],
    categoryAffinity: { oncology: 8, pathology: 7, imaging: 5, laboratory: 3 },
  },
  {
    id: 'ckd',
    conditionRe: /chronic kidney|ckd|renal (insufficiency|failure|disease)|esrd/i,
    terms: [
      [/chronic kidney|ckd\b|renal/gi, 4],
      [/creatinine|\begfr\b|\bbun\b/gi, 4],
      [/dialysis|nephrolog/gi, 4],
      [/potassium|hyperkalemia|acidosis/gi, 3],
      [/contrast[- ]induced|nephrotox/gi, 3],
    ],
    categoryAffinity: { laboratory: 5, dischargeSummary: 2 },
  },
  {
    id: 'diabetes',
    conditionRe: /diabetes|t2dm|t1dm|diabetic/i,
    terms: [
      [/diabet/gi, 4],
      [/a1c\b|hemoglobin a1c|glucose|glycemic/gi, 4],
      [/insulin|metformin|glipizide|semaglutide|ozempic|jardiance/gi, 3],
      [/hypoglycemi|hyperglycemi|dka\b/gi, 4],
      [/neuropathy|retinopathy|foot ulcer/gi, 2],
    ],
    categoryAffinity: { laboratory: 3, medications: 2 },
  },
  {
    id: 'copdAsthma',
    conditionRe: /copd|asthma|emphysema|chronic obstructive/i,
    terms: [
      [/copd|asthma|emphysema|obstructive/gi, 5],
      [/albuterol|inhaler|nebuliz|tiotropium|budesonide/gi, 4],
      [/spirometry|fev1|pulmonary function/gi, 4],
      [/exacerbation|wheez|dyspnea/gi, 3],
      [/pulmonolog/gi, 4],
    ],
    categoryAffinity: { imaging: 4, dischargeSummary: 3 },
  },
  {
    id: 'stroke',
    conditionRe: /stroke|cva|tia|cerebrovascular/i,
    terms: [
      [/stroke|cva\b|tia\b|infarct/gi, 5],
      [/neurolog|carotid|thrombectomy|tpa\b|tenecteplase/gi, 4],
      [/mri brain|ct head|ct angiogra/gi, 4],
      [/aphasia|hemipares|weakness/gi, 2],
    ],
    categoryAffinity: { imaging: 6, dischargeSummary: 3 },
  },
  {
    id: 'cad',
    conditionRe: /coronary|cad\b|myocardial|nstemi|stemi|angina/i,
    terms: [
      [/coronary|myocardial|nstemi|stemi|angina/gi, 5],
      [/stent|catheterization|cath\b|angiogra|cabg/gi, 4],
      [/troponin|aspirin|clopidogrel|plavix|statin/gi, 3],
    ],
    categoryAffinity: { cardiology: 8, ecg: 6 },
  },
];

// Documents an acute-care clinician nearly always wants first.
const ACUTE_VALUE_PRIOR = {
  dischargeSummary: 6,
  cardiology: 4,
  oncology: 4,
  imaging: 4,
  pathology: 4,
  ecg: 3,
  laboratory: 3,
  operative: 3,
  consult: 2,
  medications: 2,
  other: 0,
};

export function matchTopics(conditions) {
  const matched = [];
  for (const cond of conditions) {
    for (const topic of TOPICS) {
      if (topic.conditionRe.test(cond.display)) {
        matched.push({ topic, condition: cond });
      }
    }
  }
  return matched;
}

export function scoreRelevance(doc, text, category, matchedTopics) {
  let score = ACUTE_VALUE_PRIOR[category.category] || 0;
  const reasons = [];
  const matchedTerms = new Set();

  for (const { topic, condition } of matchedTopics) {
    let topicScore = 0;
    const topicTerms = [];
    for (const [re, weight] of topic.terms) {
      const hits = countMatches(text, re) + countMatches(doc.title, re) * 2;
      if (hits > 0) {
        topicScore += weight * Math.min(hits, 4);
        const sample = firstMatch(text, re) || firstMatch(doc.title, re);
        if (sample) {
          topicTerms.push(sample.toLowerCase());
          matchedTerms.add(sample.toLowerCase());
        }
      }
    }
    topicScore += topic.categoryAffinity?.[category.category] || 0;
    if (topicScore >= 8) {
      score += topicScore;
      reasons.push({
        condition: condition.display,
        terms: [...new Set(topicTerms)].slice(0, 6),
      });
    }
  }

  // Recency: outside records from the last ~3 months matter most acutely.
  const days = daysAgo(doc.date);
  if (days !== null) {
    if (days <= 30) score += 8;
    else if (days <= 90) score += 5;
    else if (days <= 365) score += 2;
  }

  const level = score >= 30 ? 'high' : score >= 14 ? 'medium' : 'low';
  return { score, level, reasons, matchedTerms: [...matchedTerms] };
}

// Pull short snippets around the highest-value matched terms for the card UI.
export function extractSnippets(text, matchedTerms, max = 2) {
  if (!text || !matchedTerms.length) return [];
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+|\n/)
    .filter((s) => s.length > 25 && s.length < 400);
  const scored = sentences
    .map((s) => {
      const lower = s.toLowerCase();
      const hits = matchedTerms.filter((t) => lower.includes(t)).length;
      return { s: s.trim(), hits };
    })
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits);
  const out = [];
  for (const { s } of scored) {
    if (out.length >= max) break;
    if (!out.some((o) => o === s)) out.push(s.length > 220 ? s.slice(0, 217) + '…' : s);
  }
  return out;
}

function countMatches(str, re) {
  if (!str) return 0;
  const m = str.match(re);
  return m ? m.length : 0;
}

function firstMatch(str, re) {
  if (!str) return null;
  const m = re.exec(str);
  re.lastIndex = 0; // global regexes are stateful
  if (!m) return null;
  // Expand a partial-stem match (e.g. "chemotherap") to the full word(s).
  let start = m.index;
  let end = m.index + m[0].length;
  while (start > 0 && /\w/.test(str[start - 1])) start--;
  while (end < str.length && /\w/.test(str[end])) end++;
  return str.slice(start, end);
}

function daysAgo(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return Math.floor((Date.now() - d.getTime()) / (24 * 3600 * 1000));
}
