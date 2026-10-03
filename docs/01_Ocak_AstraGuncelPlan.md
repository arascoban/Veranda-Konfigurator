# Astra güncel düzeltme ve PDF uygulama planı

Hazırlanma tarihi: 1 Ekim 2026. Dosya adı kullanıcının istediği biçimde korunmuştur.

Durum: Plan hazır; bu belgeyle uygulama kodunda değişiklik yapılmadı. Aşağıdaki kabul ölçütleri henüz tamamlanmış sayılmaz.

## 1. Kapsam ve uygulama ilkesi

Bu belge, Astra'nın mevcut uygulama üzerinde yaptığı incelemede bildirdiği yedi sorunun çözümünü ve kullanıcının yeni PDF teslim akışını kapsar. Kullanıcıdan istenecek bilgi listesi ve diğer bilinen geliştirme işleri bu belgeye dahil edilmez.

- Uygulayıcı mevcut projeyi devam ettirir; çalışan montaj ve ürün kuralları yeniden yazılmaz.
- Müşteri arayüzü, PDF ve e-posta Almanca olur.
- Prime ve Premium ayrı satış ürünleri olarak kalır. Görseller seçili ürünün gerçek parça montajından oluşturulur.
- Her iş aşağıdaki dosya sınırı ve kabul ölçütüyle tamamlanır. Yeni dosya adları öneridir; eşdeğer mevcut yapı varsa tekrar kullanılabilir.
- Uygulama sırasında sorunlar mevcut `Problems.md` kayıt akışına göre işlenir; eski kayıtlar silinmez. Claude yaptığı işleri `claude_implementation.md` dosyasına kaydeder. Sol/Luna görev alırsa bir gerekçeli düzeltme denemesi ve ardından Astra'ya devir kuralı geçerlidir.
- PDF metinleri, ölçüler, seçenekler ve beş görüntü aynı değişmez konfigürasyon kopyasına ve revizyona dayanır.

## 2. İnceleme başlangıç kanıtı

İncelenen yerel ortamda:

- `pdf-lib` paket ve kilit dosyalarında tanımlı, ancak kurulu bağımlılıklar arasında bulunamadı.
- Tip kontrolü ve dosya yazmadan yapılan üretim derlemesi bu eksiklik nedeniyle başarısız oldu.
- 21 test dosyasının 19'u geçti, 2'si başarısız oldu. Çalıştırılabilen 92 testin 90'ı geçti, 2'si başarısız oldu; ayrıca PDF çizim test dosyası bağımlılık eksikliğinden yüklenemedi. Bu sonuç, bütün PDF kodunun bozuk olduğu anlamına gelmez.
- Prime/Premium gerçek montajları tarayıcıda açıldı. İlk sürüklemenin yalnızca seçim yapması ve boş profil penceresinin hazır görünmesi tarayıcıda doğrulandı.
- PDF açıklık sıralaması ve eksik seçenekler şablon verisi üzerinden doğrulandı. Bu incelemede yeni PDF dosyası görsel kabulden geçirilmedi.
- Çözünürlük hatası yerel EffectComposer davranışıyla doğrulandı. Malzeme temizliği sorunu kodda görüldü; uzun kullanımda bellek etkisi henüz ölçülmedi.

## 3. Hata düzeltme görevleri

### ASTRA-GP-01 — Bağımlılık kurulumu ve PDF derlemesi

**Sorun:** `pdf-lib` çözümlenemediğinden tip kontrolü, üretim derlemesi ve PDF testleri tamamlanamıyor.

**Dosya/kapsam sınırı:** `package.json`, `package-lock.json`, yerel bağımlılık kurulumu; doğrulama için mevcut PDF testleri. Kaynak modeller bu işe dahil değildir.

**Çözüm:**

1. Manifest, kilit dosyası ve kurulu paketleri karşılaştır; eksik veya yarım kurulumu teşhis et.
2. Kilitte tanımlı sürümlerle bağımlılık kurulumunu tamamla. Gereksiz paket yükseltmesi veya kilit dosyasını baştan üretme yapma.
3. Önce PDF testlerini, sonra tüm testleri, tip kontrolünü ve üretim derlemesini çalıştır.
4. Kurulum sonrasında kalan gerçek kod hatalarını bağımlılık hatasından ayrı kaydet. Test silme veya başarısız beklentileri gevşetme yapma.

