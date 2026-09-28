import { Alert } from '../utils/alert';
import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
  } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../constants/theme';
import { DAYS } from '../constants/days';
import { checkScheduleConflict, validateCourse } from '../services/storageService';

export default function AddCourseModal({
  visible,
  courseToEdit,
  existingCourses = [],
  initialDay = 1,
  onClose,
  onSave
}) {
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [day, setDay] = useState(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:50');
  const [room, setRoom] = useState('');
  const [maxAbsenceHours, setMaxAbsenceHours] = useState('12');
  const [totalHoursWeekly, setTotalHoursWeekly] = useState('3');
  const [selectedColor, setSelectedColor] = useState(COLORS.courseColors[0]);

  useEffect(() => {
    if (courseToEdit) {
      setName(courseToEdit.name || '');
      setCode(courseToEdit.code || '');
      setDay(courseToEdit.day !== undefined ? courseToEdit.day : 1);
      setStartTime(courseToEdit.startTime || '09:00');
      setEndTime(courseToEdit.endTime || '11:50');
      setRoom(courseToEdit.room || '');
      setMaxAbsenceHours(String(courseToEdit.maxAbsenceHours ?? '12'));
      setTotalHoursWeekly(String(courseToEdit.totalHoursWeekly || '3'));
      setSelectedColor(courseToEdit.color || COLORS.courseColors[0]);
    } else {
      setName('');
      setCode('');
      setDay(initialDay !== undefined ? initialDay : 1);
      setStartTime('09:00');
      setEndTime('11:50');
      setRoom('');
      setMaxAbsenceHours('12');
      setTotalHoursWeekly('3');
      setSelectedColor(COLORS.courseColors[Math.floor(Math.random() * COLORS.courseColors.length)]);
    }
  }, [courseToEdit, initialDay, visible]);

  const handleSave = async () => {
    if (saving.current) return;
    try {
    if (!name.trim()) {
      Alert.alert('Eksik Alan', 'Lütfen ders adını girin.');
      return;
    }
    if (!code.trim()) {
      Alert.alert('Eksik Alan', 'Lütfen ders kodunu girin (örn: MAT101).');
      return;
    }

    const candidateCourse = {
      ...(courseToEdit ? { id: courseToEdit.id } : {}),
      name: name.trim(),
      code: code.trim().toUpperCase(),
      day: Number(day),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      room: room.trim(),
      totalHoursWeekly: Number(totalHoursWeekly),
      maxAbsenceHours: Number(maxAbsenceHours),
      color: selectedColor
    };

    validateCourse(candidateCourse);
    // ÇAKIŞMA KONTROLÜ: Aynı güne ve saate başka ders eklenemez!
    const conflict = checkScheduleConflict(
      existingCourses,
      candidateCourse,
      courseToEdit ? courseToEdit.id : null
    );

    if (conflict.hasConflict) {
      Alert.alert(
        '⚠️ Ders Çakışması Engellendi',
        `Aynı gün ve saatte zaten bir dersiniz bulunuyor!\n\nÇakışan Ders: ${conflict.conflictingCourse.name} (${conflict.conflictingCourse.code})\nSaat: ${conflict.conflictingCourse.startTime} - ${conflict.conflictingCourse.endTime}\n\nLütfen farklı bir saat veya gün seçin.`
      );
      return;
    }

    saving.current = true; setBusy(true);
    await onSave(candidateCourse);
    onClose();
    } catch (error) { Alert.alert('Kaydedilemedi', error.message); }
    finally { saving.current = false; setBusy(false); }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      
        <View style={styles.overlay}>
          
            <View style={styles.modalCard}>
              {/* Header */}
              <View style={styles.header}>
                <View>
                  <Text style={styles.title}>
                    {courseToEdit ? 'Dersi Düzenle' : 'Yeni Ders Ekle'}
                  </Text>
                  <Text style={styles.subtitle}>Çakışma kontrolü otomatik yapılır</Text>
                </View>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Kapat" onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Kod & Ad */}
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Ders Kodu</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="MAT101"
                      placeholderTextColor={COLORS.textMuted}
                      value={code}
                      onChangeText={setCode}
                      autoCapitalize="characters"
                    />
                  </View>
                  <View style={{ flex: 2 }}>
                    <Text style={styles.label}>Ders Adı</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Matematik I"
                      placeholderTextColor={COLORS.textMuted}
                      value={name}
                      onChangeText={setName}
                    />
                  </View>
                </View>

                {/* Gün */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Ders Günü</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayChips}>
                    {DAYS.map((d) => (
                      <TouchableOpacity accessibilityRole="button"
                        key={d.id}
                        style={[styles.dayChip, day === d.id && styles.dayChipActive]}
                        onPress={() => setDay(d.id)}
                      >
                        <Text style={[styles.dayChipText, day === d.id && styles.dayChipTextActive]}>
                          {d.shortName}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Saatler */}
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Başlangıç Saati</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="09:00"
                      placeholderTextColor={COLORS.textMuted}
                      value={startTime}
                      onChangeText={setStartTime}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Bitiş Saati</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="11:50"
                      placeholderTextColor={COLORS.textMuted}
                      value={endTime}
                      onChangeText={setEndTime}
                    />
                  </View>
                </View>

                {/* Derslik & Devamsızlık Sınırı */}
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Derslik</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Amfi A-1"
                      placeholderTextColor={COLORS.textMuted}
                      value={room}
                      onChangeText={setRoom}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Devamsızlık Limiti (Saat)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="12"
                      placeholderTextColor={COLORS.textMuted}
                      value={maxAbsenceHours}
                      onChangeText={setMaxAbsenceHours}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Renk */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Renk</Text>
                  <View style={styles.colorRow}>
                    {COLORS.courseColors.map((color, idx) => (
                      <TouchableOpacity accessibilityRole="button"
                        key={idx}
                        style={[
                          styles.colorCircle,
                          { backgroundColor: color },
                          selectedColor === color && styles.colorCircleSelected
                        ]}
                        onPress={() => setSelectedColor(color)}
                      />
                    ))}
                  </View>
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.btnRow}>
                <TouchableOpacity accessibilityRole="button" style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelBtnText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" style={styles.saveBtn} disabled={busy} onPress={handleSave}>
                  <Text style={styles.saveBtnText}>Kaydet</Text>
                </TouchableOpacity>
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
    marginBottom: 16
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700'
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2
  },
  closeBtn: {
    padding: 4
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12
  },
  fieldGroup: {
    marginBottom: 12
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 5
  },
  input: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 14
  },
  dayChips: {
    gap: 6
  },
  dayChip: {
    backgroundColor: COLORS.bgSecondary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  dayChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryLight
  },
  dayChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600'
  },
  dayChipTextActive: {
    color: '#fff'
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4
  },
  colorCircle: {
    width: 28,
    height: 28,
    borderRadius: 14
  },
  colorCircleSelected: {
    borderWidth: 2,
    borderColor: '#ffffff'
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 8
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  cancelBtnText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600'
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: 'center'
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700'
  }
});
