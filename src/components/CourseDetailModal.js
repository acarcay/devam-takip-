import { Alert } from '../utils/alert';
import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
  } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../constants/theme';
import { getDayName } from '../constants/days';

export default function CourseDetailModal({
  visible,
  course,
  stats,
  logs = [],
  onClose,
  onCheckIn,
  onDeleteLog,
  onDeleteCourse
}) {
  if (!course) return null;

  const courseLogs = logs.filter(l => l.courseId === course.id);
  const missedLogs = courseLogs.filter(l => l.status === 'missed');
  const attendedLogs = courseLogs.filter(l => l.status === 'attended');

  const formatFriendlyDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
      const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
      return `${d.getDate()} ${monthNames[d.getMonth()]}, ${dayNames[d.getDay()]}`;
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      
        <View style={styles.overlay}>
          
            <View style={styles.modalCard}>
              {/* Header */}
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <View style={styles.topBadgeRow}>
                    <Text style={styles.codeText}>{course.code}</Text>
                    <View style={[styles.riskTag, { backgroundColor: stats?.riskBg || COLORS.bgSubtle }]}>
                      <Text style={[styles.riskTagText, { color: stats?.riskText || COLORS.textSecondary }]}>
                        {stats?.statusMessage || 'Güvenli'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.courseName}>{course.name}</Text>
                </View>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Kapat" onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Stat Summary Box */}
              <View style={styles.summaryCard}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Kullanılan</Text>
                  <Text style={[styles.statValue, { color: COLORS.dangerText }]}>
                    {stats?.missedHours || 0}s
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Kalan Hak</Text>
                  <Text style={[styles.statValue, { color: COLORS.textPrimary }]}>
                    {stats?.remainingAbsenceHours || course.maxAbsenceHours}s
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Kalan Hafta</Text>
                  <Text style={[styles.statValue, { color: COLORS.primaryLight }]}>
                    ~{stats?.remainingWeeks || 0}
                  </Text>
                </View>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>
                {/* 1. Gitmediğin Günler & Haftalar */}
                <View style={styles.sectionHeader}>
                  <Ionicons name="close-circle-outline" size={16} color={COLORS.dangerText} />
                  <Text style={styles.sectionTitle}>
                    Gitmediğin Günler ({missedLogs.length})
                  </Text>
                </View>

                {missedLogs.length === 0 ? (
                  <View style={styles.emptyNotice}>
                    <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.successText} />
                    <Text style={styles.emptyNoticeText}>Bu derste henüz hiç devamsızlığın yok!</Text>
                  </View>
                ) : (
                  missedLogs.map((log) => (
                    <View key={log.id} style={styles.logRow}>
                      <View style={styles.logLeft}>
                        <View style={styles.weekTag}>
                          <Text style={styles.weekTagText}>
                            {log.weekNumber ? `${log.weekNumber}. Hafta` : 'Hafta -'}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.logDateText}>{formatFriendlyDate(log.date)}</Text>
                          {log.note ? <Text style={styles.logNoteText}>"{log.note}"</Text> : null}
                        </View>
                      </View>
                      <View style={styles.logRight}>
                        <Text style={styles.hoursMissedText}>-{log.hours} Saat</Text>
                        {onDeleteLog && (
                          <TouchableOpacity accessibilityRole="button"
                            onPress={() => {
                              Alert.alert('Kaydı Sil', 'Bu devamsızlık kaydını silmek istiyor musunuz?', [
                                { text: 'Vazgeç', style: 'cancel' },
                                { text: 'Sil', style: 'destructive', onPress: () => onDeleteLog(log.id) }
                              ]);
                            }}
                            style={styles.deleteIconBtn}
                          >
                            <Ionicons name="trash-outline" size={14} color={COLORS.textMuted} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))
                )}

                {/* 2. Katıldığın Günler */}
                <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.successText} />
                  <Text style={styles.sectionTitle}>
                    Katıldığın Günler ({attendedLogs.length})
                  </Text>
                </View>

                {attendedLogs.length === 0 ? (
                  <View style={styles.emptyNotice}>
                    <Text style={styles.emptyNoticeText}>Henüz katılım kaydı girilmedi.</Text>
                  </View>
                ) : (
                  attendedLogs.map((log) => (
                    <View key={log.id} style={styles.logRow}>
                      <View style={styles.logLeft}>
                        <View style={[styles.weekTag, { backgroundColor: COLORS.successBg }]}>
                          <Text style={[styles.weekTagText, { color: COLORS.successText }]}>
                            {log.weekNumber ? `${log.weekNumber}. Hafta` : 'Hafta -'}
                          </Text>
                        </View>
                        <Text style={styles.logDateText}>{formatFriendlyDate(log.date)}</Text>
                      </View>
                      <Text style={styles.hoursAttendedText}>+{log.hours} Saat</Text>
                    </View>
                  ))
                )}
              </ScrollView>

              {/* Alt Butonlar: Yoklama Ekle & Dersi Sil */}
              <View style={styles.actionBtnRow}>
                <TouchableOpacity accessibilityRole="button"
                  style={styles.checkInBtn}
                  onPress={() => {
                    onClose();
                    onCheckIn(course);
                  }}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.checkInBtnText}>Yoklama Ekle</Text>
                </TouchableOpacity>

                {onDeleteCourse && (
                  <TouchableOpacity accessibilityRole="button"
                    style={styles.deleteCourseBtn}
                    onPress={() => {
                      Alert.alert(
                        'Dersi Sil',
                        `"${course.name}" dersini ve tüm devamsızlık kayıtlarını silmek istediğinize emin misiniz?`,
                        [
                          { text: 'Vazgeç', style: 'cancel' },
                          {
                            text: 'Evet, Sil',
                            style: 'destructive',
                            onPress: () => {
                              onClose();
                              onDeleteCourse(course.id);
                            }
                          }
                        ]
                      );
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color={COLORS.dangerText} />
                    <Text style={styles.deleteCourseBtnText}>Dersi Sil</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          
        </View>
      
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end'
  },
  modalCard: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14
  },
  topBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  codeText: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '700'
  },
  riskTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  riskTagText: {
    fontSize: 11,
    fontWeight: '600'
  },
  courseName: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700'
  },
  closeBtn: {
    padding: 4
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  statBox: {
    flex: 1,
    alignItems: 'center'
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginBottom: 2
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700'
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: COLORS.border,
    alignSelf: 'center'
  },
  scrollArea: {
    maxHeight: 280,
    marginBottom: 14
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700'
  },
  emptyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 10,
    padding: 10,
    gap: 6
  },
  emptyNoticeText: {
    color: COLORS.textSecondary,
    fontSize: 12
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1
  },
  weekTag: {
    backgroundColor: COLORS.dangerBg,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6
  },
  weekTagText: {
    color: COLORS.dangerText,
    fontSize: 11,
    fontWeight: '700'
  },
  logDateText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '500'
  },
  logNoteText: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 1
  },
  logRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  hoursMissedText: {
    color: COLORS.dangerText,
    fontSize: 12,
    fontWeight: '700'
  },
  hoursAttendedText: {
    color: COLORS.successText,
    fontSize: 12,
    fontWeight: '700'
  },
  deleteIconBtn: {
    padding: 4
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4
  },
  checkInBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6
  },
  checkInBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700'
  },
  deleteCourseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.dangerBg,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    gap: 6
  },
  deleteCourseBtnText: {
    color: COLORS.dangerText,
    fontSize: 13,
    fontWeight: '700'
  }
});
