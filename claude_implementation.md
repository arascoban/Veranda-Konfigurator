# Claude uygulama kaydı

Bu dosya, 30 Eylül 2026'dan itibaren projeyi Astra/Luna/Sol yerine devralan Claude'un yaptığı işleri kaydeder. Rol ayrımı (plan/inceleme ve uygulama) artık tek elde; `AGENTS.md` içindeki ürün kuralları, hata akışı (`Problems.md`) ve “uydurma bilgi yok” ilkesi aynen geçerlidir. Claude kayıtları `CLAUDE-<görev>-<no>` kimliğiyle açılır.

## Devralma anındaki durum (30 Eylül 2026)

- Okunan belgeler: `AGENTS.md`, `GUNCEL_DURUM_VE_ASAMALAR.md`, `URUN_VE_OLCU_KURALLARI.md`, `TASARIM_PLANI_LUNA_SOL.md`, `MODELLER_ONCESI_UYGULAMA_PLANI.md`, `REFERANS_INCELEME_VE_HESAPLAMA_PLANI.md`, `Problems.md`, `README.md`.
- Başlangıç kontrolü (bulut ortamı, Node 22.22.2): `npm ci`, 16 dosyada 72 test ve üretim derlemesi başarılı. Bilinen tek uyarı: Three görüntüleyici parçası ≈554 kB.
- Sıradaki iş olarak belgelenen: D04/P07 PDF taslağı (Luna) → PDF üretimi/indirme bağlantısı (Sol). İkisi birlikte uygulandı.

## 1. İş — D04/P07 indirilebilir PDF taslağı (tamamlandı)

**Kapsam:** Güncel konfigürasyonun değişmez kopyasından Almanca, A4, antrasit kimlikli “Planungsentwurf” PDF'i üretmek ve tarayıcıda indirmek.

**Teknik karar:** `pdf-lib@1.17.1` (saf JS, sunucu gerektirmez). Standart Helvetica yazı tipi WinAnsi kodlamasıyla ä/ö/ü/ß/€/×/° karakterlerini destekler; harici font indirilmez. Kütüphane yalnız PDF düğmesine basılınca yüklenir (`renderPdf` ayrı parça, ≈435 kB / gzip ≈180 kB); ilk sayfa yükü artmadı. Görsel olarak Three sahnesinin ekran görüntüsü yerine, anlık kopyadan çizilen **vektörel şematik üstten görünüş** kullanıldı: aynı revizyona ait olduğu kesindir, WebGL yakalama/zamanlama sorunu yoktur ve “ürün görseli değil” etiketi açıkça basılır.

**Dosyalar:**

| Dosya | İçerik |
| --- | --- |
| `src/features/pdf/template/pdfTemplate.ts` | Anlık kopyadan bütün görünen metinleri ve çizim verisini üreten saf şablon (`buildPdfTemplate`). |
| `src/features/pdf/template/fixtures.ts` | Yalnız test örneği (ürün/fiyat verisi değildir). |
| `src/features/pdf/service/renderPdf.ts` | A4 yerleşim ve çizim (`renderPdfDocument`); metin kaydırma, sığmayan içerik için yeni sayfa, “Seite x von y”. |
| `src/features/pdf/service/pdfExport.ts` | `createPdfDraft`: revizyon kopyası → şablon → PDF; üretim sırasında revizyon değişirse sonucu `stale` olarak reddeder. `downloadPdf`, `createDraftDocumentId` (`PE-YYYYMMDD-XXXX`). |
| `src/features/pdf/service/documentSnapshot.ts` | Değişti: PDF artık yalnız eksiksiz ve geçerli konfigürasyonda (`requires_engineering_review`) üretilir; eksik ölçü/kolon düzeninde `invalid_configuration`. |
| `src/app/ConfiguratorApp.tsx` | PDF durumu (`unavailable/working/ready`), çift tıklama koruması, başarı/hata mesajları. |
| `src/features/configurator/ConfiguratorShell.tsx`, `components/PlanOverview.tsx`, `components/QuoteSummary.tsx` | PDF geri bildirimi sayfada ve Übersicht penceresinde; kullanılamaz durumda açıklayıcı metin. |
| `src/features/configurator/styles.css` | `CLAUDE-D04-002` düzeltmesi. |
| `package.json`, `package-lock.json` | `pdf-lib` eklendi (`CLAUDE-P07-001`). |

**PDF içeriği:** marka alanı (`de.brand`, geçici tipografik ad; sahte logo yok), “PLANUNGSENTWURF”, ürün + çatı malzemesi, taslak no/tarih (Europe/Berlin)/revizyon/katalog sürümü; Maße (4 ölçü, eğim “Noch nicht bestätigt”), Dach (bölme, taşıyıcı, yaklaşık panel eni), Stützen (adet, soldan eksenler, eksen aralıkları); şematik üstten görünüş (Hauswand altta, links/rechts duvardan bakışa göre, taşıyıcı çizgileri, kolonlar, genişlik/derinlik ölçü çizgileri); fiyat kutusu; Hinweise (bağlayıcı değil, teknik onay eksik, doğrulanmamış kural metinleri).