**Kabul:** Temiz kurulumla tip kontrolü, tüm mevcut testler ve üretim derlemesi geçer. PDF oluşturma/indirme gerçekten çalışır. Güncel test sayısı teslimde yazılır; eski 95 test notu otomatik başarı kanıtı sayılmaz.

### ASTRA-GP-02 — Kolonun ilk hareketle sürüklenmesi

**Sorun:** Seçilmemiş kolon ilk sürüklemede yalnızca seçiliyor, ikinci sürüklemede taşınıyor. Parent bileşende her render sırasında yenilenen callback, seçim güncellenince pointer effect'inin temizlenmesine ve aktif sürüklemenin kaybolmasına yol açıyor.

**Dosya sınırı:** `src/app/ConfiguratorApp.tsx`, `src/features/viewer/PreviewViewer.tsx`, `src/features/viewer/postEditing.ts` ve ilgili testler.

**Çözüm:**

1. Kolon düzenleme callback'lerini kararlı hale getir; aktif pointer oturumunu yalnızca görsel seçim güncellemesi nedeniyle yeniden kurma.
2. Sürükleme oturumunu render'dan bağımsız sakla; güncel konfigürasyona erişimde eski closure kullanma. Gerçek ürün/konfigürasyon değişiminde güvenli iptal uygula.
3. Pointer capture, kamera kilidi ve seçim davranışını tek yaşam döngüsünde yönet.
4. Sadece tıklama kolonu oynatmasın; sürükleme tek geri alma adımı oluştursun.
5. İptal, Escape veya pointer capture kaybında kolonla birlikte canlı ölçü etiketlerini ve hareket sınırı oklarını da başlangıç değerlerine döndür.

**Kabul:** Önceden seçilmemiş kolon ilk basılı tutup sürüklemede hareket eder. Hareket sırasında kamera dönmez. Bırakma bir revizyon/geri alma adımı oluşturur; iptal hiç oluşturmaz. Seçili kolon, başka kolon, hızlı seçim değişimi ve dokunmatik pointer akışları ayrıca denenir. Yalnız saf hesap fonksiyonu testi yeterli değildir; gerçek etkileşim doğrulanır.

### ASTRA-GP-03 — Profil detayının doğru yükleme durumu

**Sorun:** Ana veranda montajı hazır olunca tekil profil penceresi de hazır gösteriliyor; pencereye gerçek profil görünümü verilmemiş.

**Dosya sınırı:** `src/app/ConfiguratorApp.tsx`, `src/features/configurator/ConfiguratorShell.tsx`, `src/features/configurator/components/ProfileInspector.tsx`; gerekiyorsa yeni tekil profil görüntüleyicisi ve mevcut parça yükleme katmanı.

**Çözüm:**

1. Ana montajın yükleme durumunu profil detayının yükleme durumundan ayır.
2. Profil görünümü bağlanana kadar doğru biçimde mevcut değil/yükleniyor/hata durumunu göster; başarı mesajı üretme.
3. Seçili ürünün mevcut taşıyıcı parçasını veya gerekli alt parçalardan oluşan profil grubunu izole görüntüleyiciye bağla. Premium yerine Prime kesiti gösterme.
4. Ürün değişince eski detay görüntüsünü ve gecikmiş yükleme cevaplarını yeni ürün adına sunma.
5. AR düğmesinin durumu profil görüntüsünden bağımsız kalsın; bu görev AR entegrasyonu eklemez.

**Kabul:** Gerçek profil görünmeden “Detailmodell geladen” yazmaz. Prime/Premium değişiminde doğru parça, başlık ve yükleme durumu birlikte güncellenir. Yükleme hatası ana konfigüratörü bozmaz; pencere kapanınca kendi kaynakları temizlenir.

### ASTRA-GP-04 — PDF kolon ve açıklık yönü

