// Rule-based document categorization.
// Each category has weighted keyword patterns; title hits count extra.

export const CATEGORIES = {
  cardiology: {
    label: 'Cardiology',
    color: '#e11d48',
    patterns: [
      [/cardiolog/gi, 5],
      [/echocardiogram|\becho\b/gi, 4],
      [/ejection fraction|\bl?vef\b/gi, 4],
      [/atrial fibrillation|\bafib\b|atrial flutter/gi, 3],
      [/heart failure|\bhfr?ef\b|cardiomyopathy/gi, 3],
      [/catheterization|\bcath\b|stent|angiogra/gi, 3],
      [/troponin|\bbnp\b|nt-probnp/gi, 2],
      [/pacemaker|\bicd\b|defibrillator/gi, 3],
      [/anticoagul|apixaban|warfarin|eliquis/gi, 2],
      [/mitral|aortic|tricuspid|valve/gi, 2],
    ],
  },
  ecg: {
    label: 'ECG',
    color: '#be123c',
    patterns: [
      [/12[- ]lead|\becg\b|\bekg\b|electrocardiogram/gi, 6],
      [/sinus rhythm|sinus tachy|sinus brady/gi, 4],
      [/qrs|qtc?\b|pr interval|st[- ](elevation|depression)/gi, 3],
      [/ventricular rate|atrial rate/gi, 3],
    ],
  },
  oncology: {
    label: 'Oncology',
    color: '#7c3aed',
    patterns: [
      [/oncolog/gi, 6],
      [/chemotherap|folfox|folfiri|immunotherap|carboplatin|oxaliplatin/gi, 5],
      [/carcinoma|adenocarcinoma|malignan|neoplasm|tumor board/gi, 4],
      [/metasta/gi, 3],
      [/stag(e|ing)\s+(i{1,3}v?|[1-4])/gi, 3],
      [/radiation|radiotherapy|port[- ]?a?[- ]?cath/gi, 2],
      [/neutropeni|nadir|cycle \d/gi, 3],
    ],
  },
  imaging: {
    label: 'Imaging',
    color: '#0891b2',
    patterns: [
      [/radiolog/gi, 5],
      [/\bct\b (scan|abdomen|chest|head|pelvis)|computed tomograph/gi, 5],
      [/\bmri?\b|magnetic resonance/gi, 4],
      [/x[- ]?ray|radiograph|ultrasound|sonograph|doppler/gi, 4],
      [/impression:/gi, 3],
      [/findings:/gi, 2],
      [/contrast|technique:/gi, 2],
      [/\bpet\b[- \/]?ct/gi, 4],
    ],
  },
  laboratory: {
    label: 'Laboratory',
    color: '#ca8a04',
    patterns: [
      [/laboratory|lab(oratory)? (result|report)/gi, 5],
      [/\bcbc\b|\bcmp\b|\bbmp\b|complete blood count|metabolic panel/gi, 5],
      [/reference range|ref\.? range/gi, 4],
      [/hemoglobin|hematocrit|platelet|wbc\b/gi, 2],
      [/creatinine|\begfr\b|potassium|sodium\b/gi, 2],
      [/\binr\b|\bpt\b\/inr|a1c\b|tsh\b/gi, 2],
      [/\bcea\b|ca 19-9|tumor marker/gi, 3],
    ],
  },
  pathology: {
    label: 'Pathology',
    color: '#9333ea',
    patterns: [
      [/patholog/gi, 6],
      [/biopsy|specimen|gross description|microscopic/gi, 4],
      [/histolog|immunohistochem|cytolog/gi, 4],
      [/margins? (are|were|negative|positive)/gi, 3],
      [/differentiated|invasive|in situ/gi, 2],
      [/lymph nodes? (positive|negative|examined)/gi, 3],
    ],
  },
  dischargeSummary: {
    label: 'Discharge Summary',
    color: '#2563eb',
    patterns: [
      [/discharge summar/gi, 8],
      [/hospital course/gi, 5],
      [/admission (date|diagnosis)/gi, 3],
      [/discharge (medication|disposition|diagnosis|instruction)/gi, 4],
      [/condition (at|on) discharge/gi, 4],
    ],
  },
  operative: {
    label: 'Operative Note',
    color: '#0d9488',
    patterns: [
      [/operative (note|report)/gi, 8],
      [/procedure performed/gi, 5],
      [/surgeon:|anesthesia:/gi, 4],
      [/estimated blood loss|\bebl\b/gi, 4],
      [/pre[- ]?operative diagnosis/gi, 4],
    ],
  },
  consult: {
    label: 'Consult / Clinic Note',
    color: '#4f46e5',
    patterns: [
      [/consultation|consult note/gi, 5],
      [/reason for (consult|referral|visit)/gi, 4],
      [/chief complaint|history of present illness|\bhpi\b/gi, 3],
      [/assessment (and|&|\/) plan/gi, 3],
      [/follow[- ]?up (visit|appointment)/gi, 2],
      [/clinic (note|visit)/gi, 3],
    ],
  },
  medications: {
    label: 'Medication List',
    color: '#65a30d',
    patterns: [
      [/medication (list|reconciliation)/gi, 7],
      [/sig:|refills?:/gi, 4],
      [/current medications/gi, 4],
      [/\bpo\b (daily|bid|tid|qid)/gi, 2],
    ],
  },
  other: {
    label: 'Other',
    color: '#64748b',
    patterns: [],
  },
};

