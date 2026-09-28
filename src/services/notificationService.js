import { buildNotificationQueue } from './notificationQueue';
export { buildNotificationQueue } from './notificationQueue';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { StorageService } from './storageService';
import { getUpcomingClassDates, getUpcomingTeachingFridays, isClassTime } from '../constants/academicCalendar';
import { localDateKey } from '../utils/dates';

Notifications.setNotificationHandler({
  handleNotification: async notification => ({
    shouldShowBanner: true, shouldShowList: true,
    shouldPlaySound: !!notification.request.content.sound, shouldSetBadge: false,
  }),
});
let queue = Promise.resolve();
async function channels() {
  if (Platform.OS !== 'android') return;
  for (const sound of [true, false]) {
    await Notifications.setNotificationChannelAsync(sound ? 'attendance-sound-v2' : 'attendance-silent-v2', {
      name: sound ? 'Sesli ders hatırlatmaları' : 'Sessiz ders hatırlatmaları',
      importance: Notifications.AndroidImportance.HIGH,
      sound: sound ? 'default' : null,
    });
  }
}

export const NotificationService = {
  async requestPermissions() {
    await channels();
    let permission = await Notifications.getPermissionsAsync();
    if (!permission.granted && permission.canAskAgain) permission = await Notifications.requestPermissionsAsync();
    return permission.granted;
  },
  scheduleAllCourseNotifications() {
    const run = queue.then(async () => {
      const [courses, settings] = await Promise.all([StorageService.getCourses(), StorageService.getSettings()]);
      if (!settings.notificationsEnabled) {
        await Notifications.cancelAllScheduledNotificationsAsync();
        return { status: 'disabled', count: 0 };
      }
      await channels();
      const permission = await Notifications.getPermissionsAsync();
      if (!permission.granted) return { status: 'denied', count: 0 };
      const items = buildNotificationQueue(courses, settings);
      // 59 ders/özet ve gerekiyorsa kuyruğu yenileme hatırlatması.
      const batch = items.slice(0, 59);
      if (items.length > batch.length && batch.length) {
        batch.push({ date: new Date(batch[batch.length - 1].date.getTime() + 60000), content: {
          title: 'Hatırlatmalarını yenile', body: 'Gelecek derslerin bildirimlerini planlamak için DevamTakip’i aç.',
          data: { type: 'RENEW_NOTIFICATIONS' }, sound: false,
        } });
      }
      await Notifications.cancelAllScheduledNotificationsAsync();
      try {
        for (const item of batch) await Notifications.scheduleNotificationAsync({
          content: item.content,
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: item.date,
            channelId: Platform.OS === 'android' ? (settings.soundEnabled ? 'attendance-sound-v2' : 'attendance-silent-v2') : undefined },
        });
      } catch (error) {
        await Notifications.cancelAllScheduledNotificationsAsync();
        throw error;
      }
      return { status: batch.length ? 'scheduled' : 'empty', count: batch.length, through: batch.length ? localDateKey(batch[batch.length - 1].date) : null };
    });
    queue = run.catch(() => {});
    return run;
  },
  async sendInstantTestNotification({ courseName = 'Matematik I', courseCode = 'MAT101', courseId = 'c-1' } = {}) {
    await this.requestPermissions();
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: `🔔 Ders Yoklaması: ${courseName}`,
        body: `${courseName} (${courseCode}) bitti! Derse katıldın mı? Dokun ve kaydet.`,
        data: {
          type: 'ATTENDANCE_CHECK',
          courseId: courseId,
          courseName: courseName,
          courseCode: courseCode,
          hours: 3
        },
        sound: true,
      },
      trigger: null, // Hemen gönder
    });
  },

  /**
   * Cuma özet bildirimini anında test eder
   */
  async sendInstantFridayRecapNotification() {
    await this.requestPermissions();
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: '📊 Cuma Devamsızlık Raporun Hazır!',
        body: 'Bu hafta 1 dersi kaçırdın, toplam devamsızlık riskin güncellendi. İncelemek için dokun.',
        data: {
          type: 'FRIDAY_RECAP'
        },
        sound: true,
      },
      trigger: null, // Hemen gönder
    });
  }
};
