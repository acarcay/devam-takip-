import { Alert } from '../utils/alert';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, SHADOWS } from '../constants/theme';
import { DAYS, getTodayDayId } from '../constants/days';

export default function TimetableGrid({ courses, onSelectCourse, onAddCourse, onDeleteCourse }) {
  const todayId = getTodayDayId();
  const [selectedDay, setSelectedDay] = useState(todayId === 0 || todayId === 6 ? 1 : todayId);

  const dayCourses = courses
    .filter(c => Number(c.day) === selectedDay)
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  const confirmDelete = (course) => {
    Alert.alert(
      'Dersi Sil',
      `"${course.name}" dersini programdan silmek istediğinize emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => onDeleteCourse && onDeleteCourse(course.id)
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Gün Seçici Tablar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
      >
        {DAYS.map((day) => {
          const isSelected = day.id === selectedDay;
          const isToday = day.id === todayId;
          const count = courses.filter(c => Number(c.day) === day.id).length;

          return (
            <TouchableOpacity accessibilityRole="button"
              key={day.id}
              style={[
                styles.dayTab,
                isSelected && styles.dayTabActive,
                isToday && !isSelected && styles.dayTabToday
              ]}
              onPress={() => setSelectedDay(day.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayText,
                  isSelected && styles.dayTextActive,
                  isToday && !isSelected && styles.dayTextToday
                ]}
              >
                {day.shortName}
              </Text>
              <Text style={[styles.countText, isSelected && styles.countTextActive]}>
                {count > 0 ? `${count}` : '-'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Seçili Güne Ait Dersler */}
      <View style={styles.listContainer}>
        {dayCourses.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Bu güne ait ders yok</Text>
            <TouchableOpacity accessibilityRole="button"
              style={styles.addBtn}
              onPress={() => onAddCourse(selectedDay)}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.addBtnText}>Ders Ekle</Text>
            </TouchableOpacity>
          </View>
        ) : (
          dayCourses.map((course) => (
            <View key={course.id} style={styles.courseRow}>
              {/* Tıklanınca Yoklama Başlatan Alan */}
              <TouchableOpacity accessibilityRole="button"
                style={styles.courseMainTouch}
                onPress={() => onSelectCourse(course)}
                activeOpacity={0.7}
              >
                {/* Saat Sütunu */}
                <View style={styles.timeCol}>
                  <Text style={styles.startTime}>{course.startTime}</Text>
                  <Text style={styles.endTime}>{course.endTime}</Text>
                </View>

                {/* Renk Çizgisi */}
                <View style={[styles.indicator, { backgroundColor: course.color || COLORS.primary }]} />

                {/* Bilgi */}
                <View style={{ flex: 1 }}>
                  <View style={styles.codeRow}>
                    <Text style={styles.codeText}>{course.code}</Text>
                    {course.room ? <Text style={styles.roomText}>• {course.room}</Text> : null}
                  </View>
                  <Text style={styles.nameText} numberOfLines={1}>{course.name}</Text>
                </View>
              </TouchableOpacity>

              {/* Dersi Sil Butonu */}
              <TouchableOpacity accessibilityRole="button"
                style={styles.deleteBtn}
                onPress={() => confirmDelete(course)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={18} color={COLORS.dangerText} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16
  },
  tabsRow: {
    gap: 6,
    paddingBottom: 10
  },
  dayTab: {
    backgroundColor: COLORS.bgCard,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: 'center',
    minWidth: 50,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  dayTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  dayTabToday: {
    borderColor: COLORS.primaryLight
  },
  dayText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600'
  },
  dayTextActive: {
    color: '#fff'
  },
  dayTextToday: {
    color: COLORS.primaryLight
  },
  countText: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2
  },
  countTextActive: {
    color: 'rgba(255, 255, 255, 0.8)'
  },
  listContainer: {
    gap: 8
  },
  emptyCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  emptyTitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 12
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  addBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card
  },
  courseMainTouch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  timeCol: {
    alignItems: 'flex-start',
    width: 48
  },
  startTime: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700'
  },
  endTime: {
    color: COLORS.textMuted,
    fontSize: 11
  },
  indicator: {
    width: 3,
    height: 28,
    borderRadius: 2
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  codeText: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: '700'
  },
  roomText: {
    color: COLORS.textMuted,
    fontSize: 11
  },
  nameText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600'
  },
  deleteBtn: {
    padding: 8,
    marginLeft: 6
  }
});
