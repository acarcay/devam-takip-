import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, SHADOWS } from '../constants/theme';
import { getDayName } from '../constants/days';

export default function CourseCard({ course, stats, onOpenDetail, onCheckIn, onEdit, onDelete }) {
  const percent = stats ? stats.absenceUsagePercent : 0;
  const remainingHours = stats ? stats.remainingAbsenceHours : course.maxAbsenceHours;
  const riskColor = stats ? stats.riskColor : COLORS.success;
  const riskBg = stats ? stats.riskBg : COLORS.successBg;
  const riskText = stats ? stats.riskText : COLORS.successText;
  const statusMessage = stats ? stats.statusMessage : 'Güvenli';

  return (
    <TouchableOpacity accessibilityRole="button"
      style={styles.card}
      onPress={() => onOpenDetail(course)}
      activeOpacity={0.7}
    >
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.titleArea}>
          <View style={[styles.codeTag, { backgroundColor: course.color || COLORS.primary }]}>
            <Text style={styles.codeText}>{course.code}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.nameText} numberOfLines={1}>{course.name}</Text>
            <Text style={styles.timeText}>
              {getDayName(course.day)} • {course.startTime} - {course.endTime} {course.room ? `• ${course.room}` : ''}
            </Text>
          </View>
        </View>

        <View style={[styles.riskBadge, { backgroundColor: riskBg }]}>
          <Text style={[styles.riskBadgeText, { color: riskText }]}>{statusMessage}</Text>
        </View>
      </View>

      {/* Progress Track */}
      <View style={styles.meterContainer}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${Math.min(100, Math.max(4, percent))}%`,
                backgroundColor: riskColor
              }
            ]}
          />
        </View>

        <View style={styles.meterLabels}>
          <Text style={styles.statDetail}>
            Devamsızlık: <Text style={{ color: COLORS.textPrimary, fontWeight: '700' }}>{stats ? stats.missedHours : 0}</Text> / {course.maxAbsenceHours} Saat
          </Text>
          <Text style={styles.remainingText}>
            Kalan: <Text style={{ color: riskColor, fontWeight: '700' }}>{remainingHours} Saat</Text>
            {stats?.remainingWeeks ? ` (~${stats.remainingWeeks} hf)` : ''}
          </Text>
        </View>
      </View>

      {/* Action Footer */}
      <View style={styles.footerRow}>
        <Text style={styles.detailHintText}>Haftalık döküm için tıkla →</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {onDelete && (
            <TouchableOpacity accessibilityRole="button"
              style={styles.deleteCardBtn}
              onPress={(e) => {
                e.stopPropagation();
                onDelete(course.id);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={16} color={COLORS.dangerText} />
            </TouchableOpacity>
          )}
          <TouchableOpacity accessibilityRole="button"
            style={styles.quickCheckInBtn}
            onPress={(e) => {
              e.stopPropagation();
              onCheckIn(course);
            }}
          >
            <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
            <Text style={styles.quickCheckInText}>Yoklama Gir</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8
  },
  titleArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10
  },
  codeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  codeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700'
  },
  nameText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 1
  },
  timeText: {
    color: COLORS.textMuted,
    fontSize: 11
  },
  riskBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6
  },
  riskBadgeText: {
    fontSize: 10,
    fontWeight: '700'
  },
  meterContainer: {
    marginVertical: 6
  },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6
  },
  progressBar: {
    height: '100%',
    borderRadius: 3
  },
  meterLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statDetail: {
    color: COLORS.textSecondary,
    fontSize: 11
  },
  remainingText: {
    color: COLORS.textSecondary,
    fontSize: 11
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border
  },
  detailHintText: {
    color: COLORS.textMuted,
    fontSize: 11
  },
  quickCheckInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8
  },
  quickCheckInText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  }
});
