// SMART on FHIR EHR launch entry point.
// Epic (or another EHR) opens launch.html?iss=...&launch=...
// We kick off the OAuth2 authorization dance and land back on index.html.
import FHIR from 'fhirclient';
import { getClientId, SMART_SCOPE } from './config.js';

const params = new URLSearchParams(window.location.search);
const statusEl = document.getElementById('status');
const spinnerEl = document.getElementById('spinner');

function fail(msg) {
  if (spinnerEl) spinnerEl.style.display = 'none';
  if (statusEl) {
    statusEl.className = 'err';
    statusEl.innerHTML = msg;
  }
}

const clientId = params.get('clientId') || getClientId();

if (!params.get('iss')) {
  fail(
    'Missing <code>iss</code> parameter. This page must be launched from an EHR ' +
      '(e.g., the Epic sandbox) as a SMART on FHIR EHR launch. ' +
      `To explore without an EHR, <a href="./">open the app directly</a> and use Demo Mode.`
  );
} else if (!clientId) {
  fail(
    'No Epic client ID is configured. Open the ' +
      '<a href="./">app home page</a>, click <b>Settings</b>, paste your ' +
      'non-production client ID from fhir.epic.com, then relaunch from the EHR.'
  );
} else {
  FHIR.oauth2
    .authorize({
      clientId,
      scope: SMART_SCOPE,
      redirectUri: './',
    })
    .catch((e) => fail('Authorization failed: ' + (e?.message || e)));
}
