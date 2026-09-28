import { Alert } from '../utils/alert';
import AddCourseModal from './AddCourseModal';
import React, { useState, useRef, useEffect } from 'react';
import {
  Modal, Platform,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  TouchableWithoutFeedback
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../constants/theme';
import { DAYS, getDayName } from '../constants/days';
import { OCRService } from '../services/ocrService';
import WebViewOCR from './WebViewOCR';

export default function OCRScanModal({ visible, onClose, onImportCourses }) {
  const [imageUri, setImageUri] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [rawOcrText, setRawOcrText] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [detectedCourses, setDetectedCourses] = useState([]);
  const [viewMode, setViewMode] = useState('OPTIONS'); // 'OPTIONS' | 'LOADING' | 'PREVIEW' | 'PASTE' | 'RAW_TEXT'
  const [showRawText, setShowRawText] = useState(false);

  const webViewRef = useRef(null);
  const ready = useRef(false);
  const pending = useRef(null);
  const timeout = useRef(null);
  const applying = useRef(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [engineKey, setEngineKey] = useState(0);
  const clearJob = () => { clearTimeout(timeout.current); pending.current = null; };
  const sendPending = () => {
    if (ready.current && pending.current && webViewRef.current) webViewRef.current.postMessage(JSON.stringify(pending.current));
  };
  useEffect(() => () => clearJob(), []);
  const parseText = text => {
    try { return OCRService.parseTimetableText(text); }
    catch (error) { Alert.alert('Metni kontrol et', error.message); return []; }
  };

  const pickImage = async () => {
    try {
      const { status } = Platform.OS === 'web' ? { status: 'granted' } : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Ders programı görselini seçebilmek için galeri izni gereklidir.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        base64: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        setImageBase64(asset.base64);

        // OCR Başlat
        setLoading(true);
        setViewMode('LOADING');
        setProgressPercent(15);
        setProgressStatus('Görsel taranıyor, OCR motoru çalışıyor...');

        clearJob();
        if (!asset.base64) throw new Error('Görsel okunamadı.');
        pending.current = { type: 'START_OCR', jobId: String(Date.now()), image: `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}` };
        timeout.current = setTimeout(() => {
          clearJob(); ready.current = false; setEngineKey(k => k + 1);
          setLoading(false); setViewMode('OPTIONS');
          Alert.alert('Tarama zaman aşımına uğradı', 'Bağlantını kontrol edip yeniden dene veya metin aktarımını kullan.');
        }, 90000);
        sendPending();
      }
    } catch (e) {
      console.error('Pick image error:', e);
      setLoading(false);
      setViewMode('OPTIONS');
      Alert.alert('Hata', 'Görsel seçilirken bir sorun oluştu.');
    }
  };

  // WebView'dan gelen mesajları işle
  const handleWebViewMessage = (data) => {
    if (data.type === 'READY') { ready.current = true; sendPending(); return; }
    if (!pending.current || (data.jobId && data.jobId !== pending.current.jobId)) return;
    if (data.type === 'PROGRESS') {
      setProgressPercent(data.percent || 50);
      setProgressStatus(data.status || 'Taranıyor...');
    } else if (data.type === 'SUCCESS') {
      clearJob();
      setLoading(false);
      const text = data.text || '';
      setRawOcrText(text);

      // Metni ders tablosuna ayrıştır
      const parsed = parseText(text);

      if (parsed.length > 0) {
        setDetectedCourses(parsed);
        setViewMode('PREVIEW');
      } else {
        // Metin okundu fakat regex ders kodlarını yakalayamadıysa metin düzenleme ekranını aç
        setPastedText(text);
        setViewMode('PASTE');
        Alert.alert(
          'Dersler Ayrıştırılamadı',
          'Görseldeki yazılar okundu fakat standart ders formatı tespit edilemedi. Okunan metni düzenleyebilir veya şablon yükleyebilirsiniz.'
        );
      }
    } else if (data.type === 'ERROR') {
      clearJob(); ready.current = false; setEngineKey(k => k + 1);
      setLoading(false);
      setViewMode('OPTIONS');
      Alert.alert(
        'Görsel Okunamadı',
        'Görseldeki yazılar ayrıştırılamadı. Lütfen metni yapıştırarak veya net bir ekran görüntüsüyle tekrar deneyin.'
      );
    }
  };

  const handleParsePastedText = () => {
    if (!pastedText.trim()) {
      Alert.alert('Metin Boş', 'Lütfen ders programı metnini yapıştırın.');
      return;
    }
    const parsed = parseText(pastedText);
    if (parsed.length === 0) {
      Alert.alert('Ders Bulunamadı', 'Metinden ders kodu veya saat okunamadı. Örnek: MAT101 Matematik 09:00 - 11:50 formatında olmalıdır.');
      return;
    }
    setDetectedCourses(parsed);
    setViewMode('PREVIEW');
  };

  const toggleCourseSelection = (index) => {
    const updated = [...detectedCourses];
    updated[index].selected = !updated[index].selected;
    setDetectedCourses(updated);
  };

  const handleApply = async () => {
    if (applying.current) return;
    const selected = detectedCourses.filter(c => c.selected);
    if (selected.length === 0) {
      Alert.alert('Seçim Yapılmadı', 'Lütfen en az bir ders seçin.');
      return;
    }

    applying.current = true;
    try { await onImportCourses(selected); handleClose(); }
    catch (error) { Alert.alert('Aktarılamadı', error.message); }
    finally { applying.current = false; }
  };

  const handleClose = () => {
    clearJob(); ready.current = false; setEngineKey(k => k + 1); setEditingIndex(null);
    setImageUri(null);
    setImageBase64(null);
    setPastedText('');
    setRawOcrText('');
    setDetectedCourses([]);
    setViewMode('OPTIONS');
    setLoading(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={handleClose}>
      
        <View style={styles.overlay}>
          
            <View style={styles.modalCard}>
              {/* Gizli WebView OCR Motoru */}
              <WebViewOCR key={engineKey} webViewRef={webViewRef} onMessage={handleWebViewMessage} />

              <AddCourseModal visible={editingIndex !== null} courseToEdit={editingIndex !== null ? detectedCourses[editingIndex] : null} onClose={() => setEditingIndex(null)} onSave={async course => { setDetectedCourses(items => items.map((item, i) => i === editingIndex ? { ...item, ...course } : item)); }} />
              {/* Header */}
              <View style={styles.header}>
                <View>
                  <Text style={styles.title}>Programı Otomatik Aktar</Text>
                  <Text style={styles.subtitle}>Ekran görüntüsü (OCR) veya metin ile ekle</Text>
                </View>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Kapat" onPress={handleClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* DURUM 1: OCR İŞLENİYOR */}
              {viewMode === 'LOADING' ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.primaryLight} />
                  <Text style={styles.loadingTitle}>Ekran Görüntüsü Okunuyor</Text>
                  <Text style={styles.loadingStatus}>{progressStatus}</Text>
                  
                  {/* Progress Track */}
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
                  </View>

                  <Text style={styles.loadingHint}>
                    Görsel cihazında işlenir. Okuma motoru ve dil dosyaları için internet bağlantısı gerekir.
                  </Text>
                </View>
              ) : viewMode === 'OPTIONS' ? (
                /* DURUM 2: SEÇENEKLER */
                <View style={styles.contentArea}>
                  {/* Seçenek 2: Görsel Yükle (Gerçek OCR) */}
                  <TouchableOpacity accessibilityRole="button" style={styles.optionCard} onPress={pickImage} activeOpacity={0.7}>
                    <View style={styles.iconCircle}>
                      <Ionicons name="scan-outline" size={24} color={COLORS.primaryLight} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.optionTitle}>Galeriden Yeni Ekran Görüntüsü Tara (OCR)</Text>
                      <Text style={styles.optionDesc}>Farklı bir döneme ait görseldeki dersleri Tesseract ile tara</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>

                  {/* Seçenek 3: OBS Metni Yapıştır */}
                  <TouchableOpacity accessibilityRole="button"
                    style={styles.optionCard}
                    onPress={() => setViewMode('PASTE')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.iconCircle}>
                      <Ionicons name="document-text-outline" size={24} color={COLORS.successText} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.optionTitle}>BYS / OBS Metnini Yapıştır</Text>
                      <Text style={styles.optionDesc}>Kopyaladığın ders listesini anında tabloya dönüştürür</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>
              ) : viewMode === 'PASTE' ? (
                /* DURUM 3: METİN YAPIŞTIRMA */
                <View style={styles.contentArea}>
                  <Text style={styles.fieldLabel}>Ders Programı Metni</Text>
                  <TextInput
                    style={styles.textArea}
                    multiline
                    numberOfLines={6}
                    placeholder="Örnek:&#10;MAT101 Matematik I Pazartesi 09:00 - 11:50 Amfi 1&#10;FIZ101 Fizik Salı 10:00 - 12:50 Lab 2"
                    placeholderTextColor={COLORS.textMuted}
                    value={pastedText}
                    onChangeText={setPastedText}
                  />
                  <View style={styles.btnRow}>
                    <TouchableOpacity accessibilityRole="button" style={styles.secondaryBtn} onPress={() => setViewMode('OPTIONS')}>
                      <Text style={styles.secondaryBtnText}>Geri</Text>
                    </TouchableOpacity>
                    <TouchableOpacity accessibilityRole="button" style={styles.primaryBtn} onPress={handleParsePastedText}>
                      <Text style={styles.primaryBtnText}>Tabloyu Ayrıştır</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* DURUM 4: ÖNİZLEME VE ONAY (GÖRSEL VE BULUNAN DERSLER) */
                <View style={styles.contentArea}>
                  {imageUri && (
                    <View style={styles.imagePreviewBox}>
                      <Image source={{ uri: imageUri }} style={styles.imageThumb} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.imageAttachedText}>Görsel başarıyla tarandı</Text>
                        <TouchableOpacity accessibilityRole="button" onPress={() => setShowRawText(!showRawText)}>
                          <Text style={styles.showRawTextBtn}>
                            {showRawText ? 'Okunan Metni Gizle' : 'Okunan Metni Gör'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {showRawText && rawOcrText ? (
                    <View style={styles.rawTextBox}>
                      <Text style={styles.rawTextContent} numberOfLines={8}>{rawOcrText}</Text>
                    </View>
                  ) : null}

                  <View style={styles.previewHeaderRow}>
                    <Text style={styles.previewCount}>
                      Tespit Edilen Dersler ({detectedCourses.filter(c => c.selected).length} / {detectedCourses.length})
                    </Text>
                    <TouchableOpacity accessibilityRole="button"
                      onPress={() => {
                        const allSelected = detectedCourses.every(c => c.selected);
                        setDetectedCourses(detectedCourses.map(c => ({ ...c, selected: !allSelected })));
                      }}
                    >
                      <Text style={styles.toggleAllText}>Tümünü Değiştir</Text>
                    </TouchableOpacity>
                  </View>

                  <Text>Ders saatleri ve devamsızlık sınırları tahmindir. Her dersi düzenleyip okulunun kurallarına göre doğrula.</Text>
                  <ScrollView style={styles.previewList} showsVerticalScrollIndicator={false}>
                    {detectedCourses.map((c, idx) => (
                      <TouchableOpacity accessibilityRole="button"
                        key={c.id || idx}
                        style={[styles.previewItem, c.selected && styles.previewItemSelected]}
                        onPress={() => toggleCourseSelection(idx)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={c.selected ? 'checkbox' : 'square-outline'}
                          size={20}
                          color={c.selected ? COLORS.primaryLight : COLORS.textMuted}
                        />
                        <View style={{ flex: 1 }}>
                          <View style={styles.previewTopRow}>
                            <Text style={styles.courseCode}>{c.code}</Text>
                            <Text style={styles.courseDay}>{getDayName(c.day)}</Text>
                          </View>
                          <Text style={styles.courseName} numberOfLines={1}>{c.name}</Text>
                          <Text style={styles.courseTime}>
                            {c.startTime} - {c.endTime} • {c.totalHoursWeekly} saat • Sınır: {c.maxAbsenceHours} saat
                          </Text>
                          <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${c.code} dersini düzenle`} onPress={() => setEditingIndex(idx)}><Text style={styles.showRawTextBtn}>Düzenle</Text></TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <View style={styles.btnRow}>
                    <TouchableOpacity accessibilityRole="button" style={styles.secondaryBtn} onPress={() => setViewMode('OPTIONS')}>
                      <Text style={styles.secondaryBtnText}>Yeniden Seç</Text>
                    </TouchableOpacity>
                    <TouchableOpacity accessibilityRole="button" style={styles.primaryBtn} onPress={handleApply}>
                      <Text style={styles.primaryBtnText}>Programa Ekle</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
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
    maxHeight: '88%',
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
    fontSize: 17,
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
  contentArea: {
    paddingBottom: 10
  },
  loadingContainer: {
    paddingVertical: 34,
    alignItems: 'center'
  },
  loadingTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 6
  },
  loadingStatus: {
    color: COLORS.primaryLight,
    fontSize: 13,
    marginBottom: 16
  },
  progressTrack: {
    width: '80%',
    height: 6,
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 16
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 3
  },
  loadingHint: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 20
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center'
  },
  optionTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2
  },
  optionDesc: {
    color: COLORS.textSecondary,
    fontSize: 11
  },
  fieldLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6
  },
  textArea: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 12,
    padding: 12,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 13,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 14
  },
  imagePreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 10,
    padding: 8,
    marginBottom: 10,
    gap: 10
  },
  imageThumb: {
    width: 44,
    height: 44,
    borderRadius: 6
  },
  imageAttachedText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '600'
  },
  showRawTextBtn: {
    color: COLORS.primaryLight,
    fontSize: 11,
    marginTop: 2
  },
  rawTextBox: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  rawTextContent: {
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 15
  },
  previewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  previewCount: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600'
  },
  toggleAllText: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '600'
  },
  previewList: {
    maxHeight: 260,
    marginBottom: 12
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 12,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10
  },
  previewItemSelected: {
    borderColor: COLORS.primaryLight,
    backgroundColor: 'rgba(99, 102, 241, 0.05)'
  },
  previewTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  courseCode: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '700'
  },
  courseDay: {
    color: COLORS.textSecondary,
    fontSize: 11
  },
  courseName: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginVertical: 1
  },
  courseTime: {
    color: COLORS.textMuted,
    fontSize: 11
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  secondaryBtnText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600'
  },
  primaryBtn: {
    flex: 2,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: 'center'
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700'
  }
});
