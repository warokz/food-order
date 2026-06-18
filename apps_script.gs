/*******************************************************
 * BACKEND GOOGLE SHEETS UNTUK FORM PEMESANAN MAKANAN
 * Versi 7:
 * - Pesanan + rekap admin
 * - Manajemen menu dengan upload icon/foto menu berbasis data URL kecil
 * - QRIS/transfer settings
 * - Upload bukti pembayaran ke sheet PESANAN
 *
 * Cara pakai:
 * 1. Buat Google Spreadsheet baru.
 * 2. Buka Extensions / Ekstensi > Apps Script.
 * 3. Tempel semua kode ini.
 * 4. Ubah ADMIN_KEY sesuai keinginan.
 * 5. Deploy > New deployment > Web app.
 * 6. Execute as: Me.
 * 7. Who has access: Anyone with the link.
 * 8. Salin URL Web App ke index.html, payment.html, dan admin.html.
 *******************************************************/

const SHEET_NAME = 'PESANAN';
const MENU_SHEET_NAME = 'MENU';
const SETTINGS_SHEET_NAME = 'SETTINGS';
const ADMIN_KEY = 'ganti-key-admin'; // Samakan dengan ADMIN_KEY di admin.html
const DEFAULT_STATUS = 'Baru';

const HEADERS = [
  'order_id',
  'timestamp',
  'customer_name',
  'customer_phone',
  'address',
  'delivery_method',
  'payment_method',
  'note',
  'items_json',
  'subtotal',
  'ongkir',
  'total',
  'total_qty',
  'status',
  'payment_status',
  'proof_name',
  'proof_data_url',
  'proof_timestamp'
];

const MENU_HEADERS = [
  'menu_id',
  'name',
  'price',
  'category',
  'icon_data',
  'description',
  'active',
  'updated_at'
];

const SETTINGS_HEADERS = ['key', 'value', 'updated_at'];

const DEFAULT_MENUS = [
  ['banana-original', 'Banana Spring Rolls Original', 10000, 'Snack', '🍌', 'Banana spring rolls renyah dengan rasa original.', true],
  ['banana-keju', 'Banana Spring Rolls Keju', 12000, 'Snack', '🧀', 'Banana spring rolls dengan topping keju gurih.', true],
  ['cheese-spring', 'Cheese Spring Rolls', 13000, 'Snack', '🥐', 'Spring rolls isi keju, cocok untuk camilan.', true],
  ['topping-keju', 'Additional Topping Keju Parut', 2000, 'Topping', '🧀', 'Tambahan topping keju parut.', true],
  ['topping-milo', 'Additional Topping Milo Bubuk', 2000, 'Topping', '🍫', 'Tambahan topping Milo bubuk.', true],
  ['topping-oreo', 'Additional Topping Crumble Oreo', 2000, 'Topping', '🍪', 'Tambahan topping crumble Oreo.', true]
];

const DEFAULT_SETTINGS = {
  shop_name: 'TUNAS RASA',
  whatsapp_admin: '6288211399973',
  bank_name: 'BCA/BRI/Mandiri',
  account_number: '0000000000',
  account_holder: 'TUNAS RASA',
  qris_data: ''
};

function doPost(e) {
  try {
    const p = e.parameter || {};
    if (p.action === 'uploadProof') {
      return json_(uploadProof_(p));
    }

    const sheet = getOrderSheet_();
    const paymentStatus = p.payment_status || (isOnlinePayment_(p.payment_method) ? 'Menunggu Bukti' : 'Tunai');
    const row = [
      p.order_id || makeOrderId_(),
      new Date(),
      p.customer_name || '',
      p.customer_phone || '',
      p.address || '',
      p.delivery_method || '',
      p.payment_method || '',
      p.note || '',
      p.items_json || '[]',
      Number(p.subtotal || 0),
      Number(p.ongkir || 0),
      Number(p.total || 0),
      Number(p.total_qty || 0),
      DEFAULT_STATUS,
      paymentStatus,
      '',
      '',
      ''
    ];
    sheet.appendRow(row);
    return json_({ ok: true, order_id: row[0] });
  } catch (err) {
    return json_({ ok: false, error: err.message });
  }
}

