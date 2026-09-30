# Modeller gelmeden yapılacak işler — uygulama planı

Durum (30 Eylül 2026): Uygulama geliştirme başladı; Almanca arayüz ve şematik 3D prototip çalışıyor. P01/P02, onaylı K01 hesapları, P04/D03 prototip, P05 fiyat altyapısı ve P06 yerel kayıt kodlandı. PDF/gerçek montaj/AR kabulü tamamlanmadı. Aşağıdaki kartlar ilk planı korur; görevlerin güncel durumu ve sonraki devirler [Güncel durum ve aşamalarda](GUNCEL_DURUM_VE_ASAMALAR.md) bulunur.

Görsel tasarım kararı: [Luna/Sol tasarım planındaki](TASARIM_PLANI_LUNA_SOL.md) Schweng yerleşimi, cam menüler ve antrasit vurgu uygulanacak. D01–D04 kartları P03/P04/P07/P08'in ilgili tasarım ve bağlantı kapsamını tamamlar; eski genel marka beklentisi bu kararı ertelemez.

29 Eylül ek planı: onaylanan genişlik/derinlik, panel ve kolon kuralları ile Schweng arayüz incelemesinden doğan K01–K04 görevleri [Referans inceleme ve hesaplama planında](REFERANS_INCELEME_VE_HESAPLAMA_PLANI.md) bulunur. İlgili P02–P08 görevleri bu ek kapsam ve kabul ölçütleriyle birlikte uygulanacak.

29 Eylül güncellemesi: Prime, Premium ve Glasschiebewand kaynak modelleri artık yüklü ve ilk inceleme yapıldı. Bu belgedeki modelleri bekleyen genel görevler için güncel kararlar ve ek kabul ölçütleri [Ürün ve ölçü kurallarında](URUN_VE_OLCU_KURALLARI.md) yer alır. Aşağıdaki geçici geometri seçeneği bir test aracı olarak kalır; modellerin hiç bulunmadığı varsayımı artık geçerli değildir.

## 1. Netleşen bilgiler ve çalışma hedefi

- Kaynak modeller SketchUp 2026'da hazırlanmış; Prime, Premium ve Glasschiebewand dosyaları `Models` klasöründe mevcut. Daha sonra yeni ürünler eklenecek.
- Ana site şimdi Wix, ileride WordPress. Konfigüratör React + TypeScript + Vite ile bağımsız geliştirilip Vercel'de ayrı alt alan adından yayınlanacak.
- İlk sürümün hedefi seçim, ölçü, 3D, fiyat, PDF, kayıt ve telefonda AR. Ödeme sonraki aşamaya ait.
- Astra planlar, inceler ve hataları çözer. Sol ve Luna görevleri uygular; hata aldıklarında `Problems.md` akışına geçerler.

**Modellerin gelmesi başlangıç için gerekli değil.** Önce veri ve ekran altyapısı, basit geçici geometrilerle çalışan bir prototip hazırlanabilir. Bu prototipin tamamlanması, gerçek ürünün montajının veya AR görünümünün doğrulandığı anlamına gelmez.

İlk teslim hedefi: müşteri akışında seçim yap, ölçü değiştir, geçici 3D görünümü gör, taslağı aynı tarayıcıda yeniden aç ve örnek PDF indir. Gerçek fiyat, üretilebilirlik ve ürün görünümü ilgili veriler geldikçe etkinleşir.

## 2. Şimdi yapılabilir / bilgi veya model bekler

