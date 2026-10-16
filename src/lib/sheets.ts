import 'server-only';
import { google } from 'googleapis';

// Giữ nguyên cấu trúc ContactInfo cũ để tương thích với code hiện có.
export const CONTACT_HEADERS = [
  'order_id', 'created_at', 'customer_name', 'customer_phone',
  'customer_address', 'customer_time', 'gift_option', 'sender_name',
  'sender_phone', 'sender_address', 'recipient_name', 'recipient_phone',
  'recipient_address', 'recipient_time', 'card_message', 'customer_note',
];

const CONTACT_TAB = 'ContactInfo';

export const ORDER_HEADERS = [
  'Mã đơn hàng',
  'Ngày đặt hàng',
  'Hình thức nhận',
  'Họ tên người đặt',
  'Số điện thoại người đặt',
  'Địa chỉ người đặt',
  'Thời gian nhận',
  'Tên người gửi',
  'SĐT người gửi',
  'Địa chỉ người gửi',
  'Tên người nhận',
  'SĐT người nhận',
  'Địa chỉ giao hàng',
  'Thời gian giao hàng',
  'Chi tiết sản phẩm',
  'Số lượng',
  'Tạm tính (VNĐ)',
  'Phí dịch vụ quà (VNĐ)',
  'Phí giao hàng (VNĐ)',
  'Tổng thanh toán (VNĐ)',
  'Phương thức thanh toán',
  'Trạng thái thanh toán',
  'Trạng thái đơn hàng',
  'Lời nhắn trên thiệp',
  'Ghi chú của khách',
  'Ảnh xác nhận chuyển khoản',
  'Thời gian tải ảnh chuyển khoản',
] as const;

export type OrderTab = 'Người tự nhận' | 'Người giao hộ';

function getSheets() {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!spreadsheetId || !clientEmail || !privateKey) {
    throw new Error('Google Sheets is not configured');
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return {
    api: google.sheets({ version: 'v4', auth }),
    spreadsheetId,
  };
}

// Chống Google Sheets diễn giải dữ liệu khách nhập thành công thức.
function safeCell(value: string | number | boolean) {
  if (typeof value !== 'string') return value;
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

// Chỉ tạo tab nếu chưa tồn tại. Không xóa, đổi tên hoặc ghi đè dữ liệu cũ.
async function ensureTab(tab: string, headers: readonly string[]) {
  const { api, spreadsheetId } = getSheets();

  const meta = await api.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties.title',
  });

  const exists = (meta.data.sheets || []).some(
    (sheet) => sheet.properties?.title === tab,
  );

  if (!exists) {
    await api.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: tab } } }],
      },
    });
  }

  const lastColumn = headers.length;
  const endColumn = columnLetter(lastColumn);

  const result = await api.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!A1:${endColumn}1`,
  });

  const current = result.data.values?.[0] || [];

  if (current.length === 0) {
    await api.spreadsheets.values.update({
      spreadsheetId,
      range: `${tab}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [[...headers]] },
    });
    return;
  }

  if (
    current.length !== headers.length ||
    current.some((value, index) => String(value) !== headers[index])
  ) {
    throw new Error(
      `Header mismatch in "${tab}". Existing data was not modified. ` +
      'Please check row 1 against ORDER_HEADERS.',
    );
  }
}

function columnLetter(column: number) {
  let result = '';
  let n = column;

  while (n > 0) {
    const remainder = (n - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    n = Math.floor((n - 1) / 26);
  }

  return result;
}

// Giữ hàm cũ để không phá vỡ các nơi khác đang sử dụng.
async function ensureContactSheet() {
  await ensureTab(CONTACT_TAB, CONTACT_HEADERS);
}

export async function appendContactInfo(
  values: (string | number | boolean)[],
) {
  const { api, spreadsheetId } = getSheets();

  await ensureContactSheet();

  await api.spreadsheets.values.append({
    spreadsheetId,
    range: `${CONTACT_TAB}!A:P`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [values.map(safeCell)],
    },
  });
}

// Đồng bộ đơn mới vào một trong hai tab theo hình thức nhận hàng.
export async function appendOrderToSheet(
  tab: OrderTab,
  values: (string | number | boolean)[],
) {
  if (values.length !== ORDER_HEADERS.length) {
    throw new Error(
      `Invalid order row: expected ${ORDER_HEADERS.length} values, received ${values.length}`,
    );
  }

  const { api, spreadsheetId } = getSheets();

  await ensureTab(tab, ORDER_HEADERS);
  // Idempotent resync: never append a second row when the order ID is already present.
  const existing = await api.spreadsheets.values.get({ spreadsheetId, range: `'${tab}'!A2:A` });
  if ((existing.data.values || []).some(row => String(row[0] || '') === String(values[0]))) return;

  await api.spreadsheets.values.append({
    spreadsheetId,
    range: `'${tab}'!A:AA`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [values.map(safeCell)],
    },
  });
}

// Update status cells for an existing order without appending duplicate rows.
export async function updateOrderStatusInSheet(
  tab: OrderTab,
  orderId: string,
  paymentStatus: string,
  orderStatus: string,
) {
  const { api, spreadsheetId } = getSheets();
  await ensureTab(tab, ORDER_HEADERS);
  const result = await api.spreadsheets.values.get({
    spreadsheetId,
    range: `'${tab}'!A2:A`,
  });
  const rows = result.data.values || [];
  const index = rows.findIndex((row) => String(row[0] || '') === orderId);
  if (index < 0) throw new Error(`Order ${orderId} was not found in ${tab}`);
  const rowNumber = index + 2;
  await api.spreadsheets.values.update({
    spreadsheetId,
    range: `'${tab}'!V${rowNumber}:W${rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[safeCell(paymentStatus), safeCell(orderStatus)]] },
  });
}
