# DevamTakip

Öncelikli yayın hedefi web. Dersler, yoklamalar ve ayarlar tarayıcıda saklanır. Hesap, sunucu veya otomatik cihazlar arası eşitleme yoktur.

## Çalıştırma

Node 22.13 veya üzeri kullanın.

```sh
npm ci
npm run web
```

## Doğrulama ve yayın çıktısı

```sh
npm run check
npm run build:web
```

Statik yayın klasörü `dist/` olur. Hosting sağlayıcısında proje kökü bu klasörün üstündeki ana proje, build komutu `npm run build:web`, çıktı klasörü `dist` olmalıdır.

HTTPS kullanın. Yeni sürüm aynı alan adı üzerinde yayımlanmalıdır; farklı alan adları ve portlar farklı yerel depolama alanlarıdır. Alan adı değiştirmeden önce kullanıcılar yedek almalıdır. `_headers` destekleyen statik servislerde temel güvenlik başlıkları uygulanır; diğer servislerde eşdeğer başlıkları tanımlayın.

CI lint, iş kuralları testleri, proje kapsamı TypeScript kontrolü ve web paketlemesini çalıştırır. JavaScript için tam tip denetimi açık değildir; lint tanımsız isimleri ve temel hataları yakalar. Üretim çıktısı ayrıca gerçek tarayıcıda test edilmelidir.

## Kullanım ve sınırlar

- Temiz kurulum boş başlar. Eski sürüm verileri korunarak tek snapshot depoya taşınır; örnek kayıtlar izinsiz silinmez.
- Aynı ders/gün/durum kaydı yeniden girilirse güncellenir. Farklı durumlarla kısmi katılım mümkündür; toplam saat ders süresini aşamaz.
- OCR saat ve limit tahmini yapar. Aktarım önizlemesinden her dersi düzenleyin. Okulun devamsızlık kuralını kullanıcı doğrulamalıdır.
- Web bildirimleri sayfa açıkken çalışır. Tarayıcı kapanınca veya sekme askıya alınınca zamanında gönderim garanti edilmez. Kapalı tarayıcıya bildirim için ayrıca push sunucusu, service worker ve abonelik altyapısı gerekir.
- Mobilde sınırlı sayıdaki yerel bildirim kuyruğu açılışta, ön plana gelişte ve veri değişikliklerinde yenilenir. Kuyruk biterken yenileme hatırlatması gösterilir.
- Varsayılan dönem ve tatiller İEÜ 2026–2027 içindir. Dönem tarihleri Ayarlar'dan değişir; sonraki yılların tatilleri kodda güncellenmelidir.
- Verileri silmeden önce Ayarlar'dan yedek indirin. JSON metnini yapıştırarak geri yükleyebilirsiniz. Son aktarımın öncesine dönme seçeneği vardır.
- OCR motoru ve dil dosyaları üçüncü taraf CDN'den indirilir; görsel cihazda işlenir. Çevrimdışı OCR garanti edilmez.

Yayın kontrolü: [docs/RELEASE.md](docs/RELEASE.md).
