# Güncel durum ve bütün aşamalar

Tarih: 30 Eylül 2026. Sorumlu inceleme: Astra. Bu belge ilerleme durumunun güncel özetidir; ürün kuralları için `URUN_VE_OLCU_KURALLARI.md`, tarihli hata kanıtları için `Problems.md` geçerlidir.

## Şu an nerede olduğumuz

**30 Eylül 2026 devir:** Proje Claude tarafından devralındı; yapılan işler `claude_implementation.md` dosyasında. D04/P07 PDF, onaylı fiziksel sınırlar ve gerçek Prime/Premium parçalarıyla parametrik 3D montaj kodlandı (89 test, tip/üretim derlemesi başarılı). Aşağıdaki “Önce Luna / Ardından Sol” PDF kartları bu işle kapandı.

Yerelde çalışan, Almanca arayüzlü bir konfigüratör prototipi var. Ürün ve dört ölçü seçimi, onaylanmış çatı/kolon hesapları, şematik 3D, kolon düzenleme, açıklık seçimi, geri/ileri alma ve aynı tarayıcıda taslak kaydı çalışıyor. D03'ün prototip bağlantıları uygulanmış durumda; D02/D03'ün tam görsel, gerçek model ve gerçek cihaz kabulü tamamlanmış değil.

Prime/Premium ve Glasschiebewand kaynakları zaten yüklü. Kaynak ve hazırlanmış kapak klasörlerinde 33 FBX bulunuyor; bu klasörlerde web için hazırlanmış GLB henüz yok. Uygulamadaki Prime/Premium parça manifestleri boş. Müşterinin gördüğü sahne gerçek profillerden kurulmuş veranda değil, açıkça etiketlenmiş şematik geometridir.

Son kontrol: tip/üretim derlemesi başarılı; 16 dosyada 72 test başarılı. Astra, açıklık seçiminin kolon eklenince başka alana kayması ve boş kolon konumu girişinin sıfır kabul edilmesi hatalarını düzeltti. Her iki akış yerel tarayıcıda doğrulandı; hata günlüğü boş. Üretim derlemesinde Three görüntüleyici için yaklaşık 554 kB parça uyarısı sürüyor; gerçek model/cihaz optimizasyonu aşamasında ele alınacak, uyarı eşiği yükseltilerek gizlenmeyecek.

## Aşamalar

| Sıra | Aşama / mevcut görevler | Durum | Sorumlu / kalan iş |
| --- | --- | --- | --- |
| 1 | Araştırma, ürün ayrımı ve yayın mimarisi | Temel kararlar hazır | Astra. React/Vite, bağımsız Vercel uygulaması; Wix ve sonradan WordPress bağlantı verir. |
| 2 | Proje temeli — P01 | Tamamlandı | Sol uyguladı, Astra kontrol etti. Proje çalışıyor ve derleniyor. |
| 3 | Konfigürasyon ve ölçü kuralları — P02/K01 | Bilinen kurallar kodlandı; fiziksel sınırlar eksik | Sol + Astra. Gerçek bağlantı payları, minimumlar ve üretim hassasiyeti doğrulanacak. |
| 4 | Tasarım ve Almanca arayüz — D01/D02/P03/K02 | Taslaklar ve arayüz var; son kabul açık | Luna. Antrasit/cam menüler ve doğrudan bölüm seçimi var; gerçek %200 büyütme, klavye ve tüm durumların son kabulü yapılacak. |
| 5 | Şematik 3D ve arayüz bağlantıları — P04/D03 | Çalışan prototip | Sol; Astra hata incelemesi yapıldı. Kolon sürükleme, alan seçimi, geri/ileri alma ve durum mesajları var. Gerçek telefon FPS/GPU kabulü açık. |
| 6 | Kaydetme ve geri açma — P06 | Yerel kayıt var; bağlantıyla paylaşım yok | Sol. Çevrimiçi kayıt ve başka cihazdan açılan bağlantı için sunucu/depolama eklenecek. |
| 7 | Gerçek modelleri web için hazırlama — P04/K03 hazırlığı | Tamamlandı (Claude, 30 Eylül): `tools/prepare_models.py`, `public/models/`, ölçüm JSON'ları | Malzeme/renk kataloğu ve telefon performans ölçümü açık. |
| 8 | Gerçek parametrik veranda montajı — K03 | İlk sürüm çalışıyor (Claude, 30 Eylül); montaj payları **vorläufig** | Kullanıcı `design/review/MONTAGEBEZUEGE-*.png` çizimlerini onaylayacak/düzeltecek; kolon kesiti (11×12 mi 11×13,5 mi) sorulacak. Premium arka plan ön yükleme henüz yok. |
| 9 | Sürgü cam ve diğer açıklık ürünleri — K03/K04 | Kaynak modeller var, kurallar bekliyor | Sol + Luna. 3/4/5/6 ray aralıkları, yükseklik ve montaj boşlukları; açıklığa göre hazır model seçimi ve genişlik ölçekleme. |
| 10 | Gerçek fiyat — P05/K04 | Hücre seçimi/teklif altyapısı var; gerçek tutar yok | Sol. 530×320 → 600×350 ve minimum fiyat eksenleri 300/200 uygulanıyor. Gerçek liste, ekstra bedelleri ve fiyat kapsamı sonradan bağlanacak. |
| 11 | PDF — P07/D04 | İndirilebilir A4 Planungsentwurf çalışıyor (Claude, 30 Eylül) | Gerçek fiyat bağlanınca mağazanın tam teklif sonucunu PDF'e geçirmek; marka/logo gelince başlık. Ayrıntı: `claude_implementation.md`. |
| 12 | Bahçede AR ve masada profil AR — P08/K04 | Şematik GLB ve URL sözleşmeleri var; müşteri AR'si yok | Sol. Gerçek GLB, HTTPS depo, model-viewer bağlantısı, veranda/profil için ayrı durumlar; Android/iPhone kontrolü. |
| 13 | Birleşik kalite ve performans — D04/P09 | Kısmi kontroller var | Sol teknik; Luna görsel; Astra son kabul. 3D/fiyat/PDF/AR aynı sürüm, gerçek cihaz FPS/GPU, cam/opak görünüm, yükleme ve bellek kontrolü. |
| 14 | Önizleme ve canlı yayın — P09 | Yayınlanmadı | Sol hazırlık; Astra kontrol. Önce Vercel önizleme, sonra belirlenen alt alan adı ve Wix bağlantısı. WordPress'e geçiş uygulamayı yeniden kurmayı gerektirmez. |
| 15 | Doğrudan satın alma/ödeme | İlk sürümün dışında | Kullanıcı ileride istediğinde ayrı sipariş/ödeme planı. |