function doGet(e) {
  const p = e.parameter || {};
  const callback = p.callback || '';
  let result;

  try {
    if (p.action === 'ping') {
      result = { ok: true, message: 'Apps Script aktif' };
    } else if (p.action === 'list') {
      checkAdminKey_(p.key);
      result = { ok: true, orders: listOrders_() };
    } else if (p.action === 'updateStatus') {
      checkAdminKey_(p.key);
      result = updateStatus_(p.order_id, p.status);
    } else if (p.action === 'listMenu') {
      const isAdmin = String(p.key || '') === String(ADMIN_KEY);
      const includeInactive = String(p.includeInactive || '') === '1' || String(p.includeInactive || '').toLowerCase() === 'true';
      result = { ok: true, menus: listMenus_(isAdmin && includeInactive) };
    } else if (p.action === 'saveMenu') {
      checkAdminKey_(p.key);
      result = saveMenu_(p);
    } else if (p.action === 'deleteMenu') {
      checkAdminKey_(p.key);
      result = deleteMenu_(p.menu_id);
    } else if (p.action === 'getSettings') {
      result = { ok: true, settings: getSettings_() };
    } else if (p.action === 'saveSettings') {
      checkAdminKey_(p.key);
      result = saveSettings_(p);
    } else {
      result = { ok: false, error: 'Action tidak dikenal' };
    }
  } catch (err) {
    result = { ok: false, error: err.message };
  }

  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(result) + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return json_(result);
}

function getOrderSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  ensureHeaders_(sheet, HEADERS);
  return sheet;
}

function getMenuSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(MENU_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(MENU_SHEET_NAME);

  const wasEmpty = sheet.getLastRow() === 0;
  ensureHeaders_(sheet, MENU_HEADERS);
  if (wasEmpty) {
    DEFAULT_MENUS.forEach(m => {
      sheet.appendRow([m[0], m[1], m[2], m[3], m[4], m[5], m[6], new Date()]);
    });
  }
  return sheet;
}

function getSettingsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SETTINGS_SHEET_NAME);
  ensureHeaders_(sheet, SETTINGS_HEADERS);
  return sheet;
}

function ensureHeaders_(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    return;
  }
  const current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  let changed = false;
  headers.forEach((h, i) => {
    if (current[i] !== h) changed = true;
  });
  if (changed) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
}

function listOrders_() {
  const sheet = getOrderSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  return values.map(row => {
    const obj = {};
    HEADERS.forEach((header, i) => {
      const value = row[i];
      obj[header] = value instanceof Date ? value.toISOString() : value;
    });
    return obj;
  }).reverse();
}

function listMenus_(includeInactive) {
  const sheet = getMenuSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, MENU_HEADERS.length).getValues();
  return values.map(row => rowToMenu_(row)).filter(menu => includeInactive || menu.active);
}

function saveMenu_(p) {
  const sheet = getMenuSheet_();
  const lastRow = sheet.getLastRow();
  const menuId = String(p.menu_id || makeMenuId_(p.name)).trim();
  if (!menuId) throw new Error('ID menu kosong');
  if (!p.name) throw new Error('Nama menu wajib diisi');
  if (Number(p.price) < 0 || isNaN(Number(p.price))) throw new Error('Harga tidak valid');

  const iconData = String(p.icon_data || p.emoji || '').trim();
  if (iconData.length > 45000) throw new Error('Ukuran icon terlalu besar. Gunakan gambar lebih kecil.');

  const row = [
    menuId,
    String(p.name || '').trim(),
    Number(p.price || 0),
    String(p.category || 'Menu').trim(),
    iconData,
    String(p.description || '').trim(),
    toBoolean_(p.active),
    new Date()
  ];

  if (lastRow >= 2) {
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
    const index = ids.findIndex(id => String(id) === menuId);
    if (index !== -1) {
      sheet.getRange(index + 2, 1, 1, MENU_HEADERS.length).setValues([row]);
      return { ok: true, menu: rowToMenu_(row), mode: 'updated' };
    }
  }

  sheet.appendRow(row);
  return { ok: true, menu: rowToMenu_(row), mode: 'created' };
}

function deleteMenu_(menuId) {
  if (!menuId) throw new Error('menu_id kosong');
  const sheet = getMenuSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error('Belum ada menu');

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
  const index = ids.findIndex(id => String(id) === String(menuId));
  if (index === -1) throw new Error('Menu tidak ditemukan');
  sheet.deleteRow(index + 2);
  return { ok: true, menu_id: menuId };
}

function rowToMenu_(row) {
  return {
    menu_id: row[0],
    name: row[1],
    price: Number(row[2] || 0),
    category: row[3],
    icon_data: row[4],
    description: row[5],
    active: toBoolean_(row[6]),
    updated_at: row[7] instanceof Date ? row[7].toISOString() : row[7]
  };
}

