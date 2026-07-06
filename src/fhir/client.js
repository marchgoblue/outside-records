// FHIR data access layer. Two implementations share one interface:
//   - LiveSource: real SMART on FHIR connection (Epic sandbox or other R4 EHR)
//   - DemoSource: bundled synthetic patient + scanned PDFs (see demoData.js)
//
// Interface:
//   getPatient()    -> { id, name, birthDate, gender, mrn, ageText }
//   getConditions() -> [{ id, display, clinicalStatus, onset }]
//   getDocuments()  -> [{ id, title, date, contentType, url, sourceOrg, docType }]
//   fetchPdf(doc)   -> ArrayBuffer
import FHIR from 'fhirclient';
import { DEMO_PATIENT, DEMO_CONDITIONS, DEMO_DOCUMENTS } from './demoData.js';

function humanName(res) {
  const n = res?.name?.find((x) => x.use === 'official') || res?.name?.[0];
  if (!n) return 'Unknown Patient';
  if (n.text) return n.text;
  return [n.given?.join(' '), n.family].filter(Boolean).join(' ');
}

function ageFrom(birthDate) {
  if (!birthDate) return '';
  const dob = new Date(birthDate);
  const diff = Date.now() - dob.getTime();
  return `${Math.floor(diff / (365.25 * 24 * 3600 * 1000))} yo`;
}

function mrnFrom(res) {
  const id = res?.identifier?.find(
    (i) =>
      i.type?.coding?.some((c) => c.code === 'MR') ||
      /mrn|epi/i.test(i.type?.text || '')
  );
  return id?.value || res?.identifier?.[0]?.value || '';
}

const SCANNED_TYPES = /pdf|image\/(tiff|png|jpe?g)/i;

export class LiveSource {
  constructor(client) {
    this.client = client;
    this.mode = 'live';
  }

  static async connect() {
    const client = await FHIR.oauth2.ready();
    return new LiveSource(client);
  }

  async getPatient() {
    const res = await this.client.patient.read();
    return {
      id: res.id,
      name: humanName(res),
      birthDate: res.birthDate || '',
      gender: res.gender || '',
      mrn: mrnFrom(res),
      ageText: ageFrom(res.birthDate),
    };
  }

  async getConditions() {
    const pid = this.client.patient.id;
    // Epic requires a category on Condition searches in many contexts;
    // try the problem list first, fall back to an uncategorized search.
    const queries = [
      `Condition?patient=${pid}&category=problem-list-item&clinical-status=active`,
      `Condition?patient=${pid}&category=problem-list-item`,
      `Condition?patient=${pid}`,
    ];
    for (const q of queries) {
      try {
        const bundle = await this.client.request(q, { pageLimit: 2, flat: true });
        const items = (bundle || [])
          .filter((r) => r.resourceType === 'Condition')
          .map((c) => ({
            id: c.id,
            display:
              c.code?.text ||
              c.code?.coding?.[0]?.display ||
              'Unspecified condition',
            clinicalStatus:
              c.clinicalStatus?.coding?.[0]?.code || 'unknown',
            onset: c.onsetDateTime || c.recordedDate || '',
          }));
        if (items.length) return dedupeBy(items, (c) => c.display.toLowerCase());
      } catch {
        // try next query shape
      }
    }
    return [];
  }

  async getDocuments() {
    const pid = this.client.patient.id;
    // Epic exposes scanned outside media as DocumentReference resources.
    // Different builds require different search params, so try a few and merge.
    const queries = [
      `DocumentReference?patient=${pid}&_count=100`,
      `DocumentReference?patient=${pid}&category=clinical-note&_count=100`,
      `DocumentReference?patient=${pid}&category=imaging-result&_count=100`,
    ];
    const seen = new Map();
    for (const q of queries) {
      try {
        const items = await this.client.request(q, { pageLimit: 3, flat: true });
        for (const r of items || []) {
          if (r.resourceType === 'DocumentReference' && !seen.has(r.id)) {
            seen.set(r.id, r);
          }
        }
        if (seen.size) break; // first successful query shape is enough
      } catch {
        // try next query shape
      }
    }

    const docs = [];
    for (const r of seen.values()) {
      const att = (r.content || [])
        .map((c) => c.attachment)
        .find((a) => a && SCANNED_TYPES.test(a.contentType || ''));
      if (!att || !att.url) continue;
      docs.push({
        id: r.id,
        title:
          r.description ||
          att.title ||
          r.type?.text ||
          r.type?.coding?.[0]?.display ||
          'Scanned document',
        date: r.date || r.context?.period?.start || '',
        contentType: att.contentType,
        url: att.url,
        sourceOrg:
          r.custodian?.display ||
          r.author?.[0]?.display ||
          'Outside organization',
        docType: r.type?.text || r.type?.coding?.[0]?.display || '',
      });
    }
    return docs;
  }

  async fetchPdf(doc) {
    // Binary content needs the raw bytes with the bearer token attached.
    const base = this.client.state.serverUrl.replace(/\/$/, '');
    const url = /^https?:/i.test(doc.url) ? doc.url : `${base}/${doc.url}`;
    const token = this.client.state.tokenResponse?.access_token;
    const resp = await fetch(url, {
      headers: {
        Accept: doc.contentType || 'application/pdf',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!resp.ok) throw new Error(`Binary fetch failed (${resp.status})`);
    return resp.arrayBuffer();
  }
}

export class DemoSource {
  constructor() {
    this.mode = 'demo';
  }

  async getPatient() {
    return DEMO_PATIENT;
  }

  async getConditions() {
    return DEMO_CONDITIONS;
  }

  async getDocuments() {
    return DEMO_DOCUMENTS;
  }

  async fetchPdf(doc) {
    const resp = await fetch(doc.url);
    if (!resp.ok) throw new Error(`Could not load demo PDF ${doc.url}`);
    return resp.arrayBuffer();
  }
}

function dedupeBy(arr, keyFn) {
  const m = new Map();
  for (const x of arr) if (!m.has(keyFn(x))) m.set(keyFn(x), x);
  return [...m.values()];
}
