// App-wide configuration. The Epic client ID is entered by the user in
// Settings (persisted in localStorage) so the repo never hard-codes one.

const CLIENT_ID_KEY = 'or_epic_client_id';

export function getClientId() {
  return localStorage.getItem(CLIENT_ID_KEY) || '';
}

export function setClientId(id) {
  if (id) localStorage.setItem(CLIENT_ID_KEY, id.trim());
  else localStorage.removeItem(CLIENT_ID_KEY);
}

// Scopes requested at launch. Epic grants only what the app registration allows.
export const SMART_SCOPE = [
  'launch',
  'openid',
  'fhirUser',
  'patient/Patient.read',
  'patient/Condition.read',
  'patient/DocumentReference.read',
  'patient/Binary.read',
].join(' ');

// Epic public sandbox R4 endpoint (used for standalone patient launch testing).
export const EPIC_SANDBOX_ISS =
  'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4';

// Only OCR when the embedded text layer looks empty/near-empty.
export const OCR_MIN_CHARS_PER_PAGE = 40;
// Cap OCR work per document so a 60-page scan doesn't stall the demo.
export const OCR_MAX_PAGES = 3;

// Tesseract confidence (0-100) thresholds for warning the user. Below ~80
// usually means scattered recognition errors; below ~60, substantial garbling.
export const OCR_CONF_LOW = 80;
export const OCR_CONF_VERY_LOW = 60;