| İş | Şimdi yapılacak | Tamamlamak için gereken |
| --- | --- | --- |
| Müşteri akışı | Adımlar, mobil/masaüstü yerleşim, geri dönüş ve özet | Gerçek ürün seçenekleri ve marka bilgisi |
| Ölçü alanları | Birim, giriş doğrulama, açıklama ve hata durumları | Gerçek min/max değerler, ölçü adımları, net/dış ölçü tanımı |
| Ürün kuralları | Kural veri yapısı ve değerlendirme sistemi | Üreticinin kolon, profil, panel ve uyumluluk kuralları |
| 3D | Kamera, zemin, ölçü gösterimi, basit kolon/kiriş/panel temsilleri | Gerçek parçalar, bağlantı referansları ve montaj bilgisi |
| Fiyat | Kalemler, hesaplama sözleşmesi, yuvarlama ve güncelleme akışı | Fiyat tablosu, para birimi, vergi/montaj/nakliye kapsamı |
| PDF | Sayfa düzeni, seçenek özeti, örnek görsel, indirme | Gerçek marka, doğrulanmış fiyat ve model görseli |
| Kayıt | Sürümlü veri ve yerel taslak | Kalıcı paylaşım için sunucu/depolama kurulumu |
| AR | Dışa aktarma arayüzü ve geçici modelle teknik aktarım denemesi | HTTPS ortamı, gerçek telefonlar; son kabul için gerçek modeller |
| Yayın | Vercel yapılandırması ve yayın kontrol planı | Hesap/depo, alan adı ve DNS erişimi |

Bilinmeyen katalog değerleri gerçek ürün bilgisi gibi doldurulmaz. Prototipteki örnek veri ayrı tutulur ve “Demo — gerçek ürün/fiyat değildir” olarak işaretlenir. Gerçek fiyat yokken müşteri ekranında 0 veya uydurma toplam yerine “Fiyat henüz hesaplanamıyor” gösterilir.

## 3. Ekran planı

1. **Sistem:** ürün ailesi ve kurulum biçimi. Tek ürün varsa gereksiz seçim ekranı kaldırılabilir.
2. **Ölçüler:** genişlik, derinlik, arka yükseklik ve ön yükseklik; `URUN_VE_OLCU_KURALLARI.md` içindeki referans yüzleri gösteren şema.
3. **Görünüm ve çatı:** katalogdaki renkler, çatı malzemesi ve ilgili seçenekler.
4. **Ek seçenekler:** varsa yan kapamalar, sürgü cam, screen ve aydınlatma. Sadece ürünün izin verdiği seçenekler görünür.
5. **Özet:** ölçü/seçimler, fiyat durumu, PDF, kayıt/paylaşım ve “Bahçemde göster”.

- Masaüstü önerisi: büyük 3D alanı ve yanında bölüm seçim paneli; görünür fiyat özeti.
- Mobil önerisi: üstte 3D önizleme, altta seçimler; içerikle çakışmayan ilerleme ve özet alanı.
- Model yükleniyor, model yok, kayıt başarısız, PDF hazırlanıyor ve AR desteklenmiyor durumları ayrıca tasarlanır.
- Görünen metinler bileşenlerin içine dağılmaz. Planın dili Türkçe; müşteri arayüzünün yayın dili Almanca olarak kesinleşti. Bölümler doğrudan seçilir, numaralı ilerleme sayacı kullanılmaz.
- Marka gelene kadar sade, değiştirilebilir tasarım kullanılır. Nihai renk/font seçimi yapılmış sayılmaz.

## 4. Sonradan model eklemeyi kolaylaştıran yapı

Üç bölüm ayrı tutulacak:

1. **Konfigürasyon:** ürün kimliği, ölçüler, seçenek kimlikleri ve sürümler.
2. **Montaj tanımı:** hangi parçadan kaç adet gerektiği, ölçüsü ve yerleşimi. Gerçek kurallar gelene kadar yalnızca açıkça etiketlenmiş demo montajı bulunur.
3. **Görsel parçalar:** geçici geometri veya gerçek GLB dosyası. Arayüz doğrudan GLB içindeki mesh isimlerine bağlanmaz.

Fiyat ve parça listesi sahnedeki nesneler sayılarak türetilmez; doğrulanmış konfigürasyon ve katalog kurallarından hesaplanır. Böylece geçici model değişince fiyat mantığı değişmez.

Her parça kaydında planlanan alanlar: parça kimliği, dosya/sürüm, kaynak ölçü, eksen dönüşümü, montaj referansı, bağlantı noktaları, malzeme alanları ve uzama yöntemi. Gerçek modelde bulunmayan bilgiler tahmin edilmez. Parça geldiğinde pivot veya geometriye bağlı sınırlı uyarlama gerekebileceği kabul edilir.