// Specialty categories that should win over generic "consult" on ties.
const SPECIFICITY_BONUS = {
  ecg: 2,
  pathology: 2,
  dischargeSummary: 2,
  operative: 2,
  oncology: 1,
  cardiology: 1,
  imaging: 1,
  laboratory: 1,
};

// Document titles (from DocumentReference.description/type) are high-precision:
// a doc titled "Discharge Summary" is one, even if the body is dominated by
// disease-specific vocabulary. Checked in order; first match wins.
const TITLE_OVERRIDES = [
  [/discharge summar/i, 'dischargeSummary'],
  [/operative (note|report)/i, 'operative'],
  [/patholog/i, 'pathology'],
  [/\becg\b|\bekg\b|electrocardiogram/i, 'ecg'],
  [/echocardiogram|\becho\b/i, 'cardiology'],
  [/\blab(oratory)?\b.*result|result.*\blab(oratory)?\b/i, 'laboratory'],
  [/\bct\b|\bmri?\b|x-?ray|ultrasound|radiolog/i, 'imaging'],
  [/oncolog/i, 'oncology'],
  [/cardiolog/i, 'cardiology'],
];

export function categorize(text, title = '') {
  const scores = {};
  const matched = {};
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    let score = 0;
    const hits = new Set();
    for (const [re, weight] of cat.patterns) {
      const bodyHits = countMatches(text, re);
      const titleHits = countMatches(title, re);
      if (bodyHits + titleHits > 0) {
        // Cap repeats so one boilerplate word can't dominate.
        score += weight * Math.min(bodyHits, 4) + weight * 3 * titleHits;
        hits.add(re.source.slice(0, 40));
      }
    }
    if (score > 0) score += SPECIFICITY_BONUS[key] || 0;
    scores[key] = score;
    matched[key] = hits;
  }

  let best = 'other';
  let bestScore = 0;
  for (const [key, s] of Object.entries(scores)) {
    if (s > bestScore) {
      best = key;
      bestScore = s;
    }
  }

  for (const [re, key] of TITLE_OVERRIDES) {
    if (re.test(title)) {
      if (key !== best) {
        best = key;
        bestScore = Math.max(scores[key] || 0, 8); // at least medium confidence
      }
      break;
    }
  }
  const confidence = bestScore >= 20 ? 'high' : bestScore >= 8 ? 'medium' : 'low';
  return {
    category: best,
    label: CATEGORIES[best].label,
    color: CATEGORIES[best].color,
    score: bestScore,
    confidence,
    matchedPatterns: [...(matched[best] || [])],
  };
}

function countMatches(str, re) {
  if (!str) return 0;
  const m = str.match(re);
  return m ? m.length : 0;
}
