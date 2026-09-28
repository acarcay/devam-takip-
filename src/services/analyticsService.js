import { localDateKey } from '../utils/dates';
import { COLORS } from '../constants/theme';
import { DAYS } from '../constants/days';

export const AnalyticsService = {
  /**
   * Belirli bir dersin devamsızlık ve risk analizini hesaplar
   */
  calculateCourseStats(course, logs = [], settings = {}) {
    const courseLogs = logs.filter(l => l.courseId === course.id);
    
    // Toplam ders saatleri
    const missedHours = courseLogs
      .filter(l => l.status === 'missed')
      .reduce((sum, l) => sum + (Number(l.hours) || 1), 0);
      
    const attendedHours = courseLogs
      .filter(l => l.status === 'attended')
      .reduce((sum, l) => sum + (Number(l.hours) || 1), 0);

    const excusedHours = courseLogs
      .filter(l => l.status === 'excused')
      .reduce((sum, l) => sum + (Number(l.hours) || 1), 0);

    const maxAbsence = Number(course.maxAbsenceHours ?? 12);
    const remainingAbsenceHours = Math.max(0, maxAbsence - missedHours);
    
    // Kalan ders hakkı (Haftalık ders saati bazında, örn 3 saatlik derste 6 saat kaldıysa 2 hafta)
    const weeklyHours = Number(course.totalHoursWeekly) || 3;
    const remainingWeeks = (remainingAbsenceHours / weeklyHours).toFixed(1);

    // Kullanılan devamsızlık yüzdesi
    const absenceUsagePercent = Math.min(100, (maxAbsence === 0 ? (missedHours > 0 ? 100 : 0) : Math.round((missedHours / maxAbsence) * 100)));

    // Risk seviyesi
    let riskLevel = 'SAFE'; // SAFE, WARNING, DANGER, FAILED
    let riskColor = COLORS.success;
    let riskBg = COLORS.successBg;
    let riskText = COLORS.successText;
    let statusMessage = 'Devam durumu güvenli';

    if (missedHours > maxAbsence) {
      riskLevel = 'FAILED';
      riskColor = COLORS.danger;
      riskBg = COLORS.dangerBg;
      riskText = COLORS.dangerText;
      statusMessage = 'Belirlediğin devamsızlık sınırı aşıldı.';
    } else if (remainingAbsenceHours <= weeklyHours) {
      riskLevel = 'DANGER';
      riskColor = COLORS.danger;
      riskBg = COLORS.dangerBg;
      riskText = COLORS.dangerText;
      statusMessage = `Kritik sınır! Sadece ${remainingAbsenceHours} saat devamsızlık hakkın kaldı!`;
    } else if (absenceUsagePercent >= (settings.thresholdWarningPercent ?? 70)) {
      riskLevel = 'WARNING';
      riskColor = COLORS.warning;
      riskBg = COLORS.warningBg;
      riskText = COLORS.warningText;
      statusMessage = `Dikkat! Sınıra yaklaşıyorsun (${remainingWeeks} hafta kaldı)`;
    } else {
      statusMessage = `Güvenli (${remainingWeeks} hafta hakkın var)`;
    }

    return {
      courseId: course.id,
      courseName: course.name,
      courseCode: course.code,
      color: course.color,
      totalLogs: courseLogs.length,
      missedHours,
      attendedHours,
      excusedHours,
      maxAbsence,
      remainingAbsenceHours,
      remainingWeeks,
      absenceUsagePercent,
      riskLevel,
      riskColor,
      riskBg,
      riskText,
      statusMessage
    };
  },

  /**
   * Tüm derslerin genel durum özeti
   */
  calculateOverview(courses = [], logs = [], settings = {}) {
    const courseStats = courses.map(c => this.calculateCourseStats(c, logs, settings));
    
    const totalMissed = courseStats.reduce((sum, s) => sum + s.missedHours, 0);
    const totalAttended = courseStats.reduce((sum, s) => sum + s.attendedHours, 0);
    const criticalCoursesCount = courseStats.filter(s => s.riskLevel === 'WARNING' || s.riskLevel === 'DANGER').length;
    const failedCoursesCount = courseStats.filter(s => s.riskLevel === 'FAILED').length;

    const totalRecorded = totalMissed + totalAttended;
    const overallAttendanceRate = totalRecorded > 0 ? Math.round((totalAttended / totalRecorded) * 100) : 100;

    return {
      totalCourses: courses.length,
      courseStats,
      totalMissed,
      totalAttended,
      criticalCoursesCount,
      failedCoursesCount,
      overallAttendanceRate
    };
  },

  /**
   * Cuma Haftalık Karnesi: Bu hafta içinde olanlar
   */
  calculateWeeklyRecap(courses = [], logs = [], now = new Date()) {
    // Bu haftanın Pazartesi gününü bul
    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    const mondayStr = localDateKey(monday);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    const endStr = localDateKey(sunday);
    const today = localDateKey(now);

    // Bu haftaki loglar
    const thisWeekLogs = logs.filter(l => l.date >= mondayStr && l.date <= endStr && l.date <= today);
    
    const attendedThisWeek = [];
    const missedThisWeek = [];

    for (const log of thisWeekLogs) {
      const course = courses.find(c => c.id === log.courseId);
      if (!course) continue;

      if (log.status === 'attended') {
        attendedThisWeek.push({ ...log, course });
      } else if (log.status === 'missed') {
        missedThisWeek.push({ ...log, course });
      }
    }

    const totalWeek = attendedThisWeek.length + missedThisWeek.length;
    const weekRate = totalWeek > 0 ? Math.round((attendedThisWeek.length / totalWeek) * 100) : 100;

    return {
      startDate: mondayStr,
      attendedCount: attendedThisWeek.length,
      missedCount: missedThisWeek.length,
      attendedList: attendedThisWeek,
      missedList: missedThisWeek,
      weekRate,
      hasMissed: missedThisWeek.length > 0
    };
  }
};
