# Web yayın kontrolü

## Tamamlanan uygulama işleri

- Tek snapshot ve sıralı yazım; hatalar kullanıcıya döner, başarısız yazım başarı sayılmaz.
- Boş başlangıç; yayın çıktısında test simülatörü gizli.
- Yerel tarih, dönem bazlı hafta, sınırlı haftalık rapor aralığı.
- Geçmiş tarih ve kısmi yoklama, toplam saat doğrulaması.
- Saat/gün/süre/limit doğrulaması; OCR toplu aktarımında tekrar ve çakışma kontrolü.
- OCR hazır olma mesajı, zaman aşımı, iptal, düzenlenebilir önizleme; web motoru.
- Web uyarı/teyit pencereleri, tarayıcı bildirim desteği kontrolü ve açık sekme sınırı açıklaması.
- Çalışan ayarlar, dönem düzenleme, yedek indirme/paylaşma, doğrulanmış geri yükleme, aktarımı geri alma.
- Proje kapsamı ayrımı, lint, otomatik testler, CI ve web build komutu.

## Yayın sahibinin belirleyeceği bilgiler

- Hosting hesabı ve alan adı henüz seçilmedi; canlıya yükleme yapılmadı.
- Destek e-postası henüz yok; hayali bir adres eklenmedi. Uygulama içinde sorun giderme bilgisi bulunur.
- Mobil mağaza kimlikleri ve imzalama web önceliği nedeniyle oluşturulmadı.

## Yayından önce tarayıcı matrisi

Chrome/Edge, Firefox ve iPhone Safari üzerinde:

1. Boş başlangıç → ders ekleme → tarih/saat değiştirme → yenileme sonrası kalıcılık.
2. Aynı gün kısmi yoklama, toplam saati aşma, yanlış tarih ve çakışan ders reddi.
3. OCR: görsel seçimi, büyük görsel, yavaş/kapalı internet, iptal, tekrar deneme, önizleme düzenleme.
4. Yedek indir → geri yükle → geri al; bozuk yedekte mevcut veri korunması.
5. Bildirim izni reddi ve desteklenmeyen tarayıcı; sayfa açıkken izinli bildirim.
6. Dar ekran, klavye açık form, klavye ile gezinme, ekran okuyucu etiketleri.
7. HTTPS sunum, cache güncellemesi, aynı alan adında sürüm geçişi.

Kapalı tarayıcı bildirimleri ve cihazlar arası eşitleme bu yerel veri sürümünde sunulmuyor. Bunlar için sunucu gereklidir.