Ölçüler mm olarak saklanır, 3D sınırında metreye çevrilir. Para hesabında birim ve yuvarlama kuralı açıkça tanımlanır. Kayıt/PDF/AR için aynı konfigürasyonun değişmez bir kopyası kullanılır; kullanıcı değişiklik yaptığında önceki fiyat ve çıktıların güncelliği kontrol edilir.

## 5. Astra'nın görev kartları

Aşağıdaki yollar geliştirmede oluşturulması önerilen dosya sınırlarıdır; henüz oluşturulmuş uygulama dosyaları değildir. Her kart tamamlandığında değişiklik, kontrol sonucu ve varsa problem kimliği raporlanır.

### P01 — Proje temeli

- **Sorumlu:** Sol. **Bağımlılık:** yok; uygulama aşaması başlatıldığında ilk teknik görev.
- **Kapsam/dosyalar:** proje ayarları, `package.json`, kilit dosyası, `src/app/`, test ayarları, `.env.example` ve kısa geliştirme rehberi.
- **Çıktı:** React + TypeScript + Vite başlangıcı; gereken bağımlılıklar, merkezi uygulama girişi ve hata durumu sınırı.
- **Kabul:** proje açılır, üretim derlemesi ve tip kontrolü geçer; eksik sunucu bilgisi uygulamayı çökertmez. Gizli anahtar kaynak kodda veya tarayıcı paketinde bulunmaz.
- **Kontrol:** derleme/tip kontrolü ve tek açılış kontrolü; gereksiz örnek testler yazılmaz.

### P02 — Konfigürasyon ve katalog sözleşmesi

- **Sorumlu:** Sol; Astra veri sözleşmesini inceler. **Bağımlılık:** P01.
- **Kapsam/dosyalar:** `src/domain/`, `src/catalog/`, `src/state/`; yalnızca test/önizlemeye ait demo katalog.
- **Çıktı:** sürümlü konfigürasyon, seçenek/ölçü şemaları, kural sonuçları ve uygulama durumu.
- **Kabul:** eksik bilgi ile geçersiz bilgi ayrılır; bilinmeyen ürün/seçenek reddedilir; mm dönüşümü tek yerde yapılır. Onaylanmamış kurallarla “üretilebilir” sonucu verilmez. Seçim değişince eski fiyat güncel gösterilmez.
- **Kontrol:** bozuk veri, bilinmeyen seçenek, ölçü birimi ve kayıt sürümü senaryoları.

### P03 — Arayüz ve tasarım sistemi

- **Sorumlu:** Luna. **Bağımlılık:** ekran taslağı için yok; uygulama için P01 ve P02 sözleşmesi.
- **Kapsam/dosyalar:** `src/ui/`, `src/features/configurator/`, `src/styles/`, `src/content/`.
- **Çıktı:** doğrudan seçilen bölümlerin uyarlanabilir yerleşimi, ölçü alanları, seçenek kartları, özet ve yükleme/boş/hata ekranları.
- **Kabul:** ileri/geri gezinmede seçim kaybolmaz; birimler görünürdür; klavye ve mobil dokunma ile kullanılabilir. Katalog dışı seçenek sabit kodlanmaz. Demo görünümünün geçici olduğu anlaşılır.
- **Kontrol:** dar telefon ve masaüstü genişliğinde görsel kontrol; klavye ile seçim/ilerleme. Fiyat hesabı Luna'nın bileşenlerine yazılmaz.

### P04 — Geçici 3D sahne ve model bağlantısı