**Sorun:** Kolon konumları bahçeden bakışa çevriliyor, eksen aralıkları ve net açıklıklar ise ters yöndeki sırada kalıyor. Eşit açıklıklı örnekler hatayı gizliyor.

**Dosya sınırı:** `src/features/pdf/template/pdfTemplate.ts`, ilgili testler; yön eşlemesi gerekiyorsa PDF plan çizimi.

**Çözüm:** Bahçeden soldan sağa sıralamayı tek yardımcı dönüşümle tanımla. Kolonlar, ardışık merkez aralıkları ve net açıklıklar aynı sıradan türetilsin; tek tek bağımsız ters çevirmelerle tutarsızlık oluşturma.

**Kabul örneği:** Prime, genişlik 530 cm, iç koordinat merkezleri 50/200/480 cm olduğunda PDF'de bahçeden kolon konumları 50/330/480 cm; merkez aralıkları 280/150 cm; net açıklıklar 269/139 cm olur. Tablo ve çizim aynı yönü kullanır. Asimetrik düzen hem Prime hem Premium ile test edilir.

### ASTRA-GP-05 — PDF'ye tahliye ve kapak seçeneklerinin aktarılması

**Sorun:** Su tahliye yönü ve Prime ayak kapağı seçimi PDF içeriğine aktarılmıyor.

**Dosya sınırı:** `src/features/pdf/service/documentSnapshot.ts`, `src/features/pdf/template/pdfTemplate.ts`, `src/features/pdf/service/renderPdf.ts` ve ilgili testler.

**Çözüm:**

1. Konfigürasyon kopyasından `Wasserablauf` ve Prime için `Pfostendeckel` satırlarını üret.
2. Tahliye yönünü bahçeden bakışla yaz. Genişliğe bağlı iki uçta tahliye zorunluluğu varsa kayıttaki tek yön tercihi yerine montajda uygulanan etkin sonucu göster; mevcut montaj kuralını ortak kullan.
3. Premium'da Prime'a ait değişken kapak seçeneği gösterme; ürünün geçerli sabit tipi gerekiyorsa doğru biçimde belirt.
4. Sayısal biçimlendirmeyi Almanca ile tutarlı yap; örneğin kesitte `13,5 cm` kullan.

**Kabul:** Sol/sağ tahliye ve Gerade/Halb seçimleri doğru ürünün PDF metnini değiştirir. 800 cm ve üzerindeki sınır geçişi mevcut kurala göre test edilir; 800 cm'yi aşınca iki uç tahliyesi görüntü ve metinde eşleşir. Uzun satırlar ve sayfa taşmaları görsel kontrol edilir.

### ASTRA-GP-06 — Orta/yüksek kalitede çözünürlük hesabı

**Sorun:** Renderer'ın fiziksel piksel boyutu EffectComposer'a verilince cihaz piksel oranı ikinci kez uygulanıyor. DPR 2 ve CSS 1000×700 örneğinde 2000×1400 yerine 4000×2800 hedef oluşuyor.

**Dosya sınırı:** `src/features/viewer/PreviewViewer.tsx`; gerekiyorsa ortak görüntü boyutlandırma yardımcısı ve hedefli testler.

**Çözüm:**

1. CSS boyutu ile fiziksel piksel boyutunu açıkça ayır. Renderer ve composer'a uygun mantıksal boyutu ver; DPR bir kez uygulansın.
2. GTAO geçişini composer'ın boyut yönetimiyle tutarlı kullan; sonradan farklı boyuta tekrar ayarlama.
3. İlk kalite geçişi, pencere yeniden boyutlanması ve ekran/DPR değişimi aynı hesap yolunu kullansın.
4. FPS düşüşü korumasını hatayı gizlemek için gevşetme. Önce doğru render hedefini doğrula, ardından performansı ölç.

**Kabul:** DPR 1 ve 2'de gerçek render hedefleri beklenen boyuttadır. Mittel/Hoch arasında ve yeniden boyutlandırma sonrasında görüntü bozulmaz. Aynı cihaz ve sahnede düzeltme öncesi/sonrası ölçüm kaydedilir; cihazdan bağımsız sabit FPS garantisi verilmez.

### ASTRA-GP-07 — 3D kaynak sahipliği ve temizliği

