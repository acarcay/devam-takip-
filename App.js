import ErrorBoundary from './src/components/ErrorBoundary';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Alert } from './src/utils/alert';
import SettingsPanel from './src/components/SettingsPanel';
import { localDateKey, parseLocalDate } from './src/utils/dates';
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Platform, AppState, ActivityIndicator, Button
} from 'react-native';
import * as Notifications from './src/services/notificationEvents';
import Ionicons from '@expo/vector-icons/Ionicons';

import { COLORS, SHADOWS } from './src/constants/theme';
import { DAYS, getTodayDayId, getDayName } from './src/constants/days';
import { StorageService } from './src/services/storageService';
import { NotificationService } from './src/services/notificationService';
import { AnalyticsService } from './src/services/analyticsService';

// Components & Modals
import AttendanceModal from './src/components/AttendanceModal';
import CourseCard from './src/components/CourseCard';
import CourseDetailModal from './src/components/CourseDetailModal';
import TimetableGrid from './src/components/TimetableGrid';
import AddCourseModal from './src/components/AddCourseModal';
import OCRScanModal from './src/components/OCRScanModal';
import WeeklyReportModal from './src/components/WeeklyReportModal';
import SimulatorModal from './src/components/SimulatorModal';

function AppContent() {
  const [activeTab, setActiveTab] = useState('SCHEDULE'); // 'SCHEDULE' | 'COURSES' | 'HISTORY' | 'SETTINGS'
  const [courses, setCourses] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [settings, setSettings] = useState(null);

  // Modallar
  const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);
  const [selectedCourseForAttendance, setSelectedCourseForAttendance] = useState(null);

  const [courseDetailVisible, setCourseDetailVisible] = useState(false);
  const [selectedCourseForDetail, setSelectedCourseForDetail] = useState(null);

  const [addCourseModalVisible, setAddCourseModalVisible] = useState(false);
  const [courseToEdit, setCourseToEdit] = useState(null);
  const [initialDayForAdd, setInitialDayForAdd] = useState(1);

  const [ocrModalVisible, setOcrModalVisible] = useState(false);
  const [weeklyReportVisible, setWeeklyReportVisible] = useState(false);
  const [simulatorVisible, setSimulatorVisible] = useState(false);

  const [loadError, setLoadError] = useState(null);
  const [ready, setReady] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(null);
  const [reportDate, setReportDate] = useState(null);
  const [notificationStatus, setNotificationStatus] = useState(null);
  const handledResponse = useRef(null);
  const [reload, setReload] = useState(0);
  const scheduleNotifications = async () => {
    try { setNotificationStatus(await NotificationService.scheduleAllCourseNotifications()); }
    catch { setNotificationStatus({ status: 'error' }); }
  };
  useEffect(() => {
    let alive = true;
    const handleResponse = async response => {
      if (!response || !alive) return;
      const key = response.notification.request.identifier;
      if (handledResponse.current === key) return;
      handledResponse.current = key;
      try {
        const data = response.notification.request.content.data;
        if (data?.type === 'ATTENDANCE_CHECK') {
          const currentCourses = await StorageService.getCourses();
          const target = currentCourses.find(c => c.id === data.courseId);
          if (target && alive) {
            setAttendanceDate(data.lessonDate || localDateKey());
            setSelectedCourseForAttendance(target);
            setAttendanceModalVisible(true);
          }
        } else if (data?.type === 'FRIDAY_RECAP') {
          setReportDate(data.reportDate || localDateKey());
          setWeeklyReportVisible(true);
        }
        await Notifications.clearLastNotificationResponseAsync();
      } catch (error) { Alert.alert('Bildirim açılamadı', error.message); }
    };
    const listener = Notifications.addNotificationResponseReceivedListener(handleResponse);
    const load = async () => {
      try {
        setLoadError(null);
        await StorageService.init();
        const [cs, logs, prefs] = await Promise.all([StorageService.getCourses(), StorageService.getAttendanceLogs(), StorageService.getSettings()]);
        if (!alive) return;
        setCourses(cs); setAttendanceLogs(logs); setSettings(prefs); setReady(true);
        await handleResponse(await Notifications.getLastNotificationResponseAsync());
        if (alive) await scheduleNotifications();
      } catch (error) { if (alive) setLoadError(error.message); }
    };
    load();
    const appState = AppState.addEventListener('change', state => { if (state === 'active') load(); });
    const timer = setInterval(() => { if (AppState.currentState === 'active') load(); }, 60 * 60 * 1000);
    return () => { alive = false; listener.remove(); appState.remove(); clearInterval(timer); };
  }, [reload]);

  const refreshData = async () => {
    const [cs, logs, prefs] = await Promise.all([StorageService.getCourses(), StorageService.getAttendanceLogs(), StorageService.getSettings()]);
    setCourses(cs); setAttendanceLogs(logs); setSettings(prefs);
    await scheduleNotifications();
  };

  // Yoklama Kaydet
  const handleRecordAttendance = async (record) => {
    await StorageService.logAttendance(record);
    setAttendanceModalVisible(false);
    setAttendanceDate(null);
    await refreshData();
  };

  // Yeni Ders Ekle / Güncelle (Çakışma Kontrollü)
  const handleSaveCourse = async courseData => {
    if (courseData.id) await StorageService.updateCourse(courseData);
    else await StorageService.addCourse(courseData);
    await refreshData();
  };

  // Dersi Sil
  const handleDeleteCourse = (courseId) => {
    Alert.alert('Dersi Sil', 'Bu dersi silmek istediğinize emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try { await StorageService.deleteCourse(courseId); await refreshData(); setCourseDetailVisible(false); }
          catch (error) { Alert.alert('Silinemedi', error.message); }
        }
      }
    ]);
  };

  // Tekil Yoklama Kaydını Sil
  const handleDeleteLog = logId => Alert.alert('Kaydı sil?', 'Bu yoklama kaldırılacak.', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Sil', style: 'destructive', onPress: async () => {
      try { await StorageService.deleteLog(logId); await refreshData(); }
      catch (error) { Alert.alert('Silinemedi', error.message); }
    } }
  ]);
  const handleImportOCRCourses = async newCourses => {
    await StorageService.importCourses(newCourses);
    await refreshData();
    Alert.alert('Başarılı', `${newCourses.length} ders programa eklendi.`);
  };

  // Test: Devamsızlık Ekle
  const handleSimulateMissed = async () => {
    if (courses.length === 0) return;
    const targetCourse = courses[0];
    await StorageService.logAttendance({
      courseId: targetCourse.id,
      date: localDateKey(),
      status: 'missed',
      hours: targetCourse.totalHoursWeekly || 3,
      note: 'Simülasyon devamsızlığı'
    });
    await refreshData();
  };

  // Test: Sıfırla
  const handleResetData = async () => {
    await StorageService.resetToDefaults();
    await refreshData();
    setSimulatorVisible(false);
  };

  const overview = AnalyticsService.calculateOverview(courses, attendanceLogs, settings || {});
  const weeklyRecap = AnalyticsService.calculateWeeklyRecap(courses, attendanceLogs);
  const todayId = getTodayDayId();
  const todayCourses = courses.filter(course => Number(course.day) === todayId);
  const tabItems = [
    { id: 'SCHEDULE', label: 'Program', icon: 'calendar-outline', activeIcon: 'calendar' },
    { id: 'COURSES', label: 'Durum', icon: 'pie-chart-outline', activeIcon: 'pie-chart' },
    { id: 'HISTORY', label: 'Geçmiş', icon: 'time-outline', activeIcon: 'time' },
    { id: 'SETTINGS', label: 'Ayarlar', icon: 'settings-outline', activeIcon: 'settings' }
  ];

  if (loadError) return <SafeAreaView style={[styles.safeArea, { padding: 24 }]}><Text>Veriler okunamadı. Mevcut kayıtların korunuyor.</Text><Text>{loadError}</Text><Button title="Yeniden dene" onPress={() => setReload(v => v + 1)} /></SafeAreaView>;
  if (!ready) return <SafeAreaView style={styles.safeArea}><ActivityIndicator accessibilityLabel="Veriler yükleniyor" /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgPrimary} />

      {/* Sade & Şık Üst Bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>DERS ASİSTANIN</Text>
          <Text style={styles.appName}>Devam<Text style={styles.appNameAccent}>Takip</Text></Text>
        </View>

        <View style={styles.headerRight}>
          {/* Cuma Özeti */}
          <TouchableOpacity accessibilityRole="button"
            accessibilityLabel="Haftalık raporu aç" style={styles.iconBtn}
            onPress={() => { setReportDate(null); setWeeklyReportVisible(true); }}
            activeOpacity={0.7}
          >
            <Ionicons name="bar-chart-outline" size={18} color={COLORS.textPrimary} />
            {weeklyRecap.hasMissed && <View style={styles.badgeDot} />}
          </TouchableOpacity>

          {/* Test / Simülatör */}
          {__DEV__ && <TouchableOpacity accessibilityRole="button"
            style={styles.iconBtn}
            onPress={() => setSimulatorVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="flash-outline" size={18} color={COLORS.warningText} />
          </TouchableOpacity>}
        </View>
      </View>

      {/* Sade Menü Sekmeleri */}
      <View style={styles.tabBar}>
        {tabItems.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity accessibilityRole="button" key={tab.id} style={[styles.tabItem, isActive && styles.tabItemActive]} onPress={() => setActiveTab(tab.id)}>
              <View>
                <Ionicons name={isActive ? tab.activeIcon : tab.icon} size={19} color={isActive ? COLORS.primary : COLORS.textMuted} />
                {tab.id === 'COURSES' && overview.criticalCoursesCount > 0 && (
                  <View style={styles.navBadge}><Text style={styles.navBadgeText}>{overview.criticalCoursesCount}</Text></View>
                )}
              </View>
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* İçerik */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* TAB 1: PROGRAM */}
        {activeTab === 'SCHEDULE' && (
          <View>
            <View style={styles.welcomeCard}>
              <View style={styles.welcomeCopy}>
                <Text style={styles.welcomeKicker}>{getDayName(todayId).toUpperCase()}</Text>
                <Text style={styles.welcomeTitle}>{todayCourses.length > 0 ? `Bugün ${todayCourses.length} dersin var` : 'Bugün programın boş'}</Text>
                <Text style={styles.welcomeText}>
                  {todayCourses.length > 0 ? 'Ders çıkışında yoklamanı işaretlemeyi unutma.' : 'Biraz nefes al, haftanın kalanına hazırsın.'}
                </Text>
              </View>
              <View style={styles.welcomeIcon}>
                <Ionicons name={todayCourses.length > 0 ? 'sparkles' : 'cafe'} size={27} color={COLORS.primary} />
              </View>
            </View>
            {/* Sade OCR Ekleme Kartı */}
            <TouchableOpacity accessibilityRole="button"
              style={styles.ocrCard}
              onPress={() => setOcrModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="scan-outline" size={20} color={COLORS.primaryLight} />
              <View style={{ flex: 1 }}>
                <Text style={styles.ocrTitle}>Ekran Görüntüsünden / Metinden Aktar</Text>
                <Text style={styles.ocrSub}>OBS programını tek dokunuşla tabloya işle</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Haftalık Program</Text>
              <TouchableOpacity accessibilityRole="button"
                style={styles.addBtn}
                onPress={() => {
                  setCourseToEdit(null);
                  setInitialDayForAdd(getTodayDayId() || 1);
                  setAddCourseModalVisible(true);
                }}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.addBtnText}>Ders Ekle</Text>
              </TouchableOpacity>
            </View>

            <TimetableGrid
              courses={courses}
              onSelectCourse={(c) => {
                setSelectedCourseForAttendance(c);
                setAttendanceModalVisible(true);
              }}
              onAddCourse={(dayId) => {
                setCourseToEdit(null);
                setInitialDayForAdd(dayId);
                setAddCourseModalVisible(true);
              }}
              onDeleteCourse={handleDeleteCourse}
            />
          </View>
        )}

        {/* TAB 2: DEVAMSIZLIK & RİSKLER */}
        {activeTab === 'COURSES' && (
          <View>
            {/* Sade İstatistik Özeti */}
            <View style={styles.summaryBar}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Genel Katılım</Text>
                <Text style={styles.summaryValue}>%{overview.overallAttendanceRate}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Toplam Devamsızlık</Text>
                <Text style={[styles.summaryValue, { color: COLORS.dangerText }]}>
                  {overview.totalMissed} Saat
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Kritik Sınır</Text>
                <Text style={[styles.summaryValue, { color: overview.criticalCoursesCount > 0 ? COLORS.warningText : COLORS.successText }]}>
                  {overview.criticalCoursesCount} Ders
                </Text>
              </View>
            </View>

            <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>Dersler</Text>

            {courses.map((course) => {
              const stats = AnalyticsService.calculateCourseStats(course, attendanceLogs, settings || {});
              return (
                <CourseCard
                  key={course.id}
                  course={course}
                  stats={stats}
                  onOpenDetail={(c) => {
                    setSelectedCourseForDetail(c);
                    setCourseDetailVisible(true);
                  }}
                  onCheckIn={(c) => {
                    setSelectedCourseForAttendance(c);
                    setAttendanceModalVisible(true);
                  }}
                  onEdit={(c) => {
                    setCourseToEdit(c);
                    setAddCourseModalVisible(true);
                  }}
                  onDelete={handleDeleteCourse}
                />
              );
            })}
          </View>
        )}

        {/* TAB 3: GEÇMİŞ YOKLAMALAR */}
        {activeTab === 'HISTORY' && (
          <View>
            <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>
              Yoklama Geçmişi ({attendanceLogs.length})
            </Text>

            {attendanceLogs.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Kayıtlı yoklama bulunmuyor.</Text>
              </View>
            ) : (
              attendanceLogs.map((log) => {
                const course = courses.find(c => c.id === log.courseId);
                const isAttended = log.status === 'attended';
                const isMissed = log.status === 'missed';

                return (
                  <View key={log.id} style={styles.historyItem}>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: isAttended
                            ? COLORS.success
                            : isMissed
                            ? COLORS.danger
                            : COLORS.excused
                        }
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <View style={styles.historyTopRow}>
                        <Text style={styles.historyCourseCode}>{course?.code || 'DERS'}</Text>
                        <Text style={styles.historyWeek}>
                          {log.weekNumber ? `${log.weekNumber}. Hafta` : ''} • {log.date}
                        </Text>
                      </View>
                      <Text style={styles.historyCourseName}>{course?.name || 'Bilinmeyen Ders'}</Text>
                      <Text
                        style={[
                          styles.historyStatusText,
                          {
                            color: isAttended
                              ? COLORS.successText
                              : isMissed
                              ? COLORS.dangerText
                              : COLORS.excusedText
                          }
                        ]}
                      >
                        {isAttended
                          ? `Katıldı (+${log.hours} saat)`
                          : isMissed
                          ? `Gitmedi (-${log.hours} saat)`
                          : `Raporlu (${log.hours} saat)`}
                      </Text>
                      {log.note ? <Text style={styles.historyNote}>"{log.note}"</Text> : null}
                    </View>

                    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Yoklama kaydını sil" onPress={() => handleDeleteLog(log.id)} style={{ padding: 4 }}>
                      <Ionicons name="trash-outline" size={14} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* TAB 4: AYARLAR */}
        {activeTab === 'SETTINGS' && <SettingsPanel settings={settings} notificationStatus={notificationStatus} onChanged={refreshData} onRefresh={scheduleNotifications} />}
      </ScrollView>

      {/* MODALLAR */}
      {/* 1. Pop-up Yoklama Modalı */}
      <AttendanceModal
        visible={attendanceModalVisible}
        course={selectedCourseForAttendance}
        initialDate={attendanceDate}
        periods={settings?.teachingPeriods}
        onClose={() => { setAttendanceModalVisible(false); setAttendanceDate(null); }}
        onRecord={handleRecordAttendance}
      />

      {/* 2. Ders Ayrıntısı & Kaçırılan Haftalar Modalı */}
      <CourseDetailModal
        visible={courseDetailVisible}
        course={selectedCourseForDetail}
        stats={
          selectedCourseForDetail
            ? AnalyticsService.calculateCourseStats(selectedCourseForDetail, attendanceLogs, settings || {})
            : null
        }
        logs={attendanceLogs}
        onClose={() => setCourseDetailVisible(false)}
        onCheckIn={(c) => {
          setCourseDetailVisible(false);
          setSelectedCourseForAttendance(c);
          setAttendanceModalVisible(true);
        }}
        onDeleteLog={handleDeleteLog}
        onDeleteCourse={handleDeleteCourse}
      />

      {/* 3. Ders Ekle/Düzenle (Çakışma Korumalı) */}
      <AddCourseModal
        visible={addCourseModalVisible}
        courseToEdit={courseToEdit}
        existingCourses={courses}
        initialDay={initialDayForAdd}
        onClose={() => setAddCourseModalVisible(false)}
        onSave={handleSaveCourse}
      />

      {/* 4. Sade Program Aktarma Modalı */}
      <OCRScanModal
        visible={ocrModalVisible}
        onClose={() => setOcrModalVisible(false)}
        onImportCourses={handleImportOCRCourses}
      />

      {/* 5. Cuma Haftalık Karnesi */}
      <WeeklyReportModal
        visible={weeklyReportVisible}
        report={reportDate ? AnalyticsService.calculateWeeklyRecap(courses, attendanceLogs, parseLocalDate(reportDate)) : weeklyRecap}
        onClose={() => setWeeklyReportVisible(false)}
      />

      {/* 6. Test Simülatörü */}
      {__DEV__ && <SimulatorModal
        visible={simulatorVisible}
        courses={courses}
        onClose={() => setSimulatorVisible(false)}
        onTriggerPopup={(c) => {
          setSelectedCourseForAttendance(c || courses[0]);
          setAttendanceModalVisible(true);
        }}
        onSimulateMissed={handleSimulateMissed}
        onResetData={handleResetData}
      />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
    width: '100%',
    maxWidth: 1000,
    alignSelf: 'center'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: COLORS.bgPrimary
  },
  eyebrow: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 1
  },
  appName: {
    color: COLORS.textPrimary,
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: -0.7
  },
  appNameAccent: {
    color: COLORS.primary
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...SHADOWS.card
  },
  badgeDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.danger
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 5,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    ...SHADOWS.card
  },
  tabItem: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 13,
    gap: 2
  },
  tabItemActive: {
    backgroundColor: COLORS.primaryMuted
  },
  tabText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600'
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '800'
  },
  navBadge: {
    position: 'absolute',
    top: -5,
    right: -9,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    paddingHorizontal: 3,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center'
  },
  navBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800'
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 36
  },
  welcomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    padding: 20,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 5
  },
  welcomeCopy: {
    flex: 1,
    paddingRight: 12
  },
  welcomeKicker: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 5
  },
  welcomeTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4
  },
  welcomeText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    lineHeight: 17
  },
  welcomeIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  ocrCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: 18,
    padding: 15,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
    ...SHADOWS.card
  },
  ocrTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600'
  },
  ocrSub: {
    color: COLORS.textMuted,
    fontSize: 11
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12
  },
  addBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 18,
    ...SHADOWS.card
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center'
  },
  summaryLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginBottom: 2
  },
  summaryValue: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700'
  },
  summaryDivider: {
    width: 1,
    height: '70%',
    backgroundColor: COLORS.border,
    alignSelf: 'center'
  },
  emptyCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 12
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: 17,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
    ...SHADOWS.card
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  historyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1
  },
  historyCourseCode: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: '700'
  },
  historyWeek: {
    color: COLORS.textMuted,
    fontSize: 11
  },
  historyCourseName: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 1
  },
  historyStatusText: {
    fontSize: 11,
    fontWeight: '600'
  },
  historyNote: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2
  },
  settingsBox: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    ...SHADOWS.card
  },
  calendarInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DDD7FD',
    padding: 14
  },
  calendarIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgCard
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10
  },
  settingTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2
  },
  settingDesc: {
    color: COLORS.textMuted,
    fontSize: 11
  },
  settingDivider: {
    height: 1,
    backgroundColor: COLORS.border
  },
  settingAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10
  },
  settingActionText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '500',
    flex: 1
  }
});

export default function App() { return <SafeAreaProvider><ErrorBoundary><AppContent /></ErrorBoundary></SafeAreaProvider>; }
