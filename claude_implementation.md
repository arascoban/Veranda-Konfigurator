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

## 3. İş — Gerçek Prime/Premium modelleriyle parametrik 3D montaj (ilk sürüm çalışıyor)

**Sonuç:** Konfigüratör artık şematik kutular yerine SketchUp'tan gelen gerçek profil parçalarını yüklüyor ve girilen dört ölçüye göre monte ediyor. Prime ve Premium ayrı parça setleriyle çalışıyor; kolon sürükleme/ekleme/sayısal konum aynı model üzerinde çalışıyor (tarayıcıda doğrulandı). Şematik görünüm yükleme sırasında ve yükleme hatasında yedek olarak kalıyor.

**Kaynaktan web varlığına:**

- `tools/prepare_models.py` (`npm run models:prepare`): FBX → GLB dönüşümü `fbx2gltf` (devDependency, ikili dosya paketle gelir) ile; her parça ölçülür ve `src/assets/manifest/<ürün>.measured.json` dosyasına yazılır (cm sınır kutusu, üçgen sayısı, kaynak/çıktı SHA-256). `Models/` kaynakları değişmez; Premium oluk kapakları için MODEL-001'in onarılmış kopyaları kullanılır. Betik, LFS işaretçisi görürse durur (`git lfs pull` gerekir).
- Çıktılar `public/models/prime/` (9 parça, 436 kB) ve `public/models/premium/` (11 parça, 5,1 MB). `.gitattributes` ile bu klasör LFS dışında bırakıldı: web varlıkları küçük ve Vercel'de LFS ayarı olmadan yayınlanabilmeli. Kaynak FBX'ler LFS'te kalır.
- Premium tek parçalar toplam ≈57 bin üçgen; 559 bin üçgenlik referans montajın ağırlığı vidalardan geliyor. Monte edilmiş 530 cm Premium ≈130 bin üçgen; masaüstünde sorunsuz, telefon ölçümü yapılmadı.

**Kaynak modelden okunan ve KODA ALINAN yerleşim bilgileri (vorläufig):**

| | Prime | Premium |
| --- | --- | --- |
| Parça yönü (tek parça dosyaları) | 1 m ekstrüzyon, uzunluk ekseni −Z, kesit orijinde | 1 m ekstrüzyon, uzunluk ekseni +X |
| Referans montaj ekseni | Bahçe −Z yönünde, sol = x 0 | Bahçe +Z, sol = +X ucu (MODEL-001 notuyla uyumlu) |
| Oluk | 16,5 × 16 cm, ön yüzü kolon önünden 2,6 cm dışarıda | 20,4 × 16,6 cm, 3,2 cm dışarıda |
| Duvar profili | 5,5 × 16 cm | 6,3 × 19 cm |
| Kolon | 11 × 11 cm (montajda 11 × 13,5) — kullanıcı 11 × 12 dedi | 13 × 13,5 cm — kullanıcı 13 × 14 dedi |
| Taşıyıcı kesiti | 5,5 × 9,8 cm | 5,9 × 11,8 cm (uçlarda bağlantı parçalı, 107 cm dosya) |
| Taşıyıcı alt kenarı önde | oluk altından +31 mm, kolon önünden 53 mm içeride | +25 mm, 132 mm içeride |
| Taşıyıcı alt kenarı arkada | duvar profili altından +8 mm, duvardan 35 mm önce | +13 mm, 18 mm önce |
| Ara kapak (Zwischendeckel) | oluk arka üst kenarında ve duvar profili önünde, bölme eni c | aynı, kesit 3,7 × 11,2 |
| Panel | c + 3,2/3,5 cm, taşıyıcı üst kenarının 11 mm altında | 13 mm altında |
| Referans eğim | 5,7° | 12,2° (sınırın hemen üstü; referans yükseklikleri rastlantısal) |

