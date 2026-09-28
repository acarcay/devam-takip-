import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/theme';
import { TEACHING_PERIODS } from '../constants/academicCalendar';
import { localDateKey, parseLocalDate, timeMinutes } from '../utils/dates';

const KEY = '@devam_takip_state_v2';
export const DEFAULT_SETTINGS = {
  notificationsEnabled: false, notifyAtEnd: true, notifyMinutesBefore: 5,
  fridayRecapEnabled: true, fridayRecapHour: 17, soundEnabled: true,
  thresholdWarningPercent: 70, teachingPeriods: TEACHING_PERIODS,
};
const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
let queue = Promise.resolve();
const serialized = (action) => {
  const next = queue.then(action);
  queue = next.catch(() => {});
  return next;
};

export function validateCourse(course) {
  if (!course || typeof course.name !== 'string' || !course.name.trim() || typeof course.code !== 'string' || !course.code.trim()) throw new Error('Ders adı ve kodu gerekli.');
  if (!Number.isInteger(course.day) || course.day < 0 || course.day > 6) throw new Error('Geçerli bir ders günü seçin.');
  if (timeMinutes(course.endTime) <= timeMinutes(course.startTime)) throw new Error('Bitiş saati başlangıçtan sonra olmalı.');
  if (!Number.isFinite(course.totalHoursWeekly) || course.totalHoursWeekly <= 0 || course.totalHoursWeekly > 24) throw new Error('Ders saati 0 ile 24 arasında olmalı.');
  if (!Number.isFinite(course.maxAbsenceHours) || course.maxAbsenceHours < 0 || course.maxAbsenceHours > 1000) throw new Error('Devamsızlık sınırı 0–1000 saat arasında olmalı.');
  return course;
}

export function checkScheduleConflict(courses, candidate, excludeId = null) {
  const start = timeMinutes(candidate.startTime), end = timeMinutes(candidate.endTime);
  const conflictingCourse = courses.find(c => c.id !== excludeId && Number(c.day) === Number(candidate.day) && start < timeMinutes(c.endTime) && end > timeMinutes(c.startTime));
  return { hasConflict: !!conflictingCourse, conflictingCourse };
}

export function getSemesterWeekNumber(date, start, periods = TEACHING_PERIODS) {
  parseLocalDate(date);
  const period = periods.find(p => date >= p.start && date <= p.end);
  const beginning = start || period?.start;
  if (!beginning) return null;
  parseLocalDate(beginning);
  return Math.max(1, Math.floor((Date.parse(date) - Date.parse(beginning)) / 604800000) + 1);
}

export function validateSettings(settings) {
  for (const key of ['notificationsEnabled', 'notifyAtEnd', 'fridayRecapEnabled', 'soundEnabled']) {
    if (typeof settings[key] !== 'boolean') throw new Error('Bildirim ayarları geçersiz.');
  }
  for (const [key, min, max] of [['notifyMinutesBefore', 0, 120], ['fridayRecapHour', 0, 23], ['thresholdWarningPercent', 1, 100]]) {
    if (!Number.isInteger(settings[key]) || settings[key] < min || settings[key] > max) throw new Error('Bildirim saati veya risk eşiği geçersiz.');
  }
  if (!Array.isArray(settings.teachingPeriods) || !settings.teachingPeriods.length || settings.teachingPeriods.length > 10) throw new Error('En az bir dönem tanımlayın.');
  const sorted = [...settings.teachingPeriods].sort((a,b) => a.start.localeCompare(b.start));
  sorted.forEach((p,i) => {
    parseLocalDate(p.start); parseLocalDate(p.end);
    if (p.start > p.end || Date.parse(p.end) - Date.parse(p.start) > 366 * 86400000 || (i > 0 && sorted[i-1].end >= p.start)) throw new Error('Dönem tarihleri geçersiz veya çakışıyor.');
  });
  return settings;
}

function validateState(state) {
  if (!state || !Array.isArray(state.courses) || !Array.isArray(state.attendanceLogs)) throw new Error('Yedek biçimi geçersiz.');
  const ids = new Set();
  state.courses.forEach(c => {
    validateCourse(c);
    if (typeof c.id !== 'string' || !c.id || ids.has(c.id)) throw new Error('Ders kimlikleri geçersiz veya tekrarlanıyor.');
    ids.add(c.id);
  });
  const logIds = new Set();
  state.attendanceLogs.forEach(l => {
    if (!l || typeof l.id !== 'string' || logIds.has(l.id) || !ids.has(l.courseId) || !['attended','missed','excused'].includes(l.status) || !Number.isFinite(l.hours) || l.hours <= 0 || l.hours > 24 || (l.note !== undefined && typeof l.note !== 'string')) throw new Error('Yoklama kaydı geçersiz.');
    parseLocalDate(l.date); logIds.add(l.id);
  });
  validateSettings(state.settings);
  return state;
}

async function read() {
  const raw = await AsyncStorage.getItem(KEY);
  if (raw) return validateState(JSON.parse(raw));
  // Eski kayıtları silmeden, tek yazımlı depoya geçir. Örnek kayıtlar da kullanıcı onayı olmadan silinmez.
  const values = await Promise.all(['courses','logs','settings'].map(k => AsyncStorage.getItem(`@devam_takip_${k}_v1`)));
  const state = validateState({ version: 2, courses: values[0] ? JSON.parse(values[0]) : [], attendanceLogs: values[1] ? JSON.parse(values[1]) : [], settings: { ...DEFAULT_SETTINGS, ...(values[2] ? JSON.parse(values[2]) : {}) } });
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
  return state;
}
const mutate = (change) => serialized(async () => {
  const state = await read();
  const result = change(state);
  validateState(state);
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
  return result;
});