**Sorun:** Her montajda oluşturulan yeni malzemeler, `sharedAsset` işaretli geometriyle birlikte temizlikten muaf kalıyor. Paylaşılan geometriyi koruma kararı, montaja özel malzemeyi de koruyor.

**Dosya sınırı:** `src/features/assembly/assemblyScene.ts`, `src/features/viewer/schematicGeometry.ts`, `src/features/viewer/PreviewViewer.tsx`; ortak temizlik yardımcısı/testleri gerekiyorsa eklenir.

**Çözüm:**

1. Önbellekteki kaynak geometri/malzemeler ile montaja ait malzemeler, çizgiler, dokular ve işaretçilerin sahipliğini ayır.
2. Montaj kaldırılırken yalnız o montaja ait kaynakları temizle. Aynı malzeme birçok mesh tarafından kullanılıyorsa bir kez dispose et.
3. Kütüphane önbelleği canlıyken ortak geometriyi dispose etme; görüntüleyici kapandığında önbelleğin kendi temizliğini yap.
4. Composer, efekt geçişleri, gölge hedefleri, ölçü dokuları ve arka plan yükleme zamanlayıcılarının kapanışını da denetle. Asenkron yükleme kapanıştan sonra kaynak eklemesin.

**Kabul:** Kaynak sahipliği testinde özel malzemeler bir kez temizlenir, paylaşılan geometri montaj değişiminde korunur. En az 30 ölçü/renk/ürün değişimi ve profil aç/kapat turunda ısınma sonrası kaynak sayıları sürekli artmaz. Sonuç gerçek renderer ölçümüyle kaydedilir; yalnız JS heap ölçümü yeterli sayılmaz. Başka görünümün kullandığı ortak model bozulmaz.

## 4. PDF'de beş gerçek 3D görüntü

### ASTRA-GP-08 — Sabit kamera görüntülerinin hazırlanması

**İstenen görüntüler:** Karşıdan, sağdan, soldan, yukarıdan ve sol çaprazdan. Sağ/sol, müşterinin bahçeden verandaya baktığı yönü esas alır.

| Görüntü | Almanca başlık | Kamera tanımı |
| --- | --- | --- |
| Karşıdan | Vorderansicht | Bahçeden oluğa/duvara doğru; cepheyi düz gösterir. |
| Sağdan | Rechte Seitenansicht | Bahçeden bakışta verandanın sağ yanından merkeze doğru. |
| Soldan | Linke Seitenansicht | Bahçeden bakışta verandanın sol yanından merkeze doğru. |
| Yukarıdan | Draufsicht | Dikey üst görünüş; sayfa üstü ev/duvar, altı bahçe; müşterinin solu sayfanın solunda. |
| Sol çaprazdan | Perspektive von vorne links | Bahçeden sol ön köşeden, hafif yukarıdan bütünü gösteren perspektif. |

**Dosya sınırı:** Yeni `src/features/pdf/service/captureViews.ts` ve kamera yardımcısı; mevcut `assembly/placements.ts`, `assembly/assemblyScene.ts` üzerinden tekrar kullanım; PDF snapshot, şablon ve renderer bağlantıları.

**Uygulama:**