Bu aşamalar tek sıra bekleyen bir kuyruk değildir. PDF taslağı ve model varlığı hazırlama, fiyat listesi beklenirken ilerleyebilir. Üretim uygunluğu, gerçek fiyat ve telefon AR kabulü eksik bilgiler varmış gibi tamamlanamaz.

## Sonraki uygulama görevleri

### Önce Luna — D04/P07 PDF taslağı ve kalan görsel kabul

- Dosya sınırı: `src/features/pdf/template/`, kendi D02 alanları (`src/features/configurator/`, `src/ui/`, `src/styles/`, `src/content/`), `design/review/`. Paket/servis değişikliklerini Sol ile görev devrinde paylaşır.
- Kapsam: `PdfDocumentSnapshot` verisini kullanan Almanca, antrasit kimlikli baskı şablonu; ürün, dört ölçü, çatı malzemesi, taslak kimliği/tarihi, kolon/çatı özeti ve fiyat durumu. İlk sürüm şematik görseli açıkça taslak olarak etiketler.
- Kabul: A4 baskıda taşma ve kesilme yok; Almanca karakterler doğru; eksik fiyat “0 €” olmaz; çalışmayan QR eklenmez; “Planungsentwurf” ibaresi bulunur. Ekran tarafında %200 gerçek büyütme, klavye/odak, dar ekran, cam/opak durumları belgelenir.
- Bağımlılık: Gerçek fiyat listesi veya satışa onaylı model gerektirmez. Şablonun hazırlanması, PDF indirme bağlantısının bittiği anlamına gelmez.

### Ardından Sol — P07/D04 PDF üretimi ve indirme bağlantısı

- Dosya sınırı: `src/features/pdf/service/`, `src/app/`, gerekli `src/features/viewer/` görsel yakalama bağlantısı; gerekiyorsa paket/kilit dosyası. Luna'nın şablonuna eşzamanlı girmez.
- Kapsam: Şablondan indirilebilir PDF; güncel konfigürasyonun değişmez kopyası ve aynı sürümden görüntü; çalışma/hata durumları ve eski çıktının reddi.
- Kabul: Ölçü veya ürün çıktı sırasında değişince önceki belge güncel diye sunulmaz. Taslak/fiyat eksik durumu korunur. İndirilen gerçek PDF açılıp görsel olarak kontrol edilir; yalnız veri testi yeterli sayılmaz.

### Bağımsız Sol işi — P04/K03 web varlığı hazırlığı