- **Sorumlu:** Sol. **Bağımlılık:** P02; ekran yerleşimiyle bağlantı P03 sonrası.
- **Kapsam/dosyalar:** `src/features/viewer/`, `src/assets/manifest/`.
- **Çıktı:** kodla oluşturulan basit geometri, kamera, zemin, ölçü etiketleri; ileride gerçek GLB yükleyecek parça arayüzü.
- **Kabul:** ölçü değişimi doğru ekseni etkiler; mm→metre dönüşümü bir kez uygulanır; kamera modelin tamamını gösterebilir. Geometri gerçek üretim detayı gibi sunulmaz. Modelin yüklenememesi seçim formunu kullanılmaz hale getirmez.
- **Kontrol:** bilinen örnek ölçünün sahne sınırları; görünüm boyutu değişikliği; tekrar seçimde gereksiz nesne/bellek birikimi kontrolü.

### P05 — Fiyat hesaplama altyapısı

- **Sorumlu:** Sol. **Bağımlılık:** P02. Gerçek modelleri beklemez.
- **Kapsam/dosyalar:** `src/domain/pricing/`, `src/services/quote/`, ilgili sunucu fonksiyonu taslağı ve hesap testleri.
- **Çıktı:** fiyat kalemleri, fiyat sürümü, para birimi, kapsam, geçerlilik ve `hazırlanıyor / hazır / bilgi eksik / hata` durumları.
- **Kabul:** demo hesabı test ortamıyla sınırlıdır; gerçek hesap sunucuda doğrulanır. Eksik fiyat satırı sıfır sayılmaz. Eski bir isteğin geç dönen cevabı yeni seçimin fiyatını değiştiremez. Para birimleri karıştırılmaz.
- **Kontrol:** kontrollü örnek tutarlarla yuvarlama, eksik kalem, değişen konfigürasyon ve istemciden değiştirilmiş toplam. Gerçek fiyat kabulü, kullanıcının örnek hesapları gelince yapılır.
- **29 Eylül kesinleşen temel fiyat yolu:** adet bazlı örnekler aritmetik test olarak kalır. Gerçek temel fiyat `basePriceGrid.ts` → `buildGridQuote` → `respondToGridQuoteRequest` ile ürün/malzeme tablosundan alınır; 100/50 cm yukarı basamak, minimum fiyat 300/200 cm. Ayrıntılar ürün belgesi bölüm 8'de. Gerçek liste ve ekstra tarifeleri kullanıcı daha sonra sağlayacak; bağımsız işler bekletilmez.

### P06 — Taslak kaydı ve paylaşım hazırlığı

- **Sorumlu:** Sol. **Bağımlılık:** P02; çevrimiçi kısmı hizmet kurulumu gerektirir.
- **Kapsam/dosyalar:** `src/services/configurations/`, `src/features/save/`; ileride `supabase/migrations/` ve kayıt fonksiyonları.
- **Çıktı:** önce aynı tarayıcıda taslak kaydet/geri yükle; sonra aynı veri sözleşmesiyle sunucuda kaydet/bağlantıdan aç.
- **Kabul:** bozuk veya eski kayıt sessizce yanlış tasarıma dönüşmez. Yerel taslak “telefonda paylaşılabilir” olarak sunulmaz. Gerçek paylaşım bağlantısı konfigürasyonu sunucudan açar; sahibinin iletişim bilgisini içermez.
- **Kontrol:** sayfa yenileme, eski/bozuk kayıt ve çevrimiçi aşamada farklı tarayıcı/telefonla açma. Tahmin edilebilir kimliklerle başka kayıtların listelenmesine izin verilmez.

### P07 — PDF tasarımı ve üretimi

- **Sorumlu:** Luna PDF yerleşimi; Sol veri/görsel bağlantısı. **Bağımlılık:** P02; görsel için P04, fiyat durumu için P05.
- **Dosya sınırı:** Luna `src/features/pdf/template/`; Sol `src/features/pdf/service/`. Ortak veri tipi P02 kapsamında belirlenir.
- **Çıktı:** ölçüler, seçenekler, fiyat durumu, tarih ve konfigürasyon numarasıyla indirilebilir PDF.
- **Kabul:** uzun metinler taşmaz; karakterler doğru görünür; eksik fiyat “0” olmaz. Demo PDF belirgin şekilde örnek olarak işaretlenir. Görsel ve bilgiler aynı konfigürasyona aittir. Kalıcı paylaşım kurulmadan çalışmayan QR kodu basılmaz.
- **Kontrol:** kısa/uzun seçenek listesi, Türkçe karakterler, sayfa sonları; mevcut ortamda indirme/yazdırma ve sonraki cihaz aşamasında telefon kontrolü.