1. PDF başında konfigürasyon ve revizyonun değişmez kopyasını al. O kopyadan seçili ürünün bütün gerekli parçalarını yükle.
2. Kullanıcının ekrandaki kamerasını değiştirmek yerine ayrı, geçici bir çıktı sahnesi oluştur. Mevcut montaj oluşturucuyu kullan; ikinci bir montaj hesabı yazma.
3. Dört düz görünüşte ortografik, sol çaprazda perspektif kamera kullan. Kamera uzaklığı/kapsaması bütün modelin gerçek sınır kutusuna göre otomatik ayarlansın; uç kapaklar ve tahliye parçaları kırpılmasın.
4. Üst görünüşte uygun kamera up vektörü seçerek eksen çakışmasını önle. Kameralar iç model koordinatından bahçeden bakışa açıkça eşlensin.
5. Ürünün seçili rengi, çatı malzemesi, kolon konumları, tahliye ve kapakları görüntülere yansısın. Seçim halkaları, mavi kenarlar, sürükleme okları, artı işaretleri, FPS ve arayüz görüntüye girmez.
6. Tutarlı aydınlatma ve açık nötr arka plan kullan. Cam çatı görünürlüğünü kontrol et; çıktı yalnız müşterinin o anda gördüğü ekranın ekran görüntüsü olmasın.
7. Görüntüleri sırayla üret; beş büyük GPU hedefini aynı anda tutma. Başlangıç hedefi görünüş başına 1600×1000 piksel, kâğıt üzerindeki oranına uygun çerçevedir. Bu boyut ekran DPR'sinden bağımsızdır; cihaz ve PDF okunabilirlik kontrolüne göre ayarlanabilir.
8. Görüntü baytları, görünüş kimliği, belge kimliği ve revizyon birlikte taşınsın. Görsellerden biri üretilemezse beş görüntü tamamlanmış gibi PDF sunma; açıklanabilir hata ve yeniden deneme ver.
9. İş bitince veya iptal edilince geçici sahne, kamera çıktıları ve render hedeflerini temizle. Ana konfigüratör kullanılabilir kalsın.

**Kabul:** Her iki ürünün beş görünüşü doğru yönlü, aynı ölçü ve seçeneklerle, eksiksiz parçalarla üretilir. Asimetrik kolon ve tek taraflı tahliye örneği yön doğrulaması için kullanılır. Ürün sınırları içindeki küçük ve büyük montajlar kırpılmaz. Ana sahnenin kamerası değişmez. Üretim sırasında tasarım değişirse eski sonuç güncel diye indirilmez/gönderilmez; kullanıcı yeniden oluşturur.

### ASTRA-GP-09 — Görüntülerin PDF yerleşimi

**Dosya sınırı:** `src/features/pdf/service/documentSnapshot.ts`, `src/features/pdf/template/pdfTemplate.ts`, `src/features/pdf/service/renderPdf.ts`, ilgili testler; yeni görüntü veri tipi.

**Yerleşim:**

- İlk sayfa: mevcut ürün/ölçü/seçenek özeti, fiyatın mevcut durumu ve okunabilir büyüklükte sol çapraz genel görünüş.
- Devam sayfaları: karşıdan, sağdan, soldan ve yukarıdan görüntüler; sayfa başına en fazla iki büyük görüntü. Gerektiğinde özet birden fazla sayfaya yayılabilir; beş görünüşten hiçbiri çıkarılmaz.
- Her görüntünün altında Almanca başlığı bulunur. Belge kimliği/revizyon ve sayfa numarası bütün sayfalarda tutarlı olur.
- Mevcut şematik plan korunabilir, ancak istenen beş gerçek 3D görüntünün yerine sayılmaz. Şematik çizim ile gerçek parçalardan üretilmiş görsellerin açıklamaları birbirine karıştırılmaz.
- PDF'nin taslak/teknik onay durumu korunur; gerçek 3D görünüm eklenmesi üretim onayı verildiği anlamına gelmez.

**Kabul:** PDF gerçekten açılıp bütün sayfaları görsel kontrol edilir. Beş başlık ve beş doğru görünüş vardır; metinler, tablolar ve görüntüler kesilmez, esnetilmez veya üst üste binmez. E-posta ek boyutu için uygulamada tanımlanan üst sınır aşılmaz; aşımda görüntü sıkıştırması/boyut azaltımı kontrollü yapılır, görünüş silinmez. Testler belge içeriğinin yanı sıra revizyon ve görünüş eşleşmesini de denetler.

## 5. PDF'nin müşteriye e-posta ile gönderilmesi

### ASTRA-GP-10 — Müşteri formu ve onay

**Akış:** Müşteri PDF eylemini açar → e-posta adresini girer → kullanım koşulları metnini okuyup kabul kutusunu işaretler(kullanım koşulları sonradan verilecek) → PDF hazırlanır → e-posta gönderimi başlatılır → sonuç gösterilir.

**Dosya sınırı:** Yeni `src/features/pdf/components/PdfDeliveryDialog.tsx`; `src/app/ConfiguratorApp.tsx`, `src/features/configurator/ConfiguratorShell.tsx`, `QuoteSummary.tsx`, mevcut modal ve stiller.

