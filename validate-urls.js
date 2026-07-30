const { URLSearchParams } = require('url');

// --- OAuth Validation ---
const EBAY_AUTH_URL = 'https://auth.ebay.com/oauth2/authorize'; // or sandbox equivalent
const EBAY_APP_ID = 'REDACTED_CLIENT_ID';
const EBAY_RUNAME = 'REDACTED_REDIRECT_URI';
const EBAY_SCOPES = 'https://api.ebay.com/oauth/api_scope/sell.finances https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly';
const state = 'REDACTED_STATE_NONCE';

const params = new URLSearchParams({
  client_id:     EBAY_APP_ID,
  redirect_uri:  EBAY_RUNAME,
  response_type: 'code',
  scope:         EBAY_SCOPES,
  state,
  prompt:        'login',
});

const authUrl = `${EBAY_AUTH_URL}?${params.toString()}`;
console.log('--- OAuth Validation ---');
console.log('Generated OAuth URL:');
console.log(authUrl);
console.log('Query Parameters:');
for (const [key, val] of params.entries()) {
  console.log(`  ${key}: ${val}`);
}

// --- Fulfillment API Validation ---
const EBAY_FULFILLMENT_URL = 'https://api.ebay.com/sell/fulfillment/v1/order';
const limit = 50;
const offset = 0;
const daysBack = 30;

const nowDate      = new Date('2026-07-31T01:55:39.123Z'); // Fixed date for consistency
const sinceDate    = new Date(nowDate.getTime() - daysBack * 24 * 60 * 60 * 1000);
const sinceDateISO = sinceDate.toISOString();
const nowDateISO   = nowDate.toISOString();
const dateFilter   = `lastmodifieddate:[${sinceDateISO}..${nowDateISO}]`;

console.log('\n--- Fulfillment API Validation ---');
console.log('Raw filter value:');
console.log(dateFilter);

const baseParams = new URLSearchParams({ limit, offset });
let apiUrl = `${EBAY_FULFILLMENT_URL}?${baseParams.toString()}`;
if (dateFilter) {
  apiUrl += `&filter=${encodeURI(dateFilter)}`;
}

console.log('Generated Fulfillment API URL:');
console.log(apiUrl);
