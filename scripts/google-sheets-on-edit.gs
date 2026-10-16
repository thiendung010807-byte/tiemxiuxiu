/**
 * Two-way status sync: Google Sheets -> Tiệm Xíu Xiu API -> Firestore.
 * Set WEB_APP_URL to https://YOUR_DOMAIN/api/sheets/webhook
 * Set SHARED_SECRET to the same value as Vercel SHEETS_WEBHOOK_SECRET.
 * Install an on-edit trigger for onEditOrderStatus from Apps Script Triggers.
 */
const WEB_APP_URL = 'https://YOUR_DOMAIN/api/sheets/webhook';
const SHARED_SECRET = 'REPLACE_WITH_SHEETS_WEBHOOK_SECRET';
const ALLOWED_TABS = ['Người tự nhận', 'Người giao hộ'];
const PAYMENT = ['pending_confirmation', 'paid', 'rejected'];
const ORDER = ['new', 'preparing', 'ready_for_pickup', 'delivered', 'cancelled'];

function onEditOrderStatus(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  const tab = sheet.getName();
  if (!ALLOWED_TABS.includes(tab) || e.range.getRow() < 2) return;
  // Only react to columns V (payment status) or W (order status).
  const col = e.range.getColumn();
  if (col !== 22 && col !== 23) return;
  const row = e.range.getRow();
  const values = sheet.getRange(row, 1, 1, 23).getValues()[0];
  const orderId = String(values[0] || '').trim();
  const paymentStatus = String(values[21] || '').trim();
  const orderStatus = String(values[22] || '').trim();
  if (!orderId || !PAYMENT.includes(paymentStatus) || !ORDER.includes(orderStatus)) {
    throw new Error('Mã đơn hoặc trạng thái không hợp lệ. Dùng các giá trị trạng thái hệ thống.');
  }
  const response = UrlFetchApp.fetch(WEB_APP_URL, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'x-sheets-secret': SHARED_SECRET },
    payload: JSON.stringify({ orderId, paymentStatus, orderStatus, tab })
  });
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
    throw new Error('Không đồng bộ được đơn ' + orderId + ': ' + response.getContentText());
  }
}