export const StorageService = {
  init: () => serialized(read),
  async getCourses() { await queue; return (await read()).courses; },
  async getAttendanceLogs() { await queue; return (await read()).attendanceLogs; },
  async getSettings() { await queue; return (await read()).settings; },
  saveCourses: courses => mutate(s => { s.courses = courses; }),
  addCourse: course => mutate(s => {
    validateCourse(course);
    const conflict = checkScheduleConflict(s.courses, course);
    if (conflict.hasConflict) throw new Error(`${conflict.conflictingCourse.name} ile saat çakışması var.`);
    const c = { ...course, id: newId(), color: course.color || COLORS.courseColors[s.courses.length % COLORS.courseColors.length] };
    s.courses.push(c); return c;
  }),
  updateCourse: course => mutate(s => {
    validateCourse(course);
    const index = s.courses.findIndex(c => c.id === course.id);
    if (index < 0) throw new Error('Ders bulunamadı.');
    const conflict = checkScheduleConflict(s.courses, course, course.id);
    if (conflict.hasConflict) throw new Error(`${conflict.conflictingCourse.name} ile saat çakışması var.`);
    s.courses[index] = { ...s.courses[index], ...course };
  }),
  importCourses: courses => mutate(s => {
    if (!Array.isArray(courses) || !courses.length) throw new Error('Ders seçin.');
    for (const course of courses) {
      validateCourse(course);
      if (checkScheduleConflict(s.courses, course).hasConflict) throw new Error(`${course.code}: Programda tekrar veya saat çakışması var. Hiçbir ders aktarılmadı.`);
      const { selected, ...clean } = course;
      s.courses.push({ ...clean, id: newId(), color: course.color || COLORS.courseColors[s.courses.length % COLORS.courseColors.length] });
    }
  }),
  deleteCourse: id => mutate(s => { s.courses = s.courses.filter(c => c.id !== id); s.attendanceLogs = s.attendanceLogs.filter(l => l.courseId !== id); }),
  logAttendance: ({ courseId, date, status, hours, note = '' }) => mutate(s => {
    parseLocalDate(date);
    if (date > localDateKey()) throw new Error('Gelecek tarihli yoklama kaydedilemez.');
    const course = s.courses.find(c => c.id === courseId);
    if (!course) throw new Error('Ders bulunamadı.');
    const amount = Number(hours);
    if (!Number.isFinite(amount) || amount <= 0 || amount > course.totalHoursWeekly) throw new Error('Yoklama saati ders süresini aşamaz ve sıfırdan büyük olmalı.');
    // Aynı gün farklı durumlar kısmi katılımı destekler; aynı durum tekrar kaydedilirse güncellenir.
    const existing = s.attendanceLogs.find(l => l.courseId === courseId && l.date === date && l.status === status);
    const others = s.attendanceLogs.filter(l => l.courseId === courseId && l.date === date && l.id !== existing?.id);
    if (others.reduce((sum,l) => sum + l.hours, 0) + amount > course.totalHoursWeekly) throw new Error('Bu günün toplam yoklama saati ders süresini aşıyor. Önce geçmişteki kaydı silin veya saatleri düzeltin.');
    const record = { id: existing?.id || newId(), courseId, date, status, hours: amount, note, dayOfWeek: parseLocalDate(date).getDay(), weekNumber: getSemesterWeekNumber(date, undefined, s.settings.teachingPeriods), timestamp: new Date().toISOString() };
    s.attendanceLogs = [record, ...s.attendanceLogs.filter(l => l.id !== record.id)];
    return record;
  }),
  deleteLog: id => mutate(s => { s.attendanceLogs = s.attendanceLogs.filter(l => l.id !== id); }),
  saveSettings: settings => mutate(s => { s.settings = validateSettings({ ...s.settings, ...settings }); }),
  async exportAllData() { await queue; return JSON.stringify({ ...await read(), exportDate: new Date().toISOString() }, null, 2); },
  importAllData: json => serialized(async () => {
    if (json.length > 5 * 1024 * 1024) throw new Error('Yedek en fazla 5 MB olabilir.');
    const data = JSON.parse(json);
    if (![1,2].includes(data.version)) throw new Error('Yedek sürümü desteklenmiyor.');
    const state = validateState({ ...data, version: 2, settings: { ...DEFAULT_SETTINGS, ...data.settings } });
    // Geçerli mevcut veriyi geri dönüş için sakla; doğrulama tamamlanmadan hiçbir yazım yapılmaz.
    const previous = await read();
    await AsyncStorage.setItem(`${KEY}_before_import`, JSON.stringify(previous));
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  }),
  restoreBeforeImport: () => serialized(async () => {
    const raw = await AsyncStorage.getItem(`${KEY}_before_import`);
    if (!raw) throw new Error('Geri alınabilecek aktarım yok.');
    await AsyncStorage.setItem(KEY, JSON.stringify(validateState(JSON.parse(raw))));
  }),
  resetToDefaults: () => mutate(s => { s.courses = []; s.attendanceLogs = []; s.settings = { ...DEFAULT_SETTINGS }; }),
};
