import { getUpcomingClassDates, getUpcomingTeachingFridays, isClassTime } from '../constants/academicCalendar';
import { localDateKey } from '../utils/dates';

export function buildNotificationQueue(courses, settings, now = new Date()) {
  const items = [];
  const periods = settings.teachingPeriods;
  for (const course of courses) {
    const time = settings.notifyAtEnd ? course.endTime : course.startTime;
    for (const occurrence of getUpcomingClassDates(course.day, time, now, periods)) {
      if (!isClassTime(occurrence, course.startTime, periods)) continue;
      const date = new Date(occurrence.getTime() - (settings.notifyAtEnd ? 0 : settings.notifyMinutesBefore * 60000));
      if (date <= now) continue;
      items.push({ date, content: {
        title: `Ders: ${course.name}`,
        body: settings.notifyAtEnd ? 'Ders tamamlandı. Yoklamanı kaydetmek için dokun.' : 'Dersin yaklaşıyor. Yoklamanı ders sonrasında kaydet.',
        data: { type: 'ATTENDANCE_CHECK', courseId: course.id, lessonDate: localDateKey(occurrence) },
        sound: settings.soundEnabled ? 'default' : false,
      } });
    }
  }
  if (settings.fridayRecapEnabled) {
    for (const date of getUpcomingTeachingFridays(settings.fridayRecapHour, now, periods)) {
      items.push({ date, content: { title: 'Haftalık yoklama özeti', body: 'Haftanın kayıtlarını incelemek için dokun.', data: { type: 'FRIDAY_RECAP', reportDate: localDateKey(date) }, sound: settings.soundEnabled ? 'default' : false } });
    }
  }
  return items.sort((a,b) => a.date - b.date);
}

