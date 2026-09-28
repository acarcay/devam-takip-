const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
process.env.TZ = 'Europe/Istanbul';
function harness(seed = {}) {
  const data = { ...seed }, cache = new Map(), calls = [];
  let fail = false;
  const storage = { getItem: async k => data[k] ?? null, setItem: async (k,v) => { if (fail) throw new Error('disk full'); data[k] = v; } };
  const notifications = { setNotificationHandler() {}, getPermissionsAsync: async () => ({ granted: true }), setNotificationChannelAsync: async () => {}, cancelAllScheduledNotificationsAsync: async () => { calls.length = 0; }, scheduleNotificationAsync: async n => calls.push(n), AndroidImportance: { HIGH: 4 }, SchedulableTriggerInputTypes: { DATE: 'date' } };
  function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} }; cache.set(file, mod);
    const code = babel.transformSync(fs.readFileSync(file, 'utf8'), { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
    const req = name => name === '@react-native-async-storage/async-storage' ? storage : name === 'react-native' ? { Platform: { OS: 'android' } } : name === 'expo-notifications' ? notifications : load(path.resolve(path.dirname(file), name + '.js'));
    vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(req, mod, mod.exports);
    return mod.exports;
  }
  return { load, data, calls, storage, fail: value => { fail = value; } };
}
const course = { name: 'Matematik', code: 'MAT101', day: 1, startTime: '09:00', endTime: '11:50', totalHoursWeekly: 3, maxAbsenceHours: 12 };

test('fresh install is empty; migration preserves existing records', async () => {
  let h = harness(); let s = h.load('src/services/storageService.js').StorageService;
  await s.init(); assert.equal((await s.getCourses()).length, 0); assert.equal((await s.getAttendanceLogs()).length, 0);
  h = harness({ '@devam_takip_courses_v1': JSON.stringify([{ ...course, id: 'old' }]) });
  s = h.load('src/services/storageService.js').StorageService; await s.init(); assert.equal((await s.getCourses())[0].id, 'old');
});
test('failed writes reject without losing stored data', async () => {
  const h = harness(), s = h.load('src/services/storageService.js').StorageService;
  const c = await s.addCourse(course); h.fail(true);
  await assert.rejects(s.logAttendance({ courseId: c.id, date: '2026-09-21', status: 'missed', hours: 3 }), /disk full/);
  assert.equal((await s.getAttendanceLogs()).length, 0);
  await assert.rejects(s.deleteCourse(c.id)); assert.equal((await s.getCourses()).length, 1);
});
test('concurrent changes serialize; no lost courses', async () => {
  const h = harness(), s = h.load('src/services/storageService.js').StorageService;
  await Promise.all([s.addCourse(course), s.addCourse({ ...course, day: 2 })]);
  assert.equal((await s.getCourses()).length, 2);
});
test('invalid course inputs reject; zero absence limit is supported', () => {
  const { validateCourse } = harness().load('src/services/storageService.js');
  for (const patch of [{ startTime: 'abc' }, { endTime: '08:00' }, { day: 7 }, { totalHoursWeekly: -1 }, { maxAbsenceHours: -1 }]) assert.throws(() => validateCourse({ ...course, ...patch }));
  assert.doesNotThrow(() => validateCourse({ ...course, maxAbsenceHours: 0 }));
});
test('imports validate whole batch and reject duplicates without partial saves', async () => {
  const s = harness().load('src/services/storageService.js').StorageService;
  await assert.rejects(s.importCourses([course, course])); assert.equal((await s.getCourses()).length, 0);
  await s.importCourses([course]); await assert.rejects(s.importCourses([course])); assert.equal((await s.getCourses()).length, 1);
});
test('malformed backup cannot overwrite state; valid import can be undone', async () => {
  const s = harness().load('src/services/storageService.js').StorageService;
  await s.addCourse(course); const original = await s.exportAllData();
  await assert.rejects(s.importAllData('{"version":2,"courses":[]}'));
  assert.equal((await s.getCourses()).length, 1);
  const empty = JSON.parse(original); empty.courses = []; await s.importAllData(JSON.stringify(empty)); assert.equal((await s.getCourses()).length, 0);
  await s.restoreBeforeImport(); assert.equal((await s.getCourses()).length, 1);
});
test('partial attendance cannot exceed class hours; future records rejected', async () => {
  const s = harness().load('src/services/storageService.js').StorageService, c = await s.addCourse(course);
  await s.logAttendance({ courseId: c.id, date: '2026-09-21', status: 'attended', hours: 2 });
  await s.logAttendance({ courseId: c.id, date: '2026-09-21', status: 'missed', hours: 1 });
  await assert.rejects(s.logAttendance({ courseId: c.id, date: '2026-09-21', status: 'missed', hours: 2 }));
  await assert.rejects(s.logAttendance({ courseId: c.id, date: '2099-09-21', status: 'missed', hours: 1 }));
  assert.equal((await s.getAttendanceLogs()).length, 2);
});
test('local midnight and semester week boundaries', () => {
  const h = harness(), { localDateKey, parseLocalDate } = h.load('src/utils/dates.js'), { getSemesterWeekNumber } = h.load('src/services/storageService.js');
  assert.equal(localDateKey(new Date('2026-09-28T00:30:00+03:00')), '2026-09-28');
  assert.throws(() => parseLocalDate('2026-02-30'));
  assert.equal(getSemesterWeekNumber('2026-09-21'), 1); assert.equal(getSemesterWeekNumber('2027-02-15'), 1); assert.equal(getSemesterWeekNumber('2027-01-15'), null);
});
test('weekly report excludes previous Sunday and future records', () => {
  const a = harness().load('src/services/analyticsService.js').AnalyticsService;
  const logs = ['2026-09-20','2026-09-21','2026-09-28','2099-01-01'].map(date => ({ courseId: 'c', date, status: 'missed', hours: 1 }));
  const r = a.calculateWeeklyRecap([{ ...course, id: 'c' }], logs, new Date('2026-09-27T15:00:00+03:00'));
  assert.equal(r.startDate, '2026-09-21'); assert.equal(r.missedCount, 1);
});
test('risk uses configured threshold and supports zero limit', () => {
  const a = harness().load('src/services/analyticsService.js').AnalyticsService;
  const logs = [{ courseId: 'c', status: 'missed', hours: 6 }];
  assert.equal(a.calculateCourseStats({ ...course, id: 'c' }, logs, { thresholdWarningPercent: 50 }).riskLevel, 'WARNING');
  assert.equal(a.calculateCourseStats({ ...course, id: 'c', maxAbsenceHours: 0 }, logs).riskLevel, 'FAILED');
});
test('OCR preserves separated sessions, merges adjacent blocks and reads inline day', () => {
  const o = harness().load('src/services/ocrService.js').OCRService;
  let result = o.parseTimetableText('Pazartesi\nMAT101 Matematik 09:00 - 09:45\nMAT101 Matematik 15:00 - 15:45'); assert.equal(result.length, 2);
  result = o.parseTimetableText('MAT101 Matematik Salı 09:00 - 11:50'); assert.equal(result[0].day, 2); assert.equal(result[0].totalHoursWeekly, 3);
  result = o.parseTimetableText('MAT101 Matematik 09:00 - 09:45\nMAT101 Matematik 09:55 - 10:40'); assert.equal(result.length, 1); assert.equal(result[0].totalHoursWeekly, 2);
});
test('notification dates retain lesson date and subtract configured lead', () => {
  const h = harness(), { DEFAULT_SETTINGS } = h.load('src/services/storageService.js'), { buildNotificationQueue } = h.load('src/services/notificationService.js');
  const items = buildNotificationQueue([{ ...course, id: 'c' }], { ...DEFAULT_SETTINGS, notifyAtEnd: false, notifyMinutesBefore: 15, fridayRecapEnabled: false }, new Date('2026-09-21T07:00:00+03:00'));
  assert.equal(items[0].date.getHours(), 8); assert.equal(items[0].date.getMinutes(), 45); assert.equal(items[0].content.data.lessonDate, '2026-09-21');
});
test('calendar skips holidays and accepts a later custom period', () => {
  const { getUpcomingClassDates } = harness().load('src/constants/academicCalendar.js');
  const dates = getUpcomingClassDates(4, '09:00', new Date('2026-10-28T00:00:00+03:00'));
  assert.notEqual(dates[0].getDate(), 29);
  assert.ok(getUpcomingClassDates(1, '09:00', new Date('2028-01-01T00:00:00+03:00'), [{ start: '2028-01-01', end: '2028-02-01' }]).length > 0);
});

