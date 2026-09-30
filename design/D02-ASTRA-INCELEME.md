# D02 — Astra hata çözümü ve devam kapsamı

30 Eylül güncellemesi: Aşağıdaki 29 Eylül bölümleri tarihçedir. Ana uygulama artık D02 kabuğuna bağlı; LUNA-D02-006 da çözüldü. D03 kolon/açıklık ve taslak akışları çalışıyor. Gerçek %200 büyütme ve tüm görsel durumların son kabulü açık; güncel devir `../GUNCEL_DURUM_VE_ASAMALAR.md` içindedir.

Tarih: 29 Eylül 2026. LUNA-D02-001, LUNA-D02-002, LUNA-D02-003 ve incelemede açılan ASTRA-D02-004 çözüldü. Ayrıntılı hata ve kanıt tarihçesi `Problems.md` içindedir.

## Doğrulanan kapsam

- Tip/üretim derlemesi başarılı; mevcut 14 test dosyasında 64 test geçti.
- D02 kabuğu geçici geliştirme girişinde stilleriyle tarayıcıda açıldı. Ana uygulama girişi henüz bu kabuğa bağlanmadı.
- Profil düğmesi ölçü panelinde çalışıyor; gönderilen React içeriği profil penceresinde görünüyor. Escape kapatınca odak açan düğmeye dönüyor.
- 1200 cm alanı düzenlenebilir; 1100 cm değişikliği özette 1.100 cm olarak görünüyor. Çift cm birimleri kaldırıldı.
- Numaralı adım veya zorunlu sıra yok; bölüm menüsü ve doğrudan özet bağlantısı var.
- Kontrol için açılan geçici giriş dosyaları, sunucu ve tarayıcı sekmesi kaldırıldı/kapatıldı.

## Luna için D02 devam görevi

Dosya sınırı: `src/styles/`, `src/ui/`, `src/features/configurator/`, `src/content/`; görsel kanıt ve teslim notları `design/review/` ve `design/`.

Kapsam: D02 tasarım sistemini tamamla; 1440×900, 1024×768, 390×844, 320 px ve %200 büyütmede görsel/klavye kabulünü yap. Cam/opak mod, uzun metin, eksik fiyat, yükleme/hata ve profil/özet durumlarını kontrol et. Kullanıcıya görünen metinler Almanca kalmalı. Tam D02 kabulü henüz verilmedi.

Kabul: `TASARIM_PLANI_LUNA_SOL.md` D02 ölçütleri; dar görünümde yatay taşma olmaması, işlevlerin erişilebilir kalması, pencere odak yönetimi, tüm gerekli stillerin bağlı olması. Hesap veya AR export kodu görsel bileşenlere eklenmez. Görsel kanıtlar ve kalan sorun kimlikleri teslim edilir.

Bu klasör şu anda Git deposu değildir. D02 başlangıcında Git durum kontrolü zorunlu değildir; Git diff elde edilmiş gibi raporlanmaz.

## Sol için sonraki D03 bağlantısı

- Kök bileşen: `src/features/configurator/index.ts` üzerinden `ConfiguratorShell`; props tipi `ConfiguratorShellProps`.
- Konfigürasyon, revision ve fiyat durumu tek kaynaktan bağlanmalı.
- `scene` veranda görünümü; `profileModel` ayrı profil görünümüdür.
- Veranda AR: `arStatus` / `onShowAr`. Profil AR: ayrı `profileArStatus` / `onShowProfileAr`. Birinin hazır olması diğerini etkinleştirmez.
- Ana uygulama girişi ve servis/3D bağlantısı Sol'un D03 dosya kapsamındadır. D02 kabulü tamamlanınca bağlanır.

Gerçek fiyat listesi (SOL-P05-001) ve montaj referansları (SOL-K01-001) hâlâ bilgi bekliyor; bağımsız D02 işini engellemiyor.

## Luna'nın 29 Eylül görsel kontrolü

Responsive önizlemede 1440×900 CSS, 1024×768, 390×844, 320×844 ve 640 CSS px / 2× gösterim incelendi. Beş ölçümde yatay taşma yok. Uzun durum metni, model yüklenirken, model/fiyat hata durumunda, opak görünümde ve profil penceresinde gezinme okundu. Açık kaydedilmiş görsel sorun **LUNA-D02-006**: mobil yükleme/hata simgesi sahne araç çubuğunun altında kısmen kalıyor; Luna'nın tek CSS denemesi yetmedi, Astra düzeltmesi gerekiyor. D02 tam görsel kabulü bu nedenle bekliyor. Kalıcı PNG kanıtı üretilemedi; tarayıcı görüntüleri oturum içinde incelendi. 640 CSS px 2× görünümü gerçek tarayıcı zoomu/telefon testi yerine geçmiyor.
