// src/utils/phone.js
function normalizePhone(phone) {
  if (!phone) return phone;
  phone = phone.trim().replace(/\s+/g, '').replace(/-/g, '');
  if (phone.startsWith('07') || phone.startsWith('03')) {
    return '+256' + phone.slice(1);
  }
  if (phone.startsWith('256')) {
    return '+' + phone;
  }
  if (phone.startsWith('+256')) {
    return phone;
  }
  return phone;
}

module.exports = { normalizePhone };
