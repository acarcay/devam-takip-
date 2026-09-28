import { Alert } from '../utils/alert';
import { localDateKey, parseLocalDate } from '../utils/dates';
import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput, ScrollView
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../constants/theme';
import { getDayName } from '../constants/days';
import { getSemesterWeekNumber } from '../services/storageService';

export default function AttendanceModal({ visible, course, onClose, onRecord, initialDate, periods }) {
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const [hours, setHours] = useState('1');
  const [selectedDate, setSelectedDate] = useState('');
  const [weekNumber, setWeekNumber] = useState(1);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);

  useEffect(() => {
    if (visible) {
      const today = new Date();
      const dateStr = initialDate || localDateKey(today);
      setHours(String(course?.totalHoursWeekly || 1));
      setSelectedDate(dateStr);
      setWeekNumber(getSemesterWeekNumber(dateStr, undefined, periods));
      setNote('');
      setShowNote(false);
    }
  }, [visible, course, initialDate, periods]);

  if (!course) return null;

  const handleAction = async (status) => {
    if (saving.current) return;
    saving.current = true; setBusy(true);
    try { await onRecord({
      courseId: course.id,
      date: selectedDate,
      weekNumber: Number(weekNumber),
      status, // 'attended' | 'missed' | 'excused'
      hours: Number(hours),
      note: note.trim()
    }); } catch (error) { Alert.alert('Kaydedilemedi', error.message); }
    finally { saving.current = false; setBusy(false); }
  };

  // Tarihi Türkçe formatla (örn: 7 Eylül 2026, Pazartesi)
  const formatFriendlyDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = parseLocalDate(dateStr);
      const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
      const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
      return `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}, ${dayNames[d.getDay()]}`;
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      
        <View style={styles.overlay}>
          
            <ScrollView style={styles.modalCard} keyboardShouldPersistTaps="handled">
              {/* Header */}
              <View style={styles.topRow}>
                <View style={[styles.codeBadge, { backgroundColor: course.color || COLORS.primary }]}>
                  <Text style={styles.codeBadgeText}>{course.code}</Text>
                </View>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Kapat" onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.courseName}>{course.name}</Text>
              
              {/* Tarih ve Hafta Bilgi Kutusu */}
              <View style={styles.metaBox}>
                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={15} color={COLORS.textSecondary} />
                  <Text style={styles.metaText}>{formatFriendlyDate(selectedDate)}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="layers-outline" size={15} color={COLORS.primaryLight} />
                  <Text style={[styles.metaText, { color: COLORS.primaryLight, fontWeight: '600' }]}>
                    {weekNumber ? `${weekNumber}. Hafta` : 'Dönem dışı'} • {course.totalHoursWeekly || 3} Saatlik Ders
                  </Text>
                </View>
              </View>

              <TextInput accessibilityLabel="Yoklama tarihi" style={styles.noteInput} value={selectedDate} placeholder="YYYY-AA-GG" onChangeText={value => { setSelectedDate(value); try { setWeekNumber(getSemesterWeekNumber(value, undefined, periods)); } catch { setWeekNumber(null); } }} />
              <Text>Saat (kısmi katılım için değiştir)</Text>
              <TextInput accessibilityLabel="Yoklama saati" style={styles.noteInput} value={hours} onChangeText={setHours} keyboardType="decimal-pad" />
              <Text style={styles.questionText}>Bu dersin yoklamasına katıldın mı?</Text>

              {showNote && (
                <TextInput
                  style={styles.noteInput}
                  placeholder="Not ekle (örn: Hoca imza aldı, geç kalındı...)"
                  placeholderTextColor={COLORS.textMuted}
                  value={note}
                  onChangeText={setNote}
                />
              )}

              {/* Seçim Butonları */}
              <View style={styles.actionRow}>
                <TouchableOpacity accessibilityRole="button"
                  style={[styles.btn, styles.btnAttended]}
                  disabled={busy} onPress={() => handleAction('attended')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={styles.btnText}>Evet, Katıldım</Text>
                </TouchableOpacity>

                <TouchableOpacity accessibilityRole="button"
                  style={[styles.btn, styles.btnMissed]}
                  disabled={busy} onPress={() => handleAction('missed')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close-circle-outline" size={20} color="#fff" />
                  <Text style={styles.btnText}>Hayır, Gitmedim</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity accessibilityRole="button"
                style={[styles.btn, styles.btnExcused]}
                disabled={busy} onPress={() => handleAction('excused')}
                activeOpacity={0.8}
              >
                <Text style={styles.btnExcusedText}>📋 Raporlu / İzinli</Text>
              </TouchableOpacity>

              {/* Alt Butonlar */}
              <View style={styles.footerRow}>
                <TouchableOpacity accessibilityRole="button" onPress={() => setShowNote(!showNote)} style={styles.footerLink}>
                  <Text style={styles.footerLinkText}>{showNote ? 'Notu Kapat' : '+ Not Ekle'}</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.footerLink}>
                  <Text style={styles.footerDismissText}>Daha Sonra</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          
        </View>
      
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    flexGrow: 0,
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  codeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  codeBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700'
  },
  closeBtn: {
    padding: 4
  },
  courseName: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12
  },
  metaBox: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  metaText: {
    color: COLORS.textSecondary,
    fontSize: 12
  },
  questionText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 14,
    textAlign: 'center'
  },
  noteInput: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 10,
    padding: 10,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 13,
    marginBottom: 12
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8
  },
  btn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6
  },
  btnAttended: {
    flex: 1,
    backgroundColor: COLORS.success
  },
  btnMissed: {
    flex: 1,
    backgroundColor: COLORS.danger
  },
  btnExcused: {
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8
  },
  btnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  btnExcusedText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600'
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6
  },
  footerLink: {
    padding: 6
  },
  footerLinkText: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '600'
  },
  footerDismissText: {
    color: COLORS.textMuted,
    fontSize: 12
  }
});