test('native scheduling caps pending notifications and adds renewal reminder', async () => {
  const h = harness(), s = h.load('src/services/storageService.js').StorageService;
  const prefs = await s.getSettings();
  await s.saveSettings({ ...prefs, notificationsEnabled: true, teachingPeriods: [{ start: '2026-01-01', end: '2026-12-31' }, { start: '2027-01-01', end: '2027-12-31' }] });
  for (let day = 0; day < 7; day++) await s.addCourse({ ...course, day });
  const n = h.load('src/services/notificationService.js').NotificationService;
  const result = await n.scheduleAllCourseNotifications();
  assert.equal(result.count, 60); assert.equal(h.calls.length, 60);
  assert.equal(h.calls.at(-1).content.data.type, 'RENEW_NOTIFICATIONS');
  await s.saveSettings({ notificationsEnabled: false });
  assert.equal((await n.scheduleAllCourseNotifications()).status, 'disabled'); assert.equal(h.calls.length, 0);
});
test('settings reject invalid hour, threshold and overlapping periods', async () => {
  const s = harness().load('src/services/storageService.js').StorageService;
  for (const patch of [{ fridayRecapHour: 24 }, { thresholdWarningPercent: 0 }, { teachingPeriods: [{ start: '2026-09-21', end: '2026-09-01' }] }]) await assert.rejects(s.saveSettings(patch));
  assert.equal((await s.getSettings()).fridayRecapHour, 17);
});
test('corrupt existing snapshot is not overwritten on load', async () => {
  const h = harness({ '@devam_takip_state_v2': '{broken' });
  await assert.rejects(h.load('src/services/storageService.js').StorageService.init());
  assert.equal(h.data['@devam_takip_state_v2'], '{broken');
});
