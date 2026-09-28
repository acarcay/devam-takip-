import { Alert } from '../utils/alert';
import React, { useEffect, useState } from 'react';
import { View, Text, Platform, Switch, TextInput, Button, Share, Linking } from 'react-native';
import { StorageService } from '../services/storageService';
import { NotificationService } from '../services/notificationService';

export default function SettingsPanel({ settings, notificationStatus, onChanged, onRefresh }) {
  const [draft, setDraft] = useState(settings);
  const [backup, setBackup] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setDraft(settings); }, [settings]);
  if (!draft) return null;
  const run = async action => {
    if (busy) return;
    setBusy(true);
    try { await action(); } catch (e) { Alert.alert('İşlem tamamlanamadı', e.message); }
    finally { setBusy(false); }
  };
  const input = { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginVertical: 6, backgroundColor: '#fff' };
  const numeric = (key, title) => <View key={key}><Text>{title}</Text><TextInput accessibilityLabel={title} style={input} keyboardType="number-pad" value={String(draft[key])} onChangeText={v => setDraft({ ...draft, [key]: v })} /></View>;
  return <View style={{ gap: 12 }}>
    <Text style={{ fontSize: 20, fontWeight: '700' }}>Ayarlar</Text>
    {[[ 'notificationsEnabled', 'Ders hatırlatmaları' ], ['notifyAtEnd', 'Ders sonunda hatırlat (kapalıysa başlamadan önce)'], ['fridayRecapEnabled', 'Cuma haftalık özeti'], ['soundEnabled', 'Bildirim sesi']].map(([key, label]) => <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Text style={{ flex: 1 }}>{label}</Text><Switch accessibilityLabel={label} value={draft[key]} onValueChange={v => setDraft({ ...draft, [key]: v })} /></View>)}
    {numeric('notifyMinutesBefore', 'Ders başlamadan kaç dakika önce? (0–120)')}
    {numeric('fridayRecapHour', 'Cuma özeti saati (0–23)')}
    {numeric('thresholdWarningPercent', 'Risk uyarısı eşiği (%)')}
    <Text style={{ fontWeight: '700' }}>Dönem tarihleri</Text>
    <Text>Varsayılan takvim İEÜ 2026–2027 içindir. Kendi dönem tarihlerini aşağıdan değiştirebilirsin. Kayıtlı tatil istisnaları 2026–2027 ile sınırlıdır.</Text>
    {draft.teachingPeriods.map((p, i) => <View key={i}><Text>{p.name || `Dönem ${i + 1}`}</Text>{['start','end'].map(key => <TextInput key={key} accessibilityLabel={`${p.name} ${key === 'start' ? 'başlangıç' : 'bitiş'} tarihi`} placeholder="YYYY-AA-GG" style={input} value={p[key]} onChangeText={v => setDraft({ ...draft, teachingPeriods: draft.teachingPeriods.map((item,index) => index === i ? { ...item, [key]: v } : item) })} />)}</View>)}
    <Button disabled={busy} title="Ayarları kaydet" onPress={() => run(async () => {
      const next = { ...draft, notifyMinutesBefore: Number(draft.notifyMinutesBefore), fridayRecapHour: Number(draft.fridayRecapHour), thresholdWarningPercent: Number(draft.thresholdWarningPercent) };
      // Önce doğrula/kaydet; izin istemi yalnızca kullanıcının bu eyleminde açılır.
      await StorageService.saveSettings(next);
      if (next.notificationsEnabled) await NotificationService.requestPermissions();
      await onChanged();
      Alert.alert('Kaydedildi', 'Ayarların kaydedildi. Bildirim durumunu aşağıdan kontrol edebilirsin.');
    })} />
    <Text accessibilityLiveRegion="polite">{notificationStatus?.status === 'web' ? 'Web bildirimleri yalnızca bu sayfa açıkken çalışır. Sekme askıya alınırsa veya tarayıcı kapanırsa bildirim gelmeyebilir.' : notificationStatus?.status === 'unsupported' ? 'Bu tarayıcı bildirimleri desteklemiyor. Yoklamalarını program ekranından takip edebilirsin.' : notificationStatus?.status === 'scheduled' ? `${notificationStatus.count} hatırlatma planlandı. Son tarih: ${notificationStatus.through}. Kuyruğu yenilemek için uygulamayı düzenli aç.` : notificationStatus?.status === 'denied' ? 'Bildirim izni kapalı. Telefon ayarlarından izin ver.' : notificationStatus?.status === 'error' ? 'Bildirimler planlanamadı. Yeniden dene.' : notificationStatus?.status === 'empty' ? 'Planlanacak ders yok. Program ve dönem tarihlerini kontrol et.' : 'Bildirimler kapalı.'}</Text>
    {Platform.OS !== 'web' && <Button title="Telefon bildirim ayarlarını aç" onPress={() => run(() => Linking.openSettings())} />}
    <Button disabled={busy} title="Bildirimleri yeniden planla" onPress={() => run(onRefresh)} />
    <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 16 }}>Yedekleme</Text>
    <Text>Yedek kişisel ders ve yoklama bilgilerini içerir. Güvendiğin bir yerde sakla. Aktarım mevcut kayıtların yerine geçer.</Text>
    <Button disabled={busy} title="Yedeği paylaş / dışa aktar" onPress={() => run(async () => { const data = await StorageService.exportAllData(); setBackup(data); if (Platform.OS === 'web') { const url = URL.createObjectURL(new Blob([data], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = 'devam-takip-yedek.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); } else await Share.share({ message: data, title: 'DevamTakip yedeği' }); })} />
    <TextInput accessibilityLabel="Yedek metni" style={[input, { minHeight: 120 }]} multiline value={backup} onChangeText={setBackup} placeholder="Yedek metnini buraya yapıştır" />
    <Button disabled={busy || !backup.trim()} title="Yedeği geri yükle" onPress={() => Alert.alert('Yedek geri yüklensin mi?', 'Mevcut dersler ve yoklamalar değiştirilecek. Aktarım öncesi veriye geri dönebilirsin.', [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Geri yükle', onPress: () => run(async () => { await StorageService.importAllData(backup); await onChanged(); setBackup(''); Alert.alert('Tamamlandı', 'Yedek geri yüklendi.'); }) }])} />
    <Button disabled={busy} title="Son yedek aktarımını geri al" onPress={() => Alert.alert('Önceki verilere dön?', 'Aktarımdan sonra yaptığın değişiklikler kaldırılacak.', [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Geri al', onPress: () => run(async () => { await StorageService.restoreBeforeImport(); await onChanged(); }) }])} />
    <Button disabled={busy} color="#b42318" title="Tüm ders ve yoklamaları temizle" onPress={() => Alert.alert('Tüm kayıtlar silinsin mi?', 'Bu işlem geri alınamaz. Önce yedek almanı öneririz.', [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Sil', style: 'destructive', onPress: () => run(async () => { await StorageService.resetToDefaults(); await onChanged(); }) }])} />
    <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 16 }}>Verilerin ve yardım</Text>
    <Text>Derslerin ve yoklamaların bu cihazda saklanır; otomatik bulut yedeği yoktur. Tarayıcı verilerini temizlemeden, uygulamayı kaldırmadan veya cihaz değiştirmeden önce yedek al. Özel tarayıcı oturumunda veriler oturum sonunda silinebilir. Eski sürümden taşınan örnek dersleri istemiyorsan sil veya tüm kayıtları temizle.</Text>
    <Text>Görsel okuma cihazında yapılır. OCR motoru ve dil dosyaları internetten indirilir; bağlantı gereklidir. Görsel uygulamamız tarafından bir sunucuya yüklenmez. Dış sağlayıcılar indirme sırasında IP adresini görebilir.</Text>
    <Text>Devamsızlık sınırını okulunun kurallarına göre belirle. Uygulama yalnızca girdiğin kayıtları hesaplar; resmî yoklama sisteminin yerine geçmez. Aynı gün aynı durumu yeniden kaydetmek o kaydı günceller. Yanlış durumdaki kaydı Geçmiş ekranından silip yeniden girebilirsin.</Text>
    <Text>Bildirim sorunu için telefon izinlerini, dönem tarihlerini ve ders saatini kontrol et. OCR çalışmazsa metin aktarımını kullan. Kayıt hatası görürsen uygulamayı silmeden tekrar dene ve mevcut verini yedekle.</Text>
  </View>;
}