**Kabul ölçütleri ve kanıt:**

- Eksik fiyat hiçbir zaman “0 €” yazılmaz → “Preis noch nicht verfügbar” + neden (test).
- QR yok; “Planungsentwurf” ibaresi başlıkta, altbilgide ve dosya adında.
- Almanca karakterler: gerçek PDF'ten metin çıkarımıyla doğrulandı (Terrassenüberdachung, Maße, Höhe, Stützen, Achsabstände).
- A4 ve taşma yok: 1 sayfa, 595×842 pt; uzun içerikte ikinci sayfaya geçiş testi; çok uzun kelime kaydırma testi.
- Eski çıktının reddi: üretim sırasında revizyon değişince `stale` (test) ve Almanca hata mesajı.
- Tarayıcı: Playwright/Chromium ile 1440×900'de 530×320 Prime ve 390×844 mobilde 1000×350 Premium (Übersicht penceresinden) PDF indirildi; PyMuPDF ile görüntüye çevrilip gözle kontrol edildi. Konsol hatası yok. 1000 cm'de 4 kolon (50·350·650·950 cm) kural belgesiyle uyumlu.
- Son kontrol: `npm run check`, 19 dosyada 83 test, `npm run build` başarılı.

**Bilinçli sınırlar / sonraki adımlar:**

- Mağazadaki `QuoteState` tam `QuoteResult` (kapsam, geçerlilik, kalemler) tutmuyor; bu yüzden uygulama PDF'e şimdilik `quote: null` verir. Gerçek fiyat sunucusu bağlanınca mağaza tam sonucu saklamalı ve `createPdfDraft` okuyucusuna geçirilmeli (şablon hazır fiyatı zaten basar; testte doğrulandı).
- Firma adı/iletişim/logo gelince `de.brand` ve şablon başlığı güncellenecek.
- Gerçek profil montajı (K03) hazır olunca PDF'e ürün görseli eklenebilir; o zaman da aynı revizyon kuralı korunmalı.

## 2. İş — Onaylanan fiziksel sınırlar ve kolon kuralları (tamamlandı)

Kullanıcının 30 Eylül cevaplarıyla kodlandı (`URUN_VE_OLCU_KURALLARI.md` §2.1 ve §2.3 güncellendi):

| Kural | Değer | Kod |
| --- | --- | --- |
| Min. genişlik / derinlik | 200 cm / 100 cm, her ürün ve malzeme | `MIN_WIDTH_MM`, `MIN_DEPTH_MM`; `evaluateConfiguration` → `width_below_200_cm`, `depth_below_100_cm`; alanlarda “200–1.200 cm” aralığı |
| Kolon kesiti | Prime 11×12, Premium 13×14 cm (ilk sayı oluk yönü) | `postSections`, `postWidthMm` |
| Açıklık | Yüzden yüze, en az 90 cm | `clearOpeningMm`, `MIN_CLEAR_OPENING_MM`, `clear_opening_too_small` |
| Uç kolon | Dış yüz oluk ucunda başlar; en fazla 50 cm içeri (dış yüzden) | `flushEndPostCenters`; `validatePostCenters` yüz tabanlı; kolon oluğun dışına taşamaz |
| Merkez aralığı | 400 cm (Premium ≤600 cm'de 600) merkezden merkeze, değişmedi | `maxPostCenterGapMm` |

Etkileri: varsayılan yerleşim artık tam uçta (Prime 5,5 cm, Premium 6,5 cm merkez); Prime 900 cm'de 4 kolon çıkar. Sürükleme sınırları komşu kolonla 90 cm açıklığı korur; 200 cm'de üçüncü kolon eklenemez (80,5 cm kalır). Şematik 3D kolonları artık gerçek kesitte kutu olarak ve bahçe yüzü nominal derinlikte biter. Arayüz ve PDF “lichte Weite” (yüzden yüze) ile “Achsabstand”ı ayrı gösterir; PDF planında kolonlar ölçekli çizilir.

Doğrulama: 86 test; tarayıcıda 190×90 girişinde iki minimum hatası, 200×100'de 5,5/194,5 cm kolonlar, Premium'a geçişte 6,5/193,5 cm ve “Träger hinzufügen” devre dışı; konsol hatası yok.

## Gözlemler (henüz kayıt açılmadı)

- 1440×900 masaüstünde 3D tuval sahne alanının tamamını değil, fiyat kartının solunda kalan dikdörtgeni kaplıyor. Tasarım planındaki “kartın kapatmadığı alana ortalama” kararının sonucu olabilir; D04 son görsel kabulünde değerlendirilecek.
- Kayıt/PDF geri bildirim şeridi açıldığında sayfa içeriği ≈80 px aşağı kayıyor ve panel altbilgisi masaüstü görünümde ekran dışına çıkabiliyor. D04 görsel kabulünde ele alınacak.

## Açık kayıtlar (değişmedi)

`SOL-K01-001` (montaj referansları, fiziksel minimumlar), `SOL-P05-001` (gerçek fiyatlar), `SOL-P08-002` (HTTPS yayın/telefon AR) — **Bilgi bekliyor**.
