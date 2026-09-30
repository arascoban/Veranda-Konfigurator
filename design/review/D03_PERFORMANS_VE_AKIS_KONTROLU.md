# D03 performans ve akış kontrolü — 30 Eylül 2026

## Kapsam ve ortam

- Sürüm: yerel React/Vite konfigüratörü; Prime **şematik** 3D sahne. Gerçek ürün GLB montajı değildir.
- Kontrol sahnesi: genişlik 600 cm, derinlik 300 cm, arka yükseklik 300 cm, ön yükseklik 250 cm, cam çatı; 3 kolon merkezi (50, 300, 550 cm).
- Bilinen ortam: macOS 26.6.2 (25G83), yerel Vite 7.3.6. İşlemci, GPU, ekran yenileme hızı ve tarayıcı sürümü bilinmiyor.
- Önceki işlevsel kontrol: Codex uygulama içi tarayıcıda masaüstü görünüm yaklaşık 1280×720 CSS px; ayrıca 320×844 CSS px. Tarayıcı sürümü bilinmiyor. Gerçek telefon kullanılmadı.

## Nicel ölçüm durumu

| Görünüm | Sahne yüklenme süresi | Boşta rAF FPS / kare süresi | Kamera/kolon etkileşimi FPS / kare süresi | Durum |
| --- | ---: | ---: | ---: | --- |
| Masaüstü, yaklaşık 1280×720 CSS px | Ölçülemedi | Ölçülemedi | Ölçülemedi | Bekliyor |
| 390×844 CSS px | Ölçülemedi | Ölçülemedi | Ölçülemedi | Görünüm açıldı; FPS ölçümü bekliyor |
| 320×844 CSS px | Ölçülemedi | Ölçülemedi | Ölçülemedi | Bekliyor |
| Gerçek telefon ve gerçek ürün GLB | Ölçülemedi | Ölçülemedi | Ölçülemedi | Bekliyor |

Bu turda Sol oturumunda kullanılabilir uygulama içi tarayıcı yüzeyi yoktu: yerel sekme açma isteği `Browser is not available: iab` döndürdü, tarayıcı envanteri boştu. Chrome profil seçicisini inceleme isteği otomatik onay denetiminde özel profil bilgisi riski nedeniyle reddedildi. Kullanıcı daha sonra profili kendisi açtı; Sol CUA'sı normal `New Tab` penceresini gördü, fakat yeni IAB sekmesi açma isteği yine aynı hatayı verdi. Profil seçicisi tekrar görüntülenmedi. Kayıtlar `SOL-D03-005` ve `SOL-D03-006` içindedir. FPS ya da kare süresi sayısı üretilmedi.

Tarayıcı erişimi sağlandığında yöntem: aynı konfigürasyonu yükleyip ilk `ready` durumuna kadar süreyi, ardından en az 5 saniyelik `requestAnimationFrame` zaman damgalarının medyan ve 95. yüzdelik kare aralığını ölçmek; aynı örneklemeyi kamera döndürme ve kolon sürükleme sırasında yinelemek. CSS viewport ve cihaz piksel oranını kaydetmek; cam ve opak **arayüz** görünümünü aynı sahnede karşılaştırmak. Bu yöntem bu turda uygulanmadı.

### İsteğe bağlı geliştirme ölçeri

`PreviewViewer` yalnız geliştirme derlemesinde `?d03perf=1` açıkken mevcut `renderer.render` çağrılarının CPU çağrı süresini canvas `data-*` özelliklerine yazar. Son 120 çağrının örnek sayısı, ortalaması, 95. yüzdeliği ve en büyüğü sırasıyla `data-d03-render-cpu-samples`, `data-d03-render-cpu-avg-ms`, `data-d03-render-cpu-p95-ms`, `data-d03-render-cpu-max-ms` alanlarında bulunur. `data-d03-render-cpu-window=120` pencere boyutudur. Boşta yeni çizim başlatmaz; bu nedenle bu değerler **FPS, GPU süresi veya toplam kare süresi değildir**. Üretim derlemesinde bu ölçerin işaretleri bulunmadı (`dist` içinde `d03perf`/`d03RenderCpu` araması eşleşme vermedi). Ölçer eklendikten sonra `npm run build` ve 16 dosyada 69 test başarılıydı.

### Astra ölçümü — 30 Eylül 2026