### P08 — AR aktarımının teknik hazırlığı

- **Sorumlu:** Sol. **Bağımlılık:** P04; telefonda deneme için erişilebilir HTTPS ortamı/depolama.
- **Kapsam/dosyalar:** `src/features/ar/`, `src/services/assets/`.
- **Çıktı:** seçili demo sahneyi GLB'ye dönüştürme, paylaşılabilir model URL'si ve model-viewer'a aktarma yolu; USDZ seçeneği ve AR durum ekranları.
- **Kabul:** dışa aktarılan model o andaki ölçü/seçimleri taşır; yardımcı ölçü çizgileri ve sahne zemini ürün modeline katılmaz. Tasarım değişince eski AR dosyası kullanılmaz. Destek yoksa normal 3D'ye dönüş vardır.
- **Kontrol:** export edilen GLB'nin ölçülerini tekrar yükleyerek doğrulama; ortam/cihaz sağlandığında Android ve iPhone denemesi. Cihaz yoksa bu kontrol “bekliyor” kalır; başarılı sayılmaz.
- **Sınır:** geçici modelin AR'de açılması gerçek SketchUp parçalarının cam/malzeme/ölçek kalitesini kanıtlamaz.

### P09 — Birleştirme ve önizleme hazırlığı

- **Sorumlu:** Sol teknik entegrasyon; Luna görsel kontrol; Astra kabul ve hata çözümü.
- **Bağımlılık:** ilk yerel teslim için P01–P07; AR gösterimi için P08 ve cihaz/ortam.
- **Kapsam/dosyalar:** `src/app/` bağlantıları Sol'da; `tests/e2e/`, Vercel ayarları ve yayın notları. Luna kendi arayüz alanında çalışır.
- **Çıktı:** tek akışta ölçü/seçenek değiştir → geçici 3D → kaydet/yeniden aç → PDF indir. Hesaplar hazırsa Vercel önizlemesi; değilse yerel teslim.
- **Kabul:** akış boyunca seçimler tutarlı; açık engelleyici problemler listeli; demo ve gerçek veri ayrımı korunmuş. DNS değişikliği veya canlı müşteri yayını bu prototip tesliminin parçası değildir.
- **Kontrol:** gerekli derleme/tip kontrolleri, anlamlı hesap testleri ve bir uçtan uca akış. PDF/3D görsel kontrolü ayrıca yapılır.

## 6. Uygulama sırası ve dosya sahipliği

1. Astra P02 sözleşmesinin kapsamını netleştirir; Sol P01'i uygular. Luna ekran taslağını hazırlayabilir.
2. P02 sözleşmesi tamamlanınca Luna P03'ü, Sol P04'ü yürütür.
3. Sol P05 ve P06'yı uygular. Luna ortak PDF veri sözleşmesiyle P07 yerleşimini hazırlar; Sol bağlantısını tamamlar.
4. P04 hazır olunca, uygun ortam varsa P08 teknik aktarım denemesi yapılır. Gerçek modeller gelirse diğer bağımsız işler sürerken gerçek model kontrolü öne alınır.
5. P09'da birleştirme ve ilk prototip teslimi yapılır. Astra açık hataları çözüp ilgili doğrulamayı tamamlar.

Sol `package.json`, kilit dosyası, ortak veri tipleri ve uygulama girişinin sahibidir. Luna yeni bağımlılık veya ortak tip değişikliğine ihtiyaç duyarsa Astra'ya bildirir; bu dosyaları eşzamanlı değiştirmez. PDF'deki iki sahiplik alanı ayrıdır. Görev devri açık dosya listesiyle yapılır.

