import 'server-only';
import { google } from 'googleapis';

// Google Sheets is intentionally a small contact/fulfilment export, not the order database.
export const CONTACT_HEADERS = [
  'order_id', 'created_at', 'customer_name', 'customer_phone', 'customer_address', 'customer_time',
  'gift_option', 'sender_name', 'sender_phone', 'sender_address', 'recipient_name', 'recipient_phone',
  'recipient_address', 'recipient_time', 'card_message', 'customer_note'
];
const TAB = 'ContactInfo';

function getSheets() {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!spreadsheetId || !clientEmail || !privateKey) throw new Error('Google Sheets is not configured');
  const auth = new google.auth.JWT({ email: clientEmail, key: privateKey, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  return { api: google.sheets({ version: 'v4', auth }), spreadsheetId };
}

async function ensureContactSheet() {
  const { api, spreadsheetId } = getSheets();
  const meta = await api.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties.title' });
  const exists = (meta.data.sheets || []).some(sheet => sheet.properties?.title === TAB);
  if (!exists) {
    await api.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] } });
  }
  const result = await api.spreadsheets.values.get({ spreadsheetId, range: `${TAB}!A1:P1` });
  const current = result.data.values?.[0] || [];
  if (current.length === 0) {
    await api.spreadsheets.values.update({ spreadsheetId, range: `${TAB}!A1`, valueInputOption: 'RAW', requestBody: { values: [CONTACT_HEADERS] } });
  } else if (current.join('|') !== CONTACT_HEADERS.join('|')) {
    throw new Error(`${TAB} header mismatch. Existing sheet left unchanged; align row 1 to CONTACT_HEADERS.`);
  }
}

export async function appendContactInfo(values: (string | number | boolean)[]) {
  const { api, spreadsheetId } = getSheets();
  await ensureContactSheet();
  await api.spreadsheets.values.append({ spreadsheetId, range: `${TAB}!A:P`, valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS', requestBody: { values: [values] } });
}