Kullanıcının Chrome profilini kendisi seçmesinden sonra Astra'nın uygulama içi tarayıcı oturumu kullanılabilir oldu. 127.0.0.1:5174 adresindeki geliştirme önizlemesinde aynı 600×300 cm Prime şematik sahnesi kullanıldı. Her satırda “Ansicht zurücksetzen” eylemi 20 kez çalıştırıldı; eylem başına bir `renderer.render` örneği oluştu. Aşağıdaki artımlı ortalama, ölçerin iki ardışık kümülatif örnek sayısı ve yuvarlanmış ortalamasından hesaplandığı için yaklaşıktır.

| Görünüm / arayüz | Canvas piksel boyutu | Örnek sayısı | Artımlı `renderer.render` CPU ortalaması |
| --- | ---: | ---: | ---: |
| 1280×720 CSS px / cam menü | 1052×914 | 20 | yaklaşık 0,44 ms |
| 1280×720 CSS px / opak menü | 1052×914 | 20 | yaklaşık 0,35 ms |
| 390×844 CSS px / opak menü | 736×676 | 20 | yaklaşık 0,32 ms |
| 320×844 CSS px / opak menü | 604×676 | 20 | yaklaşık 0,29 ms |

İlk sahne kurulumu altı çağrı sonunda 5,02 ms kümülatif ortalama ve 29,40 ms en büyük CPU çağrısı verdi; bu ilk çizim maliyetini içerir. Dört karşılaştırma sıralı yürütüldüğü ve önbellek/ısınma etkisi ayrıştırılmadığı için cam–opak farkından güvenilir yüzde sonucu çıkarılmaz. 390 ve 320 px görünümünde yatay taşma 0 px, tarayıcı hata günlüğü boştu. Gerçek kamera/kolon sürükleme FPS'si, GPU süresi, toplam kare süresi ve gerçek telefon performansı hâlâ bekliyor. Bu rakamlar D03'ün 30 FPS ve cam ek yükü kabul eşiğini doğrulamaz.

## Önceki işlevsel ve görsel kanıt

- Masaüstünde 600×300 cm Prime şematik sahne, kolon düzenleyicisi ve fiyat paneli birlikte görünüyordu. Şematik model açıkça üretim çizimi olmadığı notuyla etiketlendi.
- 320 CSS px görünümde kolon düzenleyicisi, sahne ve araç çubuğu ayrı akış alanlarında kaldı. `document.documentElement.scrollWidth` ve `clientWidth` ikisi de 320 px ölçüldü.
- Geçerli kolon eksenlerinden türeyen “Feld 1” seçimi 250 cm **eksen aralığı** gösterdi; net açıklık olarak sunulmadı. Profil penceresi açılıp Escape ile kapatıldığında seçim korundu.
- Önceki tarayıcı oturumunda konsol hata günlüğü boştu. `pointercancel` davranışı kod/test ile doğrulandı; tarayıcıda gerçek iptal olayı tetiklenemedi.
- Cam/opak arayüz modu için sınırlı CPU çizim karşılaştırması yapıldı; gerçek cihaz performansı ve güvenilir kare zamanı karşılaştırması yapılmadı.

## Çıktı durumlarının sınırı

- Fiyat: gerçek temel fiyat hücreleri ve ekstra fiyat listesi henüz verilmediği için güncel konfigürasyona bağlanmış geçerli fiyat sonucu üretilemiyor (`SOL-P05-001`).
- PDF: satışa uygun içerik, fiyat ve son görsel şablon onaylanmadığı için uygulama `pdfStatus="unavailable"` bildiriyor; güncel konfigürasyon sürümüyle eşleşen çıktı henüz sunulmuyor.
- AR: gerçek Prime/Premium montajının web/AR kabulü yapılmadı (`SOL-K01-001`); uygulama `arStatus="unavailable"` ve profil AR için `profileArStatus="unavailable"` bildiriyor.
- Profil modeli: onaylı tekil ürün profili bağlanmadığı için `productModelStatus="missing"`. Şematik sahne gerçek profil veya üretim montajı yerine geçmiyor.

Son kod kontrolü geliştirme ölçeri eklendikten sonra `npm run build` başarılı ve 16 dosyada 69 test başarılıydı. Bu rapor FPS/gerçek cihaz performans kabulünü tamamlamaz.
