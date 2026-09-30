# Veranda konfigüratörü — Luna ve Sol tasarım planı

Tarih: 29 Eylül 2026. Planlayan: Astra. Durum: tasarım ve uygulama şartnamesi; bu belge geliştirmeyi başlatmaz.

## 1. Kullanıcının onayladığı görsel yön

- **Yerleşim:** daha önce incelenen Schweng S400 gibi solda yapılandırma paneli, sağda geniş 3D sahne; görünür fiyat ve çıktı kontrolleri.
- **Menü ve kart görünümü:** kullanıcının referans görselindeki yüzen, yuvarlatılmış, yarı saydam cam yüzeyler. Apple Liquid Glass benzeri hafiflik, kenar ışığı ve katman hissi hedeflenir; web üzerinde kendi tasarımımız uygulanır.
- **Ana vurgu:** turuncu yerine **RAL 7016 antrasit yönünde** koyu renk. Referans görselin sarı vurguları da antrasitle değiştirilir.
- **Karakter:** modern, sakin, hassas ölçü girmeyi kolaylaştıran bir ürün tasarlama aracı.
- **Kapsam:** konfigüratör sayfası. Ana Wix/WordPress sitesinin yeniden tasarımı bu işin parçası değildir.

Görsel kaynak: [Kullanıcının referans görseli](/Users/arascoban/Downloads/390f71e9c86fd7e6df3299ff0b55ac46.webp). Yerleşim kaynağı: [Schweng S400](https://konfigurator.schweng.eu/product/S400_canopy?config=xm7jd); gözlenen davranışlar [referans inceleme belgesinde](REFERANS_INCELEME_VE_HESAPLAMA_PLANI.md).

Referans görselden alınacak özellikler: cam kartlar, yumuşak köşeler, ince aydınlık kenarlar, kapsül düğmeler, sınırlı gölgeler ve rahat boşluklar. Büyük reklam başlığı, dağ/kulübe görseli, sarı renk, ortak çalışma avatarları, yorumlar ve AI araçları bizim müşteri akışına eklenmez. Veranda ve ölçüleri sahnenin odağında kalır.

## 2. Masaüstü yerleşimi

### Üst çubuk

- Yaklaşık 64 px yüksekliğinde sade bir başlık. Solda marka alanı ve ana siteye dönüş; ortada seçili ürün adı ve Prime/Premium seçimi; sağda Aç/Kaydet.
- Marka/logo henüz gelmediyse tipografik geçici ad kullanılır, sahte logo üretilmez.
- Konfigüratörün içine ikinci bir genel site menüsü yerleştirilmez. Wix/WordPress bağlantısından bağımsız olarak çalışır.

### Sol cam panel

- 1440 px örnek ekranda yaklaşık 344 px genişlik; dış boşluk 20 px, panel ile sahne arasında 20 px. Alt sınır 320, üst sınır 360 px.
- Cam bir ana kabuk içinde bölüm menüsü ve aktif bölümün ayarları bulunur. Bölümlerin metinleri tam okunur; beş uzun sekme dar bir satıra sıkıştırılmaz. Dar panelde açılır bölüm listesi kullanılır.
- Müşteri dili **Almanca**. Doğrudan seçilebilen bölümler: **Konstruktion, Dach, Ausstattung, Feld, Übersicht**. Kolon düzenleme Konstruktion altında; açıklık donanımı Feld altında. “Adım 1/5” / “Schritt 1 von 5” sayacı ve zorunlu sıra yoktur.
- Başlık/bölüm seçicisi ve İleri/Geri alanı sabit; uzun seçenekler yalnız panel gövdesinde kayar. Seçili alan kaydırma sırasında gizlenmez.
- Birincil bölüm tek seferde açık olabilir; önceki seçim kısa özet olarak görünür. Hata bulunan kapalı bölümde açıklayıcı işaret gösterilir.

### 3D sahne ve sahne üstü araçlar

- Sağdaki kalan alanı sahne kaplar; açık nötr arka plan ve yumuşak zemin gölgesi kullanılır. Varsayılan sahneye dikkat dağıtan çevre fotoğrafı konulmaz.
- Model, panel ve fiyat kartının kapatmadığı kullanılabilir alana ortalanır. Kamera hesapları yalnız tüm canvas boyutuna göre yapılmaz.
- Sahnenin üstünde küçük cam araç şeridi: geri al, yinele, ölçüler, görünümü sıfırla. İkonların erişilebilir adı ve masaüstünde kısa açıklaması bulunur.
- Bir kolon/açıklık seçildiğinde ilgili ölçü paneli sol bölümde açılır; sahnede kısa bir etiket ve hareket tutamacı görünür. Her parçaya kalıcı yüzen kart eklenmez.
- Sağ altta yaklaşık 280–320 px genişlikte kompakt fiyat/özet kartı; ana eylem **Özeti gör**, ikincil eylemler **PDF** ve **Bahçemde göster**. PDF/AR hazır değilse açıklayıcı durum sunulur.
- İlk sürümde satın alma veya sepete ekleme bulunmaz.

### Profil inceleme

- Seçilen parça için “Profili incele” eylemi, geniş bir inceleme penceresi açar. Ana tasarım korunur.
- Parça adı, seçili ürün, yakın 3D görünüm, mevcut gerçek ölçüler ve “Masamda incele” bulunur.
- Ayrıntılı model yüklenirken yükleme durumu gösterilir; başka satış ürününün parçası doğru teknik detay gibi kullanılmaz.
- Pencere kapatılınca önceki kamera ve kolon/açıklık seçimi geri gelir. Klavye odağı pencereyi açan kontrole döner.

## 3. Görsel tasarım değerleri

Aşağıdaki değerler ilk tasarım için Astra'nın başlangıç seçimleridir. Luna bunları merkezi tasarım değişkenleriyle uygular; farklı ekranlarda rastgele yeni ton/köşe/gölge üretmez.

| Alan | Başlangıç değeri | Kullanım |
| --- | --- | --- |
| Antrasit ana renk | `#383E42` | Ana düğme, seçili bölüm, güçlü vurgu |
| Antrasit etkileşim | `#2C3236` | Üzerine gelme/basılı durum |
| Ana metin | `#20272B` | Başlık, değer, etiket |
| İkincil metin | `#53616A` | Yardım ve ikincil açıklama |
| Sayfa zemini | `#EEF1F2` | Açık, hafif soğuk nötr zemin |
| Cam yüzey | Beyaz, yaklaşık %78 opaklık | Ana panel ve araç şeridi |
| Yoğun yüzey | Beyaz, yaklaşık %94 opaklık | Ölçü alanı, açılır liste, fiyat ve hata metni |
| Cam kenarı | Beyaz, yaklaşık %70; 1 px | Üst/yan kenarda hafif ışık |
| Kontrol sınırı | `#738089` | Giriş alanlarının ayırt edilebilir sınırı |
| Hata | `#A4263D` | Hata metni/ikonu; renk yanında açıklama |
| Başarı | `#286044` | Tamamlandı/geçerli durum; ikon ve metinle |
| Odak | Antrasit dış çizgi + açık ayırıcı | Açık/koyu zeminde klavye odağı |
| Panel köşesi | 24 px | Ana cam yüzeyler |
| Kart köşesi | 16 px | Seçenek ve içerik kartları |
| Giriş köşesi | 12 px | Ölçü alanları |
| Kapsül | Tam yuvarlak | Küçük araçlar ve ürün seçimi |
| Boşluk dizisi | 4, 8, 12, 16, 24, 32 px | Tutarlı iç/dış boşluklar |

`#383E42`, arayüz için seçilmiş yaklaşık dijital antrasit tonudur; RAL 7016'nın sertifikalı ekran karşılığı olduğu iddia edilmez. Gerçek boyalı ürünün görünümü malzeme/ışık ve fiziksel numuneyle ayrıca doğrulanır. **Arayüz rengi, müşterinin seçtiği veranda boya rengini değiştirmez.**

### Cam etkisinin uygulanışı

- Geniş yüzeylerde başlangıçta 16 px arka plan bulanıklığı; mobilde 8–12 px, ince parlak kenar, çok hafif üstten alta beyaz geçiş ve yumuşak gölge.
- Yalnız arkadaki içerik bulanıklaşır; yazı ve ikonlar keskin kalır. Bütün paneli bulanıklaştıran filtre kullanılmaz.
- İç içe kartlarda tekrar tekrar arka plan bulanıklığı uygulanmaz. Ana kabuk camdır; iç kontroller daha opak yüzey kullanır.
- Antrasit birincil düğme opaktır, yazısı beyazdır. Seçili kartta ince antrasit sınır ve onay işareti bulunur; yalnız saydamlık değişimine güvenilmez.
- Ağır kırılma/distorsiyon shader'ı, imleci takip eden sıvı animasyonu ve sürekli parlayan kenarlar ilk sürümde yoktur. Cam etkisi CSS ile uygulanır; bunun için yeni ağır görsel efekt paketi gerekmiyor.
- Cam efekti desteklenmiyorsa veya sade görünüm seçilmişse aynı ölçülerde opak açık panel kullanılır. İşlev ve yerleşim değişmez.

### Yazı, ikon ve hareket

- İlk sürümde sistem yazı ailesi: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`. Harici font indirmesine bağımlılık kurulmaz.
- Gövde ve ölçü girişleri 16 px; ikincil açıklamalar 14 px; bölüm başlıkları 20–24 px. Sayılarda hizalı rakamlar kullanılır; ondalık ve birim açık gösterilir.
- Tek bir çizgi ikon dili; tipik ikon 20 px, dokunma alanı en az 44 × 44 px. Yeni ikon bağımlılığı gerekiyorsa Sol ortak paket değişikliğini yönetir.
- Kısa geçişler 160–220 ms; opaklık ve küçük konum değişimiyle sınırlı. Panel boyutu/kamera sürekli yaylanmaz. Azaltılmış hareket tercihinde dekoratif geçişler kaldırılır.
- İlk tasarım açık tema olacak. Koyu tema ayrı kapsam kararı olmadan aynı anda geliştirilmez.

## 4. Telefon ve tablet

| Genişlik | Yerleşim |
| --- | --- |
| 1200 px ve üstü | Sol panel + geniş sahne + sahne alt sağında kompakt özet |
| 768–1199 px | Sol panel yaklaşık 304–320 px; fiyat/çıktı satırı sahnenin altında, model üstünü kapatmaz |
| 767 px ve altı | Kompakt başlık, üstte 3D, altta açılıp büyüyebilen cam ayar paneli |

- Telefonda panel sürüklenerek veya açık bir düğmeyle küçültülüp büyütülebilir. Panel hareketi ile kolon sürükleme birbirine karışmaz.
- “Modeli büyüt” görünümünde 3D ve temel araçlar öne çıkar; ölçülere dönmek için görünür düğme kalır. Ayarlar açılınca kamera/seçimler kaybolmaz.
- Telefon klavyesi açıldığında ölçü alanı ve hata mesajı görünür kalır. Fiyat/ilerleme alanı girişin üstüne binmez; ekran güvenli alanları ve değişken tarayıcı yüksekliği hesaba katılır.
- Dikey kaydırma 3D dışında doğal çalışır; sayfa gezinmek isteyen dokunma istemeden modeli döndürmez.
- Kısa yatay ekranlarda tek görünümü öne çıkaran panel geçişi kullanılır. Yetersiz yüksekliğe sabit bir 3D/panel oranı zorlanmaz.

## 5. İşlevlere uygulanacak görünüm ve durumlar

- **Ölçüler:** etiket + gerçek sayısal giriş + cm birimi; minimum/maksimum biliniyorsa yardımcı metin. Slider yalnız ek kolaylık olabilir, kesin sayı girişinin yerini almaz. Eğim sonuç olarak gösterilir.
- **Çatı:** cam/polikarbonat kartları, bölme sayısı ve taşıyıcı sayısı ayrı etiketlerle; ek bölmenin fiyat etkisi veri varsa gösterilir.
- **Kolon:** sahnede açık halo ve antrasit çizgiyle seçili durum; okunur ölçü etiketleri. İçerideki net boşluk ile merkezler arası mesafe etiketleri ayrılır.
- **Donanım:** önce açıklık seçilir, sonra uyumlu ürün kartları gösterilir. Uygun değilse neden aynı yerde açıklanır.
- **Ürün yükleme:** Prime/Premium seçimi kaybolmaz. Premium hazırlanırken durumu gösterilir; indirme tamamlanınca kendiliğinden ürün değiştirilmez.
- **Fiyat:** hesaplanıyor, hazır, bilgi eksik, güncel değil ve hata durumları ayırt edilir. Gerçek tarife yoksa 0 € gösterilmez.
- **PDF/AR:** hazırlık, tamamlandı, desteklenmiyor ve hata durumları; üst üste aynı işlemi başlatma önlenir. Masaüstünde AR için QR, telefonda uygun açılış eylemi.
- **PDF görünümü:** aynı yazı/renk hiyerarşisi kullanılır; baskı için beyaz ve opak yüzeyler. Cam efekti PDF'ye taşınmaz.
- **Hata mesajları:** neyin yanlış olduğu ve kullanıcının ne yapabileceği belirtilir. Form değerleri korunur; mesaj yalnız geçici bildirim olarak kaybolmaz.

## 6. Okunabilirlik ve performans kabulü

- Normal metin için en az 4,5:1, büyük metin ve temel kontrol/odak sınırları için en az 3:1 kontrast hedefi. Saydam yüzeyin arkasında hem açık hem koyu model bölgesi varken kontrol edilir; gerekirse yüzey opaklığı artırılır.
- Seçim, hata ve başarı yalnız renkle anlatılmaz. Klavye odağı görünür, bölüm ve seçenekler klavyeyle kullanılabilir; pencere/açılır liste odak yönetimi yapılır.
- 200% tarayıcı büyütmesinde alanlar kullanılabilir kalır; içerik veya birim kesilmez. 320 px genişlikte temel akış yatay sayfa kaydırması gerektirmez.
- Cam efektleri mevcut 3D bütçesini tüketmemeli: aynı model/kamera/ekran boyutunda cam açık ve opak durum karşılaştırılır. 30 FPS altındaki sürekli 3D etkileşim veya camın ölçülen kare süresini yaklaşık %15'ten fazla artırması Astra inceleme eşiğidir; hedef cihazlar kesinleşince kabul bütçesi güncellenir.
- Görsel efektler dışında sürekli UI animasyonu veya boşta çalışan UI çizim döngüsü eklenmez. 3D kalite ayarı, UI cam düzeyi ve satış ürünü kimliği birbirinden bağımsızdır.
- Destek kontrolü ve önceden tasarlanmış opak görünüm normal ürün davranışıdır. Sol/Luna beklenmeyen hata veya performans başarısızlığını bu görünümle gizleyip kabul edilmiş sayamaz.

## 7. Görevler, dosya sahipliği ve teslim sırası

Aşağıdaki kartlar dosya sahipliğini ve kabul ölçütlerini tanımlar; D01–D03'ün önemli bölümü uygulanmıştır. Güncel teslim durumu ve D04 devri [Güncel durum ve aşamalarda](GUNCEL_DURUM_VE_ASAMALAR.md) bulunur. P03/K02'nin görsel kapsamını bu belge somutlaştırır. Ürün hesabında [ürün kuralları](URUN_VE_OLCU_KURALLARI.md) geçerlidir.

### D01 — Görsel sözleşme ve ekran taslakları

- **Sorumlu:** Luna. **Bağımlılık:** bu plan; geliştirme başlangıcında Astra görevi açar.
- **Dosya sınırı:** `design/` içindeki tasarım belgeleri ve inceleme görselleri. Bu aşamada uygulama/ortak tip/paket dosyaları değişmez.
- **Kapsam:** 1440×900 masaüstü, 1024×768 tablet, 390×844 telefon taslakları; ürün/ölçü, çatı, seçili kolon, özet, profil inceleme örnekleri. Fiyat gösterilecekse açıkça demo olarak işaretlenir.
- **Kabul:** Schweng yerleşimi tanınır; cam menüler referansın hissini taşır; vurgu antrasittir; veranda görünür alanın odağıdır. Ölçü/fiyat metinleri güçlü biçimde okunur. Mobilde panel ve klavye davranışı açıklanır.
- **Teslim:** taslaklar, bileşen listesi ve durum tablosu; Astra tasarım incelemesi. Bu inceleme görev devridir, kullanıcıdan her küçük karar için tekrar izin isteme adımı değildir.

### D02 — Tasarım sistemi ve uyarlanabilir arayüz

- **Sorumlu:** Luna. **Bağımlılık:** D01 incelemesi, P01 altyapısı ve P02 veri sözleşmesi.
- **Dosya sınırı:** `src/styles/`, `src/ui/`, `src/features/configurator/`, `src/content/`. Luna alanındaki kök arayüz bileşeni dışarı aktarılır; uygulama girişine Sol bağlar.
- **Kapsam:** merkezi renk/yüzey değişkenleri, cam kabuk, düğmeler, girişler, seçenek kartları, bölüm menüsü, telefon paneli, durum mesajları ve profil/AR pencere kabukları.
- **Kabul:** tüm ekranlar aynı değişkenleri kullanır; opak görünümde bütün işlevler korunur; klavye, 320 px ve 200% büyütme kontrolleri geçer. Hesap/AR export mantığı görsel bileşenlere yazılmaz.
- **Teslim:** masaüstü/telefon ekran görüntüleri, kontrol sonucu, değişen dosyalar ve açık problem kimlikleri.

### D03 — 3D ve arayüz bağlantıları

- **Sorumlu:** Sol. **Bağımlılık:** D02 bileşen sözleşmesi, P02/K01 hesapları, P04/K03 sahne yapısı.
- **Dosya sınırı:** `src/app/`, `src/features/viewer/`, `src/state/`, `src/features/ar/`, gerekli servis bağlantıları; paket/kilit dosyası Sol'da. Luna'nın stil/bileşen dosyalarını paralel değiştirmez.
- **Kapsam:** sahne kullanılabilir alanı/kamera, kolon ve açıklık seçimi, olayların UI ile ayrılması, geri alma, yükleme/fiyat/PDF/AR durum bağlantıları, cam destek/sade görünüm durumu ve performans ölçümü.
- **Kabul:** panel tıklaması arkadaki kolonu seçmez; kolon sürüklenirken kamera dönmez; arayüz teması model rengini değiştirmez. Pencereden dönüşte seçim korunur. Çıktılar güncel konfigürasyonla eşleşir. İşlevsel değişiklik olmadan görsel efekt kapatılabilir.
- **Teslim:** çalışan akışın kanıtı, kullanılan model/ekran/cihazla performans ölçümü, gerekli derleme/tip kontrolleri ve açık problem kimlikleri.

### D04 — PDF uyumu ve ortak görsel kabul

- **Sorumlu:** Luna görsel/PDF yerleşimi; Sol veri/çıktı bağlantısı; Astra son inceleme.
- **Dosya sınırı:** Luna `src/features/pdf/template/` ve kendi D02 alanları; Sol `src/features/pdf/service/` ve D03 alanları. Ekran inceleme çıktıları `design/review/`.
- **Kapsam:** antrasit kimlikle baskıya uygun PDF; tarayıcıda son görsel akış, opak görünüm, gerçek model önünde kontrast; telefonda PDF/AR eylemleri.
- **Kabul:** mevcut PDF/AR kabul kuralları korunur; ekran görüntüsü, çıktı ve fiyat aynı tasarıma aittir. Mobilde model/ölçü/fiyat birbirini kapatmaz. Gerçek telefon testi yapılamadıysa “bekliyor” olarak raporlanır.
- **Kontrol:** 1440×900, 1024×768, 390×844 ve 320 px dar görünüm; açık/koyu sahne arkası; uzun metin; model yükleniyor; fiyat eksik; geçersiz ölçü; seçili kolon; profil inceleme; azaltılmış hareket ve opak görünüm. Başlangıç doğrulamaları geçtikten sonra gerekçesiz test tekrarı yapılmaz.

**Sıra:** D01 → Astra incelemesi → D02; Sol bu sırada bağımsız P01/P02/K01 altyapısında ilerleyebilir. D02 arayüz sözleşmesiyle D03 bağlanır; ardından D04. Aynı dosya iki kişiye eşzamanlı atanmaz. Her atamada model gerçekten Luna veya Sol olarak seçilir.

## 8. Hata akışı ve açık girdiler

- Sol/Luna hatayı mevcut kanıtla `Problems.md` dosyasına kaydeder; kendi görev ve dosya sınırları içinde tek bir gerekçeli düzeltme yaklaşımı ve bir doğrulama turu uygular. Başarılıysa kanıtla kapatıp devam eder. Başarısızsa veya doğrulanamıyorsa ikinci deneme yapmadan Astra’ya devreder ve bağımlı işi durdurur; bağımsız işler sürebilir. Yetki/bilgi/güvenlik engelinde doğrudan devreder. Ayrıntılı ve bağlayıcı akış `AGENTS.md` içindedir.
- Görsel kontrolde metin taşması, okunmayan alan veya hatalı panel konumu da bu akışa dahildir. Normal tasarım tercihi ile gözlenen başarısız kabul ölçütü ayrılır.
- Yayın dili Almanca olarak kesinleşti. Marka/logo ve gerçek seçenek renkleri ileride sağlanabilir. Bunlar temel yerleşim ve tasarım sistemi planını engellemez; taslakta gerçek bilgi gibi doldurulmaz.
- `MODEL-001` çözüldü. Sol kapaklar için `PreparedModels/Premium/Regenrinne/` kopyalarını ve `model-repairs/README.md` referansını kullanır; gerçek web/AR montaj kabulü ayrıca yapılır.
