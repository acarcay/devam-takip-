// İzmir Ekonomi Üniversitesi — Ön lisans/Lisans 2026-2027.
// Kaynak: https://www.ieu.edu.tr/tr/akademik-takvim
// Tarihler yerel saatle ve bitiş günleri dahil değerlendirilir.
export const ACADEMIC_YEAR = '2026-2027';

export const TEACHING_PERIODS = [
  { id: 'fall', name: 'Güz Dönemi', start: '2026-09-21', end: '2026-12-31' },
  { id: 'spring', name: 'Bahar Dönemi', start: '2027-02-15', end: '2027-06-04' },
];

// afterMinutes: Bu dakikadan itibaren ders yapılmaz. Yoksa günün tamamı tatildir.
export const NO_CLASS_DAYS = {
  '2026-10-28': { name: 'Cumhuriyet Bayramı arifesi', afterMinutes: 12 * 60 },
  '2026-10-29': { name: 'Cumhuriyet Bayramı' },
  '2027-01-01': { name: 'Yılbaşı' },
  '2027-03-08': { name: 'Ramazan Bayramı arifesi', afterMinutes: 12 * 60 },
  '2027-03-09': { name: 'Ramazan Bayramı' },
  '2027-03-10': { name: 'Ramazan Bayramı' },
  '2027-03-11': { name: 'Ramazan Bayramı' },
  '2027-04-23': { name: 'Ulusal Egemenlik ve Çocuk Bayramı' },
  '2027-05-01': { name: 'Emek ve Dayanışma Günü' },
  '2027-05-15': { name: 'Kurban Bayramı arifesi', afterMinutes: 12 * 60 },
  '2027-05-16': { name: 'Kurban Bayramı' },
  '2027-05-17': { name: 'Kurban Bayramı' },
  '2027-05-18': { name: 'Kurban Bayramı' },
  '2027-05-19': { name: "Kurban Bayramı / Atatürk'ü Anma, Gençlik ve Spor Bayramı" },
};

const dateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const localDate = (value) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const timeToMinutes = (time = '00:00') => {
  const [hour, minute] = time.split(':').map(Number);
  return (hour || 0) * 60 + (minute || 0);
};

export function isTeachingDate(date, periods = TEACHING_PERIODS) {
  const key = dateKey(date);
  return periods.some(period => key >= period.start && key <= period.end);
}

export function isClassTime(date, time, periods = TEACHING_PERIODS) {
  if (!isTeachingDate(date, periods)) return false;
  const exception = NO_CLASS_DAYS[dateKey(date)];
  if (!exception) return true;
  if (exception.afterMinutes === undefined) return false;
  return timeToMinutes(time) < exception.afterMinutes;
}

export function getUpcomingClassDates(weekday, time, from = new Date(), periods = TEACHING_PERIODS) {
  const dates = [];
  if (!periods.length) return [];
  const lastDay = localDate(periods.map(p => p.end).sort().at(-1));
  const horizon = new Date(from); horizon.setFullYear(horizon.getFullYear() + 2);
  if (lastDay > horizon) lastDay.setTime(horizon.getTime());
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= lastDay) {
    if (cursor.getDay() === Number(weekday) && isClassTime(cursor, time, periods)) {
      const [hour, minute] = time.split(':').map(Number);
      const occurrence = new Date(cursor);
      occurrence.setHours(hour, minute, 0, 0);
      if (occurrence > from) dates.push(occurrence);
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

export function getUpcomingTeachingFridays(hour = 17, from = new Date(), periods = TEACHING_PERIODS) {
  return getUpcomingClassDates(5, `${String(hour).padStart(2, '0')}:00`, from, periods);
}
