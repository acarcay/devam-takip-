export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseLocalDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Tarih YYYY-AA-GG biçiminde olmalı.');
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  if (localDateKey(date) !== value) throw new Error('Geçerli bir tarih girin.');
  return date;
}

export function timeMinutes(value) {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('Saat HH:DD biçiminde olmalı (ör. 09:30).');
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}