**Uygulama:**

1. Almanca formda `E-Mail-Adresse`, önceden işaretlenmemiş kullanım koşulları kabul kutusu ve `PDF per E-Mail senden` düğmesi olsun.
2. Kabul kutusunun yanında mevcut onaylı kullanım koşulları metnine bağlantı/gösterim sun. Örnek metni hukuken onaylı metinmiş gibi üretme. Metni sürümlü bir içerik kaynağından al.
3. Geçerli e-posta ve açık onay olmadan gönderim başlatma. Kutuyu form açıldığında veya taslak yüklendiğinde kendiliğinden işaretleme.
4. PDF hazırlama, gönderim için kabul edilme ve hata durumlarını birbirinden ayır. İşlem sürerken çift tıklama ikinci gönderim üretmesin.
5. Onay veya kişisel bilgiyi taslağın ürün konfigürasyonuna katma. E-posta adresini ve onayı ayrı teslim isteğinde taşı.

**Kabul:** Boş/hatalı adres veya işaretsiz kutu gönderimi engeller. Kullanıcı koşulları formu kaybetmeden okuyabilir. Klavye, odak ve Almanca hata mesajları kullanılabilirdir. Ağ/sağlayıcı hatasında “gönderildi” yazmaz; form güvenli yeniden denemeye izin verir.

### ASTRA-GP-11 — Sunucu üzerinden gönderim ve aynı belgenin korunması

**Dosya sınırı:** Yeni `api/send-planning-pdf.ts` gibi bir sunucu endpoint'i, sunucuya özel e-posta adaptörü, ortak PDF üretim/veri sözleşmesi ve testleri. Tarayıcıya sunucu anahtarı taşıyan dosya eklenmez.

**Önerilen uygulama:**

1. E-posta servisine yalnız sunucu bağlansın; gizli anahtarlar sunucu ortamında tutulsun, `VITE_` değişkenlerine veya istemci paketine konmasın.
2. Form açılıp gönderim başlatıldığında aynı konfigürasyon kopyasından beş görüntü oluştur. İstek, bu kopyayı, görüntüleri, revizyon/belge kimliğini, alıcı adresini ve kabul edilen koşul sürümünü birlikte taşısın.
3. Sunucu konfigürasyonu ve e-posta adresini yeniden doğrulasın; açık onay ve geçerli koşul sürümü zorunlu olsun. Kabul zamanını sunucu kaydetsin. Gerçek fiyat gerekiyorsa istemciden gelen tutarı güvenilir fiyat saymasın.
4. Sunucu, ortak PDF üretim koduyla metinleri doğrulanmış konfigürasyondan üretip beş görüntüyü eklesin. Keyfi dosya/URL ekleyen veya keyfi e-posta içeriği gönderen genel bir aracıya dönüşmesin. Görsellerin türü, sayısı, boyutu ve çözülebilirliği doğrulansın; istemci görseli teknik doğrulama kanıtı sayılmasın.
5. Tarayıcıdaki üretim anındaki revizyon hâlâ güncelse isteği gönder. Sunucu kabul ettikten sonra müşteri değişiklik yaparsa gönderilen belge o kabul edilen revizyon olarak kalır; yeni tasarımın belgesiymiş gibi gösterilmez.
6. Gönderim işlemini idempotency anahtarıyla izle. Aynı isteğin ağ tekrarları aynı işlem sonucunu döndürsün; hata alınca rastgele yeni kimlikle yeniden gönderilmesin. Durumu belirsiz timeout sonrası önce işlem sonucu kontrol edilsin.
7. Almanca e-posta konu/gövdesinde ürün ve belge kimliği, ekte aynı belge bulunsun. Sağlayıcının isteği kabul etmesi “müşterinin gelen kutusuna ulaştı” olarak sunulmasın.
8. İstek ve ek boyutu sınırları ile gönderim hız sınırı uygula. Onay sürümü/zamanı ve işlem sonucunu gerekli ölçüde kaydet; e-posta adresi, PDF ve anahtarları genel uygulama loglarına dökme. Geçici görsellerin/PDF'nin saklama ve temizlik davranışı tanımlı olsun.
9. Aynı revizyon için hazırlanan belge paketi test indirme ve e-posta yollarında ortak kullanılsın. Mevcut `Planungsentwurf` niteliği korunsun.