Bu sayılar `src/catalog/attachmentReference.ts` (eğim kuralı için) ve `src/features/assembly/spec.ts` (yerleşim) içinde tek kaynaktan gelir; `confirmed: false`. Kural motoru artık eğimi bu vorläufig paylarla hesaplar; 5–12° dışı **geçersiz** sayılır ve `roof_attachment_offsets_provisional` uyarısı gösterilir. Kullanıcı SketchUp ekran görüntüleriyle doğrulayınca `confirmed: true` yapılacak ve sayılar düzeltilecek.

**Onay çizimleri:** `tools/draw_attachment_reference.py` (`npm run models:drawings`) → `design/review/MONTAGEBEZUEGE-prime.svg/.png` ve `-premium`: ölçülü yan kesit, ①–⑥ numaralı paylar. Kullanıcıya gönderildi.

**Kod yapısı:**

| Dosya | İçerik |
| --- | --- |
| `src/features/assembly/spec.ts` | Ürün başına montaj sabitleri + ölçülmüş parça verisi |
| `src/features/assembly/placements.ts` | Saf yerleşim hesabı (`buildAssemblyLayout`): her parça için sahne konumu, eksen tabanı (3 birim vektör, determinant +1 → aynalama yok), uzunluk ölçeği. `assemblyLayoutFromConfiguration` yalnız geçerli konfigürasyonda üretir; eğim sınır dışıysa yine çizer (müşteri hatayı görsün). Testli. |
| `src/features/assembly/assemblyScene.ts` | GLB yükleme önbelleği (`PartLibrary`), klonlama, rol bazlı malzemeler (alüminyum nötr metal — ürün rengi bilinmiyor; conta koyu; cam saydam / polikarbonat sütlü), kolon düzenleme yardımcıları (tutamaç silindirleri, halo, açıklık düzlemleri) |
| `src/features/viewer/PreviewViewer.tsx` | Önce şematik, parçalar yüklenince ürün modeli; `onProductModelStatusChange` (loading/ready/error) → ProfileInspector; seçili kolon emissive vurgu; DEV-only `?d03camera=px,py,pz,tx,ty,tz` kamera sabitleme (inceleme ekran görüntüleri için) |
| `src/features/viewer/schematicGeometry.ts`, `previewGeometry.ts` | Sahne çerçevesi değişti: **duvar yüzü z = 0, bahçe −Z, X içeriden bakışta soldan sağa.** Kamera bahçe tarafından bakar. |

**Sahne çerçevesi:** X = oluk sol ucundan (içeriden bakış) sağa, Y yukarı, Z: duvar 0, bahçe negatif. Prime referansı yalnız öteleme, Premium referansı Y ekseninde 180° dönüşle bu çerçeveye oturur (aynalama yok; sol/sağ kapaklar dosya adlarıyla uyumlu).

**Doğrulama:** 89 test, tip/üretim derlemesi. Tarayıcıda (Chromium, yazılım WebGL) 530×320 Prime ve Premium yükleme; 400×300'de yakın plan: oluk kapakları, duvar profili kapakları, yan taşıyıcı, ara kapaklar, paneller. Kolon ekleme, sayısal konum (klemp 90 cm/400 cm kurallarına), sürükleme ve geri alma gerçek modelde çalıştı; konsol hatası yok. Üretim paketi: PreviewViewer parçası 677 kB (Three + GLTFLoader).

**Bilinen eksikler / sonraki adımlar:**
- Montaj payları onaysız (yukarıdaki tablo). Kolon derinliği: kullanıcı 30 Eylül'de modeli esas aldı → 13,5 cm her iki üründe (`postSections`).
- Premium taşıyıcı dosyasındaki uç bağlantı parçaları uzunlukla birlikte ölçekleniyor (hafif bozulma). Sol/sağ yan taşıyıcının oluk yönü Premium'da görsel olarak doğrulanmadı.
- Premium duvar profili önündeki ince şerit (referansta ayrı parça, `Zubehör`?) ve Prime'daki iniş borusu (PfostenRohr) monte edilmiyor.
- Ürün rengi/malzeme kataloğu yok; alüminyum nötr gri gösteriliyor.
- Telefon performansı ve AR için GLB dışa aktarma hâlâ şematik modeli kullanıyor (`exportDemoGlb`); gerçek montajın GLB'si sonraki adım.

