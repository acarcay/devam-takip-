export const DAYS = [
  { id: 1, key: 'mon', name: 'Pazartesi', shortName: 'Pzt' },
  { id: 2, key: 'tue', name: 'Salı', shortName: 'Sal' },
  { id: 3, key: 'wed', name: 'Çarşamba', shortName: 'Çar' },
  { id: 4, key: 'thu', name: 'Perşembe', shortName: 'Per' },
  { id: 5, key: 'fri', name: 'Cuma', shortName: 'Cum' },
  { id: 6, key: 'sat', name: 'Cumartesi', shortName: 'Cmt' },
  { id: 0, key: 'sun', name: 'Pazar', shortName: 'Paz' },
];

export const WORK_DAYS = DAYS.slice(0, 5); // Pazartesi - Cuma

export const TIME_SLOTS = [
  '08:30', '09:30', '10:30', '11:30',
  '12:30', '13:30', '14:30', '15:30',
  '16:30', '17:30', '18:30'
];

export function getTodayDayId() {
  return new Date().getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
}

export function getDayName(dayId) {
  const day = DAYS.find(d => d.id === Number(dayId));
  return day ? day.name : '';
}

export function getDayShortName(dayId) {
  const day = DAYS.find(d => d.id === Number(dayId));
  return day ? day.shortName : '';
}