- Dosya sınırı: `PreparedModels/` altındaki yeni türevler, `src/assets/manifest/`, hazırlama araçları ve model inceleme raporu. `Models/` kaynakları korunur.
- Kapsam: Önce referans Prime/Premium montajı ve bir temsilî profil için GLB dönüşümünü ve doğru fiziksel boyutu kanıtlamak; ardından parçalar. Kaynak/çıktı eşlemesi, eksen ve ölçü birimi kayıtlı olur.
- Kabul: GLB tekrar yüklenince kaynak ölçüleriyle karşılaştırılır; malzeme/normal ve görünüm incelenir; Prime ve Premium ayrı ürün kalır. Montaj bağlantı noktaları bilinmeden manifestte sahte sıfır pay verilmez. Bu hazırlık gerçek parametrik montaj kabulünden ayrıdır.

## Kullanıcıdan gerekenler

1. **Şimdi en faydalı bilgi: montaj referansları.** *Kullanıcı 30 Eylül: diğer bilgisayardan SketchUp ekran görüntüleriyle verilecek.* Claude referans modellerden okuduğu payları `design/review/MONTAGEBEZUEGE-prime.png` ve `-premium.png` çizimlerine ①–⑥ olarak işledi; onay veya düzeltme yeterli. Prime ve Premium için duvar profili–taşıyıcı ve oluk–taşıyıcı birleşimini gösteren ölçülü kesit veya SketchUp açıklaması. Hangi yüzlerin oturduğunu/ölçüldüğünü işaretlemek yeterli başlangıçtır; kot ve yatay bağlantı paylarını modelden biz çıkarıp seninle doğrulayabiliriz. Mevcut modelleri yeniden yüklemek gerekmiyor.
2. **Fiziksel sınırlar.** *30 Eylül'de alındı ve kodlandı:* min. genişlik 200 cm, min. derinlik 100 cm, kolon kesitleri (Prime 11×12, Premium 13×14 cm), yüzden yüze en az 90 cm açıklık, uç kolon dış yüzünden en fazla 50 cm içeride, varsayılan yerleşim tam uçta. *Hâlâ eksik:* ön/arka yükseklik aralıkları, panel/kapak minimum eni, kesim hassasiyeti, elle seçilebilir en fazla çatı bölmesi, kolonun derinlik yönünde hareketi.
3. **Sürgü cam tablosu.** *Kullanıcı 30 Eylül: referanslar sonra verilecek.* 3/4/5/6 ray için kesin genişlik aralıkları, yükseklik yöntemi/sınırları ve montaj boşlukları; eğimli yan taraftaki üst boşluğun nasıl tamamlandığı. 264–305 cm örneği kesin tablo olarak kullanılmayacak.
4. **Hazır olduğunda fiyat listesi.** Prime/Premium ve cam/polikarbonat tabloları; ekstra kolon/çatı bölmesi, sürgü/alüminyum/sabit cam bedelleri; KDV, montaj ve nakliye kapsamı. Daha sonra göndereceğin bilgisi kayıtlı; bağımsız işler için şimdi zorunlu değil.
5. **Görsel teslimden önce marka bilgisi.** Logo, müşteriyle paylaşılacak firma adı/iletişim bilgileri ve varsa ürün renk/opsiyon kataloğu. Arayüz vurgusunun RAL 7016 yönünde olması, ürün boya seçeneklerini kendiliğinden belirlemez.
6. **Yayın/AR aşamasında hesap ve telefon.** Alan adı/Vercel ve model depolama hesabı seçimi; test edilebilecek iPhone/Android modelleri. Giriş gerektiğinde hesabı kendin açabilirsin; şifre/tokenı bu dosyaya yazma. Gerçek model, bağlantı ve telefon testi hazır olduğunda birlikte AR ölçeğini kontrol edeceğiz.

## Açık kayıtlar ve hata akışı

- `SOL-K01-001`: gerçek montaj referansları ve fiziksel minimumlar; **Bilgi bekliyor**.
- `SOL-P05-001`: gerçek fiyatlar/kapsam; **Bilgi bekliyor**.
- `SOL-P08-002`: HTTPS yayın/depolama ve gerçek telefon AR; **Bilgi bekliyor**.
- Önceki `SOL-D03-005/006` tarayıcı/profil engelleri kapalı. D03 için yeni bulunan `ASTRA-D03-007/008` davranış hataları bu incelemede çözüldü.
- `Problems.md` içindeki kod bloğunda yer alan `PROBLEM-001` yalnız kayıt şablonudur; açık hata sayısına dahil değildir.
- Luna/Sol bir hata için bir gerekçeli çözüm denemesi yapar; sonuç alınamazsa aynı kaydı kanıtla Astra'ya devreder. Astra çözümü doğrulamadan bağlı işe dönülmez.