Sol/Luna hatayı mevcut kanıtla `Problems.md` dosyasına kaydeder; kendi görev ve dosya sınırları içinde tek bir gerekçeli düzeltme yaklaşımı ve bir doğrulama turu uygular. Başarılıysa kanıtla kapatıp devam eder. Başarısızsa veya doğrulanamıyorsa ikinci deneme yapmadan Astra’ya devreder ve bağımlı işi durdurur; bağımsız işler sürebilir. Yetki/bilgi/güvenlik engelinde doğrudan devreder. Ayrıntılı ve bağlayıcı akış `AGENTS.md` içindedir. Normal bir testte beklenen geçersiz girdi sonucu hata değildir; beklenmeyen test/araç/uygulama başarısızlığı bu kurala tabidir.

## 7. Modeller geldiğinde yapılacaklar

1. **Küçük örnek seti incele:** bir kolon, kiriş, taşıyıcı, panel ve varsa bağlantı parçası; ayrıca ölçüsü bilinen tamamlanmış montaj.
2. **Aktarımı doğrula:** dosya, eksen, birim, pivot, yüz yönleri, malzemeler ve ölçek. Önce bir örnek; sonra tüm katalog.
3. **Parça eşleştirmesini yap:** geçici görsel parçaları gerçek varlıklara bağla; gerekiyorsa parçaya özel uzama/yerleşim yöntemini düzenle.
4. **Gerçek kuralları bağla:** kolon aralıkları, panel bölünmesi, profil seçimi, bağlantı payları ve aksesuar uyumu.
5. **Fiyatı doğrula:** kullanıcının verdiği örneklerle parça listesi ve tutarları karşılaştır.
6. **Gerçek PDF ve AR kabulü:** ekrandaki, PDF'deki ve telefondaki ölçü/renk/parçaların aynı olduğunu kontrol et; cam görünümü ve performansı hedef cihazlarda incele.
7. **Canlı yayın hazırlığı:** ürün verileri, fiyat kapsamı, marka/dil, kalıcı bağlantılar ve gerekli testler tamamlanınca yayın adımına geç.

Gerçek ürün kuralları, fiyatlar ve örnek modeller gelmeden ürünün satışa hazır olduğu ilan edilmez. Geçici şekilleri değiştirmenin her parça için otomatik ve zahmetsiz olacağı varsayılmaz.

## 8. Modeller olmadan verebileceğin bilgiler

Hepsini tek seferde hazırlaman gerekmiyor. İlk olarak **birinci ürünün kısa tarifi** yeterli:

- İlk ürün: …
- Duvara bağlı / bağımsız: …
- Çatı malzemesi ve seçenekleri: …
- Renkler: …
- Yan kapamalar / cam / screen / aydınlatma: …
- Yaklaşık ölçü aralıkları ve kesinleşmiş üretim sınırları: …
- Fiyat yöntemi: tablo / parça / m² / henüz hazır değil.
- Hedef ülke, yayın dili ve para birimi: …
- Site adresi ve varsa logo/marka rehberi: …

Yaklaşık aralıklar arayüz konuşmasına yardımcı olur; kesin üretim sınırı olarak kullanılmaz. Eksik cevaplar planın açık kararları olarak kalır.

## 9. Modelleri daha sonra açıklarken kullanabileceğin kısa şablon

```text
Parça adı / dosya adı:
Ne işe yarar, nereye bağlanır:
Gerçek ölçüsü ve birimi:
Sabit kalan kesit/ölçüler:
Uzayan veya kısalan yön:
Bağlantı noktası / referans ucu:
Malzemesi ve değişebilen renkleri:
Sol/sağ veya farklı ürün varyantları:
Diğer parçalarla uyum kuralı:
Varsa fiyat/ürün kodu:
```

Model dosyalarıyla birlikte bu açıklamalar ve bir referans montaj yeterli başlangıç sağlar. Modelleme programı SketchUp 2026 olarak kaydedildi; export seçenekleri dosyalar hazırlanırken kontrol edilecek. Daha önceki export rehberi ana teknoloji dosyasının 6. bölümündedir.
