import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, SHADOWS } from '../constants/theme';
import { getDayName } from '../constants/days';

export default function WeeklyReportModal({ visible, report, onClose }) {
  if (!report) return null;

  const isPerfect = report.missedCount === 0 && report.attendedCount > 0;

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      
        <View style={styles.overlay}>
          
            <View style={styles.modalCard}>
              {/* Top Bar */}
              <View style={styles.header}>
                <View style={styles.titleRow}>
                  <Text style={styles.headerIcon}>📊</Text>
                  <View>
                    <Text style={styles.title}>Cuma Devamsızlık Karnesi</Text>
                    <Text style={styles.subtitle}>Bu haftanın katılım ve devam özeti</Text>
                  </View>
                </View>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Kapat" onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={22} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
                {/* Score Hero Card */}
                <View style={[styles.heroCard, isPerfect && styles.heroCardPerfect]}>
                  <View style={styles.heroLeft}>
                    <Text style={styles.heroRateTitle}>Haftalık Katılım Oranı</Text>
                    <Text style={styles.heroRateValue}>%{report.weekRate}</Text>
                    <Text style={styles.heroMessage}>
                      {isPerfect
                        ? 'Harika bir hafta! Hiçbir dersi kaçırmadın 🏆'
                        : report.hasMissed
                        ? `Bu hafta ${report.missedCount} derse katılmadın.`
                        : 'Henüz bu hafta için yoklama kaydı bulunmuyor.'}
                    </Text>
                  </View>
                  <View style={styles.heroStatsColumn}>
                    <View style={styles.miniStatBox}>
                      <Text style={styles.miniStatNumberGreen}>{report.attendedCount}</Text>
                      <Text style={styles.miniStatLabel}>Katılınan</Text>
                    </View>
                    <View style={styles.miniStatBox}>
                      <Text style={styles.miniStatNumberRed}>{report.missedCount}</Text>
                      <Text style={styles.miniStatLabel}>Kaçırılan</Text>
                    </View>
                  </View>
                </View>

                {/* Kaçırılan Dersler Bölümü */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="alert-circle-outline" size={18} color={COLORS.dangerText} />
                    <Text style={styles.sectionTitle}>Bu Hafta Gitmediğin Dersler</Text>
                  </View>

                  {report.missedList.length === 0 ? (
                    <View style={styles.emptyNotice}>
                      <Ionicons name="checkmark-done-circle-outline" size={24} color={COLORS.success} />
                      <Text style={styles.emptyNoticeText}>Bu hafta kaçırdığın ders yok, tebrikler!</Text>
                    </View>
                  ) : (
                    report.missedList.map((item, idx) => (
                      <View key={item.id || idx} style={styles.missedItem}>
                        <View style={[styles.colorPill, { backgroundColor: item.course?.color || COLORS.danger }]} />
                        <View style={{ flex: 1 }}>
                          <View style={styles.itemTopRow}>
                            <Text style={styles.itemCode}>{item.course?.code || 'DERS'}</Text>
                            <Text style={styles.itemHours}>{item.hours} Saat Devamsızlık</Text>
                          </View>
                          <Text style={styles.itemName}>{item.course?.name}</Text>
                          <Text style={styles.itemDate}>
                            Tarih: {item.date} {item.note ? `• Not: ${item.note}` : ''}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>

                {/* Katıldığın Dersler Bölümü */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.successText} />
                    <Text style={styles.sectionTitle}>Bu Hafta Katıldığın Dersler</Text>
                  </View>

                  {report.attendedList.length === 0 ? (
                    <View style={styles.emptyNotice}>
                      <Text style={styles.emptyNoticeText}>Bu hafta için katılım kaydı girilmedi.</Text>
                    </View>
                  ) : (
                    report.attendedList.map((item, idx) => (
                      <View key={item.id || idx} style={styles.attendedItem}>
                        <Ionicons name="checkmark" size={16} color={COLORS.successText} />
                        <Text style={styles.attendedCode}>{item.course?.code}</Text>
                        <Text style={styles.attendedName} numberOfLines={1}>{item.course?.name}</Text>
                        <Text style={styles.attendedHours}>+{item.hours}s</Text>
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>

              {/* Close button */}
              <TouchableOpacity accessibilityRole="button" style={styles.closeModalBtn} onPress={onClose}>
                <Text style={styles.closeModalBtnText}>Kapat</Text>
              </TouchableOpacity>
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  headerIcon: {
    fontSize: 28
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 19,
    fontWeight: '700'
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 13
  },
  closeBtn: {
    padding: 4
  },
  scroll: {
    marginBottom: 16
  },
  heroCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    alignItems: 'center'
  },
  heroCardPerfect: {
    borderColor: COLORS.success,
    backgroundColor: 'rgba(16, 185, 129, 0.08)'
  },
  heroLeft: {
    flex: 1,
    paddingRight: 10
  },
  heroRateTitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600'
  },
  heroRateValue: {
    color: COLORS.primaryLight,
    fontSize: 34,
    fontWeight: '800',
    marginVertical: 2
  },
  heroMessage: {
    color: COLORS.textPrimary,
    fontSize: 13,
    lineHeight: 18
  },
  heroStatsColumn: {
    gap: 8
  },
  miniStatBox: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  miniStatNumberGreen: {
    color: COLORS.successText,
    fontSize: 16,
    fontWeight: '700'
  },
  miniStatNumberRed: {
    color: COLORS.dangerText,
    fontSize: 16,
    fontWeight: '700'
  },
  miniStatLabel: {
    color: COLORS.textMuted,
    fontSize: 10
  },
  section: {
    marginBottom: 18
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700'
  },
  emptyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 12,
    padding: 12,
    gap: 8
  },
  emptyNoticeText: {
    color: COLORS.textSecondary,
    fontSize: 13
  },
  missedItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.dangerBg,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    gap: 10
  },
  colorPill: {
    width: 4,
    borderRadius: 2
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  itemCode: {
    color: COLORS.dangerText,
    fontSize: 13,
    fontWeight: '700'
  },
  itemHours: {
    color: COLORS.dangerText,
    fontSize: 12,
    fontWeight: '600'
  },
  itemName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginVertical: 2
  },
  itemDate: {
    color: COLORS.textMuted,
    fontSize: 11
  },
  attendedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 12,
    padding: 10,
    marginBottom: 6,
    gap: 8
  },
  attendedCode: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '700'
  },
  attendedName: {
    color: COLORS.textPrimary,
    fontSize: 13,
    flex: 1
  },
  attendedHours: {
    color: COLORS.successText,
    fontSize: 12,
    fontWeight: '600'
  },
  closeModalBtn: {
    backgroundColor: COLORS.bgSecondary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  closeModalBtnText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600'
  }
});