**Kabul:** Onaysız veya değiştirilmiş geçersiz istek sunucuda reddedilir. Sıradan tarayıcı isteğinden servis anahtarı okunamaz. Tekrar gönderim testi tek e-posta oluşturur. Sağlayıcı hatası/timeout kontrollü ele alınır. Önce sahte sağlayıcıyla test edilir; gerçek teslim kabulü yalnız belirlenmiş test alıcısına yapılır. Gelen ek açılıp beş görüntü, seçenekler, ölçüler ve belge kimliği kontrol edilir.

### ASTRA-GP-12 — Test için e-postasız indirme

**İstenen davranış:** E-posta yazmadan doğrudan PDF indiren ayrı bir test düğmesi bulunacak.

**Dosya sınırı:** Mevcut `createPdfDraft` / `downloadPdf` yolu, yeni ortak belge paketi, PDF teslim formu veya çıktı alanı ve test ortamı ayarı.

**Uygulama:**

- Düğme adı: `Test-PDF herunterladen (ohne E-Mail)`.
- Bu düğme e-posta veya kullanım koşulu formuna bağlı olmadan aynı beş görüntülü PDF'yi yerelde indirir; e-posta göndermez, kabul kaydı oluşturmaz.
- Düğme geliştirme/test ortamında açık bir ayarla görünür; müşteri yayınında varsayılan olarak kapalıdır. Görünürlük ayarı e-posta endpoint'inin onay zorunluluğunu değiştirmez.
- Ayrı, zamanla farklılaşacak ikinci bir PDF şablonu yazılmaz. Gönderim ve indirme ortak snapshot, görsel paketi ve PDF renderer'ı kullanır.
- Her iki eylem aynı anda başlatıldığında çakışma, çift görüntü üretimi veya revizyon karışması engellenir.

**Kabul:** Hiç e-posta girmeden beş görüntülü PDF iner. Ağda e-posta gönderim isteği oluşmaz. Test düğmesi kapatılınca normal müşteri akışı yalnız e-posta ve kabul ile ilerler. Test indirmesi ile aynı konfigürasyondan e-posta eki ölçü, ürün, seçenek ve görseller açısından eşleşir.

## 6. Uygulama sırası ve teslim

| Sıra | Görevler | Geçiş ölçütü |
| --- | --- | --- |
| 1 | GP-01 | Kurulum, mevcut testler, tip kontrolü ve derleme başarılı. |
| 2 | GP-02, GP-03 | Kolon etkileşimi ve profil durumları tarayıcıda doğrulanmış. |
| 3 | GP-04, GP-05 | PDF yönü ve seçenekler hedefli testlerle doğrulanmış. |
| 4 | GP-06, GP-07 | Boyutlandırma ve kaynak temizliği düzeltilmiş; ölçüm kanıtı var. |
| 5 | GP-08, GP-09, GP-12 | Beş görünüşlü PDF e-postasız test indirmesiyle görsel kabulden geçmiş. |
| 6 | GP-10, GP-11 | Onaylı e-posta akışı ve tekrar/hata davranışı doğrulanmış. |
| 7 | Birleşik kontrol | Prime/Premium için indirme ve gönderim aynı revizyonu doğru temsil ediyor. |

Farklı uygulayıcılar çalışırsa ortak `ConfiguratorApp.tsx`, `PreviewViewer.tsx` ve PDF servis dosyalarında eşzamanlı çakışan düzenleme yapılmaz. Görev ayrımı gerçek model seçimi anlamına gelmez; uygulayıcı ayrıca seçilir.

Teslimde her görev için değişen dosyalar, yapılan doğrulama ve kalan problem kimlikleri yazılır. PDF'nin bütün sayfaları görsel olarak kontrol edilir; yalnız test sayısı kabul değildir. Bir problem doğrulanamamışsa tamamlandı işaretlenmez.
