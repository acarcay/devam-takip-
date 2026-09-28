import { StorageService } from './storageService';
import { buildNotificationQueue } from './notificationQueue';
import { dispatchNotification } from './notificationEvents';

let timer;
let generation = 0;
function available() { return typeof window !== 'undefined' && 'Notification' in window && window.isSecureContext; }
function display(content, identifier) {
  const notification = new window.Notification(content.title, { body: content.body, tag: identifier, silent: !content.sound });
  notification.onclick = () => { window.focus(); dispatchNotification(content.data, identifier); notification.close(); };
}
export const NotificationService = {
  async requestPermissions() {
    if (!available()) return false;
    return (await window.Notification.requestPermission()) === 'granted';
  },
  async scheduleAllCourseNotifications() {
    const current = ++generation;
    clearInterval(timer);
    const [courses, settings] = await Promise.all([StorageService.getCourses(), StorageService.getSettings()]);
    if (current !== generation) return { status: 'web' };
    if (!settings.notificationsEnabled) return { status: 'disabled', count: 0 };
    if (!available()) return { status: 'unsupported', count: 0 };
    if (window.Notification.permission !== 'granted') return { status: 'denied', count: 0 };
    let queue = buildNotificationQueue(courses, settings);
    timer = setInterval(() => {
      const now = Date.now();
      for (const item of queue.filter(item => item.date.getTime() <= now && now - item.date.getTime() < 5 * 60000)) {
        try { display(item.content, `${item.content.data.courseId || 'recap'}-${item.date.getTime()}`); } catch { /* Tarayıcı desteği değişebilir. */ }
      }
      queue = queue.filter(item => item.date.getTime() > now);
    }, 15000);
    return { status: 'web', count: queue.length };
  },
  async sendInstantTestNotification({ courseId, courseName } = {}) {
    if (!await this.requestPermissions()) throw new Error('Bildirim izni veya tarayıcı desteği yok.');
    display({ title: courseName || 'DevamTakip', body: 'Test bildirimi', data: { type: 'ATTENDANCE_CHECK', courseId } }, String(Date.now()));
  },
  async sendInstantFridayRecapNotification() {
    if (!await this.requestPermissions()) throw new Error('Bildirim izni veya tarayıcı desteği yok.');
    display({ title: 'Haftalık özet', body: 'Raporu aç', data: { type: 'FRIDAY_RECAP' } }, String(Date.now()));
  },
};
