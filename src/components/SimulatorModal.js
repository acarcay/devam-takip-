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
import { COLORS, SHADOWS } from '../constants/theme';
import { NotificationService } from '../services/notificationService';

export default function SimulatorModal({
  visible,
  courses,
  onClose,
  onTriggerPopup,
  onSimulateMissed,
  onResetData
}) {
  const handleTestNotification = async () => {
    try {
      const sampleCourse = courses[0] || { name: 'Matematik I', code: 'MAT101', id: 'c-1' };
      await NotificationService.sendInstantTestNotification({
        courseName: sampleCourse.name,
        courseCode: sampleCourse.code,
        courseId: sampleCourse.id
      });
      Alert.alert('Bildirim Gönderildi! 🔔', 'Telefonunun bildirim merkezini kontrol et.');
    } catch (e) {
      Alert.alert('Bildirim Hatası', 'Bildirim gönderilemedi. Lütfen bildirim iznini kontrol et.');
    }
  };

  const handleTestFridayRecap = async () => {
    try {
      await NotificationService.sendInstantFridayRecapNotification();
      Alert.alert('Cuma Bildirimi Gönderildi! 📊', 'Haftalık özet bildirimi telefonuna iletildi.');
    } catch (e) {
      Alert.alert('Hata', 'Bildirim gönderilemedi.');
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      
        <View style={styles.overlay}>
          
            <View style={styles.modalCard}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.titleRow}>
                  <Ionicons name="flash-outline" size={24} color={COLORS.warningText} />
                  <View>
                    <Text style={styles.title}>Test & Simülasyon Merkezi</Text>
                    <Text style={styles.subtitle}>Gerçek saati beklemeden tüm özellikleri dene</Text>
                  </View>
                </View>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Kapat" onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={22} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
                {/* 1. Anlık Yoklama Popup Testi */}
                <TouchableOpacity accessibilityRole="button"
                  style={styles.simCard}
                  onPress={() => {
                    onClose();
                    onTriggerPopup(courses[0]);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.simIconBox, { backgroundColor: COLORS.primaryGlow }]}>
                    <Ionicons name="finger-print-outline" size={24} color={COLORS.primaryLight} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.simTitle}>Yoklama Pop-up'ını Hemen Aç</Text>
                    <Text style={styles.simDesc}>
                      Ders saati gelmiş gibi ekrana "Derse katıldın mı?" pop-up'ı çıkarır.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>

                {/* 2. Ders Saati Telefon Bildirimi Testi */}
                <TouchableOpacity accessibilityRole="button"
                  style={styles.simCard}
                  onPress={handleTestNotification}
                  activeOpacity={0.8}
                >
                  <View style={[styles.simIconBox, { backgroundColor: COLORS.warningBg }]}>
                    <Ionicons name="notifications-outline" size={24} color={COLORS.warningText} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.simTitle}>Ders Saati Telefon Bildirimi Gönder</Text>
                    <Text style={styles.simDesc}>
                      Cihazın bildirim paneline yerel ders yoklama uyarısı düşürür.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>

                {/* 3. Cuma Özeti Bildirimi Testi */}
                <TouchableOpacity accessibilityRole="button"
                  style={styles.simCard}
                  onPress={handleTestFridayRecap}
                  activeOpacity={0.8}
                >
                  <View style={[styles.simIconBox, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
                    <Ionicons name="calendar-outline" size={24} color={COLORS.secondaryLight} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.simTitle}>Cuma Özeti Bildirimi Gönder</Text>
                    <Text style={styles.simDesc}>
                      Cuma 17:00'deki haftalık karne bildirimini anında telefona yollar.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>

                {/* 4. Risk Alarmı Testi */}
                <TouchableOpacity accessibilityRole="button"
                  style={styles.simCard}
                  onPress={() => {
                    onSimulateMissed();
                    Alert.alert('Devamsızlık Eklendi', 'Dersin devamsızlığı arttırıldı! Renk değişimini ve uyarı eşiğini incele.');
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.simIconBox, { backgroundColor: COLORS.dangerBg }]}>
                    <Ionicons name="alert-circle-outline" size={24} color={COLORS.dangerText} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.simTitle}>Kritik Sınır Alarmını Tetikle</Text>
                    <Text style={styles.simDesc}>
                      Dersin devamsızlığını sınıra yaklaştırarak sarı/kırmızı alarmları test eder.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>

                {/* 5. Sıfırla */}
                <TouchableOpacity accessibilityRole="button"
                  style={[styles.simCard, { borderColor: 'rgba(239, 68, 68, 0.3)' }]}
                  onPress={() => {
                    Alert.alert(
                      'Sıfırlama Onayı',
                      'Tüm veriler varsayılan haline döndürülecek. Emin misin?',
                      [
                        { text: 'Vazgeç', style: 'cancel' },
                        { text: 'Sıfırla', style: 'destructive', onPress: onResetData }
                      ]
                    );
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.simIconBox, { backgroundColor: COLORS.dangerBg }]}>
                    <Ionicons name="refresh-outline" size={24} color={COLORS.dangerText} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.simTitle, { color: COLORS.dangerText }]}>
                      Verileri Başlangıç Haline Döndür
                    </Text>
                    <Text style={styles.simDesc}>Örnek ders ve kayıtları yeniden yükler.</Text>
                  </View>
                </TouchableOpacity>
              </ScrollView>
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
    marginBottom: 20
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 18,
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
    marginBottom: 10
  },
  simCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14
  },
  simIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  simTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3
  },
  simDesc: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 16
  }
});