## 4. İş — Kullanıcı düzeltmeleri ve yeni kurallar (30 Eylül, ikinci tur)

Kullanıcının ekran görüntülü geri bildirimi ve yeni kuralları uygulandı:

| Konu | Karar / uygulama |
| --- | --- |
| Prime oluk kapağı | Her iki kapak oluğun kendi yönünde (`alongX`); önceki sürümde x = 0 ucundaki kapak 180° tersti. |
| Premium taşıyıcı 3 parça | `tools/prepare_models.py` taşıyıcı GLB'sini gövde (100 cm) + üst alüminyum şerit/kapak/contalar olarak böler; üst parçalar önde 5 cm, arkada 2 cm sabit taşkınlıkla (`rafter*Body/Top/TopFront/TopRear`). Gövde oluk ile duvar profiline bağlanır. Kesim için `shapely` gerekir. |
| Sol yan taşıyıcı | Referanstaki gibi aynalanmış bileşen (det −1); three.js'te dönüş + negatif z ölçeğiyle uygulanır (`applyPlacement`). |
| "Träger" → "Pfosten" | Tüm müşteri metinleri; çatı taşıyıcıları "Dachträger" olarak kalır. |
| Ayak düzenleme | Ayrı panel kaldırıldı. Modelde üzerine gelince ayak parlar (imleç ↔), tıklayınca seçilir; seçili ayakta sağ/sol hareket okları; sürükleme oluk boyunca; boşluğa tıklama/Esc seçimi kaldırır. Seçim panel ile paylaşılır (`selectedPostId`). |
| Pfosten bölümü | Numaralar ve konumlar **bahçeden bakışa göre soldan** (müşteri modeli bahçeden görür; konfigürasyon içi eksen içeriden-sol kalır, dönüşüm arayüzde). Düğmeler: Pfosten hinzufügen / entfernen / Felder gleichmäßig verteilen / Mindestanordnung. Prime: Pfostendeckel Gerade/Halb. Wasserablauf Links/Rechts (bahçeden bakış), 800 cm üstünde iki uçta zorunlu. |
| Ablauf ayağı | Prime `PfostenRohrMit{Gerade,Halb}Deckel`, Premium `PfostenMitRohr`; çıkış bahçeye bakar (Prime dosyalarında bahçe yüzü yerel +X → sahnede −Z döndürülür; Premium referans gibi 180°). |
| Başlangıç | `createDefaultConfiguration`: Prime, 500 × 300, ön 230 cm, arka 8°'den hesaplanır (273,2 cm), ayaklar tam uçta; model hemen görünür; diğer ürün arka planda ön yüklenir (`preloadProductParts`). |
| Eğim kuralı | `domain/adjustDimensions.ts`: derinlik/ön yükseklik değişince açı korunur ve arka yükseklik hesaplanır; arka yükseklik girilirse açı değişir ve yeni açı korunur; ürün değişiminde açı korunur. Arka sınırları 5°–12°'den anlık (`rearHeightRange`); ön 50–500 cm; sınır dışı giriş reddedilir (alan eski değere döner, sınır mesajı gösterilir). |
| +/− düğmeleri | Her ölçü alanında 1 cm adım, sınırlarda devre dışı. |
| Kolon derinliği | Modelden: 13,5 cm (her iki ürün). |

Doğrulama: 95 test; tarayıcıda varsayılan açılış (500/300/273,2/230, 8°), +1 cm ön → arka 274,2 ve 8° sabit, arka 400 reddedildi ("Zulässig sind 258,8–295,1 cm"), Premium'a geçişte 8° korunur, ayak seçiminde oklar görünür, 900 cm'de ablauf her iki uçta; yakın planlarda ablauf çıkışı bahçeye bakıyor, Premium taşıyıcı üst parçaları gövdenin üstünde, sol yan taşıyıcı doğru. Konsol hatası yok.