function updateStatus_(orderId, status) {
  const allowed = ['Baru', 'Diproses', 'Selesai', 'Batal'];
  if (!orderId) throw new Error('order_id kosong');
  if (!allowed.includes(status)) throw new Error('Status tidak valid');

  const sheet = getOrderSheet_();
  const rowNumber = findOrderRow_(sheet, orderId);
  const statusCol = HEADERS.indexOf('status') + 1;
  sheet.getRange(rowNumber, statusCol).setValue(status);
  return { ok: true, order_id: orderId, status };
}

function uploadProof_(p) {
  if (!p.order_id) throw new Error('order_id kosong');
  const proofData = String(p.proof_data_url || '').trim();
  if (!proofData) throw new Error('Bukti pembayaran kosong');
  if (proofData.length > 45000) throw new Error('Ukuran bukti terlalu besar. Upload screenshot/foto yang lebih kecil.');

  const sheet = getOrderSheet_();
  let rowNumber;
  try {
    rowNumber = findOrderRow_(sheet, p.order_id);
  } catch (err) {
    const row = [
      p.order_id,
      new Date(),
      p.customer_name || '',
      p.customer_phone || '',
      '',
      '',
      p.payment_method || '',
      '',
      '[]',
      0,
      0,
      Number(p.total || 0),
      0,
      DEFAULT_STATUS,
      'Bukti Dikirim',
      p.proof_name || 'bukti pembayaran',
      proofData,
      new Date()
    ];
    sheet.appendRow(row);
    return { ok: true, order_id: p.order_id, mode: 'proof_created' };
  }

  sheet.getRange(rowNumber, HEADERS.indexOf('payment_status') + 1).setValue('Bukti Dikirim');
  sheet.getRange(rowNumber, HEADERS.indexOf('proof_name') + 1).setValue(p.proof_name || 'bukti pembayaran');
  sheet.getRange(rowNumber, HEADERS.indexOf('proof_data_url') + 1).setValue(proofData);
  sheet.getRange(rowNumber, HEADERS.indexOf('proof_timestamp') + 1).setValue(new Date());
  return { ok: true, order_id: p.order_id, mode: 'proof_updated' };
}

function findOrderRow_(sheet, orderId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error('Belum ada pesanan');
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
  const index = ids.findIndex(id => String(id) === String(orderId));
  if (index === -1) throw new Error('Pesanan tidak ditemukan');
  return index + 2;
}

function getSettings_() {
  const sheet = getSettingsSheet_();
  const lastRow = sheet.getLastRow();
  const result = Object.assign({}, DEFAULT_SETTINGS);
  if (lastRow < 2) return result;
  const values = sheet.getRange(2, 1, lastRow - 1, SETTINGS_HEADERS.length).getValues();
  values.forEach(row => {
    if (row[0]) result[String(row[0])] = row[1] || '';
  });
  return result;
}

function saveSettings_(p) {
  const allowed = ['shop_name', 'whatsapp_admin', 'bank_name', 'account_number', 'account_holder', 'qris_data'];
  allowed.forEach(key => {
    const value = String(p[key] || '').trim();
    if (key === 'qris_data' && value.length > 45000) throw new Error('Ukuran QRIS terlalu besar. Gunakan gambar lebih kecil.');
    upsertSetting_(key, value);
  });
  return { ok: true, settings: getSettings_() };
}

function upsertSetting_(key, value) {
  const sheet = getSettingsSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const keys = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
    const index = keys.findIndex(k => String(k) === String(key));
    if (index !== -1) {
      sheet.getRange(index + 2, 2, 1, 2).setValues([[value, new Date()]]);
      return;
    }
  }
  sheet.appendRow([key, value, new Date()]);
}

function checkAdminKey_(key) {
  if (String(key || '') !== String(ADMIN_KEY)) {
    throw new Error('Admin key salah');
  }
}

function isOnlinePayment_(paymentMethod) {
  const text = String(paymentMethod || '').toLowerCase();
  return text.includes('qris') || text.includes('transfer');
}

function makeOrderId_() {
  const tz = Session.getScriptTimeZone() || 'Asia/Jakarta';
  const date = Utilities.formatDate(new Date(), tz, 'yyyyMMdd');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return 'TR-' + date + '-' + rand;
}

function makeMenuId_(name) {
  const base = String(name || 'menu')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'menu';
  const rand = Math.floor(100 + Math.random() * 900);
  return base + '-' + rand;
}

function toBoolean_(value) {
  if (value === true) return true;
  const text = String(value || '').toLowerCase().trim();
  return ['true', '1', 'ya', 'yes', 'aktif', 'active'].includes(text);
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