Açık: alan (Feld) üzerine gelince "+" arayüzü (Glasschiebewand vb.) ve ayakların terasın içine 1 m'ye kadar kaydırılması (destek profili gelince).

## 5. İş — Bemaßungen, model içi etkileşim, boru/ayak dilimleme (30 Eylül, üçüncü tur)

| Konu | Uygulama |
| --- | --- |
| Tıklayınca ayak kayması | Sürükleme 4 px eşikten sonra başlar (`drag.started`); salt tıklama sadece seçer. |
| Seçim işareti | Yerde düz halka + iki düz ok (RAL 7016 yönünde antrasit, `createSelectionMarker`); eski 3D silindir oklar kaldırıldı. Seçili/hover ayak emissive vurgu. |
| Feld hover/seçim | Alan düzlemi antrasit yarı saydam parlar, adı ("Front n", bahçeden soldan) ve "+" rozeti çıkar (`markSelectedOpening`, sprite). "+" şimdilik işlevsiz; Ausstattung ürünleri gelince menü olacak. |
| Bemaßungen | Sol üst araç çubuğu: geri/ileri/reset/**Bemaßungen** aç-kapa. `assembly/dimensions.ts` saf ölçü çizgisi listesi (Breite B, Tiefe A, Höhe hinten D, Gesamthöhe C, Durchgangshöhe E, her Feld için yüzden yüze "Breite Front n"), `extraLines` ile ileride diğer parçalar eklenebilir; `annotations.ts` çizgi + tik + canvas sprite etiket. |
| Ayak boru/kapak | `prepare_models.py` her ayak varyantını üç dilime böler (alt 25 cm, orta 50 cm, üst 25 cm); yalnız orta dilim esner → ablauf ağzı ve kapak bozulmaz (`post*Bottom/Mid/Top`). |
| Premium panel | Panel uzunluğu = taşıyıcı kapağı uzunluğu (önde 5 cm, arkada 2 cm taşkınlık dahil). |
| Prime uç taşıyıcılar | Oluk kapaklarının içine 4 mm alındı. |
| Sol panel | A–E ölçü görseli (`public/images/masse-abcde.jpg`, kullanıcının kendi render'ı) genişlik/derinliğin üstünde; etiketler Breite (B), Tiefe (A), Höhe hinten (D), Höhe vorne (E); salt okunur **Gesamthöhe (C)** = arka yükseklik + duvar profili (Prime 16, Premium 19 cm). |

Doğrulama: 95 test, derleme; tarayıcıda ölçü katmanı ve Feld etiketi ("Front 1"), boru ağzı bozulmadan, panel ucu kapakla hizalı, uç taşıyıcı kapak içinde; salt tıklama ayağı kaydırmıyor. Hata kaydı: `CLAUDE-K03-005` (üç dilimli ayak → alan düzlemleri üçe katlanmıştı).

## Gözlemler (henüz kayıt açılmadı)

- 1440×900 masaüstünde 3D tuval sahne alanının tamamını değil, fiyat kartının solunda kalan dikdörtgeni kaplıyor. Tasarım planındaki “kartın kapatmadığı alana ortalama” kararının sonucu olabilir; D04 son görsel kabulünde değerlendirilecek.
- Kayıt/PDF geri bildirim şeridi açıldığında sayfa içeriği ≈80 px aşağı kayıyor ve panel altbilgisi masaüstü görünümde ekran dışına çıkabiliyor. D04 görsel kabulünde ele alınacak.

## Açık kayıtlar (değişmedi)

`SOL-K01-001` (montaj referansları, fiziksel minimumlar), `SOL-P05-001` (gerçek fiyatlar), `SOL-P08-002` (HTTPS yayın/telefon AR) — **Bilgi bekliyor**.
