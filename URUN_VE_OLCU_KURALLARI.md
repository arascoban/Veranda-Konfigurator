# Ürün ve ölçü kuralları

Güncelleme: 29 Eylül 2026. Kaynak: kullanıcının ürün açıklamaları, fiyat basamağı açıklaması ve yüklenen FBX dosyalarının salt okunur incelemesi. Bu belge önceki planlarda aynı konularda açık bırakılmış varsayımların yerini alır. Teknik geliştirme başladı; canlı yayın yapılmadı.

## 1. Ürünler ve yükleme sırası

- **Prime ve Premium iki ayrı satış ürünüdür.** Aynı ürünün iki detay seviyesi olarak kaydedilmezler.
- Kullanıcı Premium'u güçlendirilmiş sürüm olarak tarif ediyor. Gerçek kapasite, fiyat ve üretim sınırları bu açıklamadan türetilmez; ayrıca sağlanacak.
- Mevcut Prime modeli düşük detaylı, Premium yüksek detaylıdır; genel görünüşleri benzerdir.
- Yeni, boş oturumda önce Prime açılır. Prime kullanılabilir hale gelince Premium'un web için hazırlanmış varlıkları arka planda indirilir.
- Arka plan indirmesinin tamamlanması seçili ürünü veya fiyatı değiştirmez. Müşteri Premium'u seçince aynı kullanıcı ölçüleri ve uyumlu seçeneklerle Premium montajı hazırlanır.
- Premium hazır değilse yükleme durumu gösterilir. İndirme başarısız olduğunda mevcut Prime görünümü kullanılabilir kalır; Premium'un hazır olduğu iddia edilmez.
- Kayıtlı bir Premium tasarımı yeniden açılırken kayıtlı ürün kimliği korunur; başlangıç varsayılanı bu kaydı Prime'a çeviremez.
- Fiyat, BOM, PDF ve AR seçili satış ürününü temel alır. Prime geometrisi Premium'un doğru parça kesiti olarak sunulmaz. Ayrı bir Premium sadeleştirmesi gerekirse Premium kaynaklarından hazırlanır.
- Yükleme durumu, ürün kimliği ve görsel detay tercihi ayrı alanlardır. Ham FBX kaynakları son kullanıcıya dağıtılacak web varlıkları olarak kabul edilmez.
- İleride aynı montaj yaklaşımını kullanan başka ürünler de eklenecek; ürün bazında parça eşlemesi ve bağlantı payları tanımlanabilir olmalı.

## 2. Kullanıcının gireceği dört ölçü

| Alan | Kesin tanım |
| --- | --- |
| Genişlik | Regenrinne/oluk profilinin genişliği. Örneğin 500 cm seçildiğinde oluk ve Wandprofil/duvar profili 500 cm olur. |
| Derinlik | Duvar yüzeyinden ön kolonun karşıdan bakana, yani bahçe tarafına bakan yüzüne kadar yatay mesafe. |
| Arka yükseklik | Zeminden Wandprofil'in alt yüzüne kadar dikey mesafe. |
| Ön yükseklik | Zeminden Regenrinne'nin alt yüzüne kadar dikey mesafe. |

- Montajın bütün parçalarını kapsayan dış kutusu, bu dört giriş ölçüsünün yerine kullanılamaz. Kapaklar ve taşmalar ayrı geometri paylarıdır; profil boyu tanımını sessizce değiştirmezler.
- Ön yükseklik yaklaşık kolon yüksekliğine karşılık gelebilir; kolon kesim boyu otomatik olarak aynı sayı sayılmaz. Oluğa giriş/oturma payı montaj referanslarından belirlenir.
- Derinlik, çatı camının veya eğimli taşıyıcının boyu değildir. Duvar ve kolon referanslarından yatay konumlar; bağlantı kotlarından eğim ve eğimli parça uzunlukları hesaplanır.
- Çatı eğimi hesaplanırken yalnızca iki giriş yüksekliğinin farkı kullanılmaz; duvar ve oluk profillerinin ilgili taşıyıcı bağlantı noktalarına kadar olan payları da hesaba katılır.
- Uygulama verileri mm olarak tutulur; 3D sahneye geçerken metreye çevrilir. Arayüz birimi açıkça gösterilir.
- Mevcut Prime ve Premium referans montajlarının farklı yükseklikleri özel bir ürün kısıtı değildir; kullanıcı bunun rastlantısal olduğunu ve ayarlanacağını doğruladı.
- Onaylanan üst sınırlar ve bölme kuralları aşağıdadır. **30 Eylül 2026:** minimum genişlik **200 cm**, minimum derinlik **100 cm** (Prime/Premium, cam/polikarbonat için aynı). Minimum/maksimum yükseklik ve giriş/üretim ölçü adımları henüz verilmedi. Tek örnek montajdan genel üretim kuralı çıkarılmaz.

### 2.1. Kesinleşen sınırlar

| Kural | Cam | Polikarbonat |
| --- | ---: | ---: |
| Minimum genişlik | 200 cm | 200 cm |
| Maksimum genişlik | 1200 cm | 1200 cm |
| Minimum yatay derinlik | 100 cm | 100 cm |
| Maksimum yatay derinlik | 400 cm | 500 cm |
| Son panel eni üst sınırı, ekleme payı dahil | 86 cm | 98 cm |
| Panel enine eklenen pay | 3,2 cm | 3,5 cm |
| İzin verilen çatı eğimi | 5–12° | 5–12° |

- Kullanıcı 400/500 cm'nin **derinlik** olduğunu ve panel sınırının **ekleme yapılmış son ene** uygulandığını açıkça doğruladı.
- Eğim, arka ve ön yükseklik girildikten sonra hesaplanır. Gerçek çatı bağlantı noktalarının kot farkı ve yatay mesafesi kullanılır; 5° ve 12° sınırları dahildir. Profil alt yüzleri ile çatı bağlantı noktaları arasındaki paylar montajda doğrulanacak. **30 Eylül 2026 kuralı:** yeni taslak 8° ile başlar (500 × 300 cm, ön 230 cm). Derinlik veya ön yükseklik değişince açı korunur ve arka yükseklik hesaplanır; müşteri arka yüksekliği değiştirirse açı değişir ve o açı korunur. Ön yükseklik 50–500 cm; arka yüksekliğin sınırları 5°–12°'den anlık hesaplanır ve sınır dışı giriş kabul edilmez. Her ölçü alanında 1 cm'lik +/− düğmeleri vardır.
- Sınır dışındaki eğim görünür bir açıklamayla geçersiz sayılır; müşteri ölçüleri sessizce değiştirilmez. Uygun yükseklik önerisi ancak bağlantı payları biliniyorsa verilir.

### 2.2. Çatı bölmeleri, taşıyıcılar ve ara kapaklar

Bu formüllerde bütün uzunluklar **cm**, `W` toplam genişlik, `n` eşit çatı bölmesi sayısıdır. Kullanıcı parantez sırasını doğruladı.

```text
Taşıyıcı sayısı t = n + 1
Ara kapak eni c = (W − 5,5 × t) / n
Cam panel eni = c + 3,2
Polikarbonat panel eni = c + 3,5
```

- Başlangıçta son panel eni sınırını sağlayan en küçük pozitif tam sayı `n` seçilir; böylece taşıyıcı sayısı da en az olur. Pozitif ara kapak eni ve diğer ürün sınırları ayrıca doğrulanır.
- Eşit bölmeler için aday sayı: camda `ceil((W − 5,5) / 88,3)`, polikarbonatta `ceil((W − 5,5) / 100)`. En az 1 bölme koşulu ve sonuç doğrulaması uygulanır. Bu formül bilinmeyen minimum üretim enini çözmez.
- Müşteri daha fazla çatı bölmesi seçebilir. Taşıyıcı/panel/kapak ve ilişkili parça listesi yeniden hesaplanır; kullanıcının isteği doğrultusunda ek bölmenin fiyat artışı fiyat kuralına bağlanır. Artış tutarı henüz verilmedi; uydurulmaz.
- Azaltılan bölme sayısı panel üst sınırını aşıyorsa kabul edilmez. Minimum panel/kapak eni ve maksimum elle seçilebilir bölme sayısı henüz verilmedi; sınırsız artışa izin veren üretim kuralı tanımlanmaz.
- Ara kapak enine 3,2/3,5 cm eklenmez. Bu hesap tek kapağın enini tanımlar; kapakların adet ve konumları ürün montaj eşlemesinden gelir.
- Görsel etiketler yuvarlanabilir; sınır kontrolü yuvarlanmamış değerle yapılır. Kesim ölçüsünün yuvarlanma/üretim hassasiyeti ayrıca belirlenecek.
- mm tabanında taşma kontrolü bölmeden yapılabilir: cam için `Wmm − 55 × (n+1) + 32 × n ≤ 860 × n`; polikarbonat için `Wmm − 55 × (n+1) + 35 × n ≤ 980 × n`. Böylece ekrandaki yuvarlama geçersiz paneli geçerli yapmaz.

| Genişlik | Malzeme | En az bölme | Taşıyıcı | Ara kapak eni | Son panel eni |
| --- | --- | ---: | ---: | ---: | ---: |
| 500 cm | Cam | 6 | 7 | ≈76,917 cm | ≈80,117 cm |
| 500 cm | Polikarbonat | 5 | 6 | 93,4 cm | 96,9 cm |
| 1200 cm | Cam | 14 | 15 | ≈79,821 cm | ≈83,021 cm |
| 1200 cm | Polikarbonat | 12 | 13 | ≈94,042 cm | ≈97,542 cm |

Tablo aritmetik örnektir; fiyat veya bütün montajın üretim onayı değildir. Her örnekte bir önceki bölme sayısı panel üst sınırını aşar.

### 2.3. Kolonlar ve kullanılabilir açıklıklar

**30 Eylül 2026 güncellemesi (kullanıcı onayı; aşağıdaki eski maddelerde çelişen ifadelerin yerine geçer):**

- Kolon kesitleri: oluk yönünde **Prime 11 cm**, **Premium 13 cm** (kullanıcı onayı). Bahçeye bakan derinlik kullanıcının 30 Eylül kararıyla **modeldeki değer** esas alınır: her iki üründe 13,5 cm. Kod: `postSections` (`catalog.ts`).
- **Kolonlar arası açıklık kolon yüzlerinden ölçülür**, merkezden değil: `lichte Weite = merkez aralığı − kolon eni`. Örnek: 200 cm Premium, iki kolon tam uçta → 200 − 13 − 13 = **174 cm**. Bu açıklık en az **90 cm** olmalıdır (`MIN_CLEAR_OPENING_MM`). ChatGPT döneminde bu ölçü merkez aralığıyla karıştırılmıştı; artık değil.
- **Tam uçta:** kolonun dış yüzü oluğun ucuyla aynı hizada. Yeni tasarımda kolonlar bu konumda başlar (Prime merkez 5,5 cm, Premium 6,5 cm içeride). Kolon oluğun dışına taşamaz.
- **Uç kolon içeri alma sınırı 50 cm, kolonun dış yüzünden ölçülür** (merkezden değil). Prime'da merkez en fazla 55,5 cm, Premium'da 56,5 cm içeride olabilir.
- **400 cm (Premium ≤600 cm'de 600 cm) üst sınırı merkezden merkeze ölçülmeye devam eder.** Yalnız 90 cm alt sınırı yüzden yüze ölçülür.
- Sonuçlar: 1000 cm'de uçlar 50 cm içeri alınsa bile merkez aralığı 887 cm kalır; her iki üründe 4 kolon gerekir. 900 cm'de Premium 56,5 / 450 / 843,5 cm merkezleriyle 3 kolon mümkündür; tam uçta başlangıç yerleşimi Prime'da 4 kolon verir.
- Sürgü cam montaj payları hâlâ bilinmiyor; lichte Weite bu payları düşmez.
- **Müşteri arayüzü bahçeden bakışı esas alır** (30 Eylül 2026): Pfosten numaraları, "ab links" konumları ve Ablauf Links/Rechts seçimi müşterinin 3D modeli gördüğü yönden (bahçeden) tanımlıdır. Konfigürasyon verisinde `postCenters.xMm` içeriden bakışta soldan ölçülmeye devam eder; dönüşüm `x_garten = W − x`. PDF planı da bahçeden bakışla çizilir.
- **Wasserablauf:** her terasta en az bir ayak boru içerir (Prime `PfostenRohr…`, Premium `PfostenMitRohr`); yalnız uç ayaklarda olur; çıkış bahçeye bakar. Genişlik 800 cm'yi geçerse her iki uç ayakta zorunludur. Varsayılan: bahçeden bakışta sol.
- **Prime Pfostendeckel:** müşteri Gerade / Halb seçer (`postCapStyle`); Premium'da tek ayak tipi.
- **Ayakların terasın içine kaydırılması** ileride en fazla 100 cm; destek profili modeli gelince uygulanacak.

- **Çatı bölmesi** ile **kolonlar arası açıklık** ayrı kavram ve veri alanlarıdır. Taşıyıcı sayısı çatı bölmelerinden hesaplanır; sürgü cam sistemi kolonlar/duvarlar arasındaki açıklığa yerleşir.
- **Prime:** iki komşu kolonun **merkezleri arası** en fazla 400 cm olur. Kullanıcı merkez referansını doğruladı; örneğin 600 cm Prime için 3 kolon gerekir. Uç kolon konumları belirlenmeden yalnız toplam genişlikten kesin yerleşim çıkarılmaz. İlk/son kolon merkezleri arasındaki mesafe `S` ise, eşit dağılımda mesafe kuralı için gereken en az kolon sayısı `ceil(S/400)+1` olur. `S`, oluk genişliğiyle otomatik olarak aynı sayılmaz.
- **Premium — son açıklama:** genişlik 600 cm'ye kadar 2 kolon olabilir; kolon merkezleri arası izin verilen en büyük açıklık 600 cm'dir. **Toplam genişlik 600 cm'yi aşarsa Prime'ın 400 cm merkez aralığı kuralı geçerli olur.** Her iki ürünün maksimum oluk genişliği 1200 cm'dir.
- **Önceki sabit adet tablosunun yerini mesafe kuralı aldı:** kullanıcı 1000 cm Premium'da gerektiğinde 4 kolon olacağını, 400 cm merkez aralığının esas alınacağını doğruladı. Daha önceki “1000 cm'ye kadar 3 kolon” kuralı artık uygulanmaz.
- **Uç kolon içeri alma sınırı:** her iki üründe uç kolonun **merkezi**, ilgili oluk ucundan en fazla **50 cm** içeride olabilir. Sol ve sağ uç için ayrı uygulanır. Bu üst sınır, başlangıçta bütün kolonları 50 cm içeri alma talimatı değildir; başlangıç yerleşimi profil kesiti ve montaj referansıyla belirlenir. En dış geçerli konum, kesitin/montajın fiziksel sınırından gelir.
- **1000 cm kontrolü:** iki uç merkez 50'şer cm içeri alınsa bile ilk/son merkez arası 900 cm kalır. Üç kolon iki adet en fazla 400 cm açıklık, yani toplam en fazla 800 cm sağlayabilir; bu nedenle hem Prime hem Premium için en az 4 kolon gerekir.
- **900 cm kontrolü:** merkezler 50, 450 ve 850 cm konumlarında olduğunda üç kolonla 400+400 cm sağlanır. Uçlar daha dışarı taşınırsa üç kolon yetersiz kalabilir; yalnız toplam genişliğe bağlı sabit adet tablosu kullanılmaz. Müşterinin konumlarını korumak mümkün değilse gerekçe ve ek kolon önerisi gösterilir.
- Müşteri kolonun üstüne tıklayıp seçebilmeli, izin verilen yönde sürükleyebilmeli ve açıklığı sayı girerek de ayarlayabilmeli. Eşit dağıtma ve geri alma sunulacak.
- En fazla 50 cm uç içeri alma ve ürünün merkez aralığı sınırı birlikte uygulanır. İzin verilen kolon yönleri ve minimum açıklık sınırı açık konudur. Ön kolonun derinlik yönünde taşınmasının nominal derinliği nasıl etkileyeceği ayrıca kararlaştırılacak. Merkez aralığı kuralı, sürgü camın kullandığı net iç açıklıkla karıştırılmaz.
- Kolonlar birbirini geçemez veya çakışamaz. Sürüklerken kamera dönüşü durur; işlem sonunda tek bir geri alma adımı oluşur.
- Her açıklık sabit kolon/duvar kimliklerine bağlanır. Kolon hareketinde net açıklık yeniden hesaplanır; sürgü veya duvar ölçüsü ve fiyatı güncellenir. Yeni ölçü ek ürüne uygun değilse sebebi gösterilir; mevcut seçim sessizce silinmez.
- Glasschiebewand ray sayısı tablosu geldiğinde, açıklığın montaj payları düşülmüş uygun genişliğine göre sistem seçimi yapılır. Bu montaj payları henüz verilmedi; sıfır varsayılmaz.

## 3. Sol/sağ ve montaj referansları

- Premium kapak dosyalarındaki sağ/sol adlandırması **verandanın içinden bakışa göre** yapılmıştır. Dışarıdan karşıdan bakışla yeniden adlandırılmaz.
- Uygulama kamerası döndüğünde sağ/sol parça kimlikleri değişmez. Montaj şemasında bu bakış yönü bir okla açıkça gösterilecek; dosya eşlemesi referans montajla kontrol edilecek.
- Prime ve Premium'un mevcut dosya eksenleri farklıdır. Yükleme/varlık hazırlama katmanında ortak eksene dönüştürülür; kaynak dosyalar değiştirilmeden parça manifestinde dönüşüm tutulabilir. **30 Eylül 2026 uygulaması:** ortak sahne çerçevesi X = içeriden bakışta soldan sağa, Y yukarı, duvar yüzü z = 0, bahçe −Z. Prime referansı ötelemeyle, Premium referansı Y ekseninde 180° dönüşle bu çerçeveye oturur (aynalama yok). Referans montajlardan okunan vorläufig bağlantı payları `src/catalog/attachmentReference.ts` ve `design/review/MONTAGEBEZUEGE-*.png` içindedir; kullanıcı onayı bekler.
- Bağlantı noktaları, sabit kesitler, uzayan bölümler ve sabit kapak/vida geometrileri parça bazında tanımlanır.

## 4. Çatı malzemesi

- Ortak çatı paneli kaynağı 7 mm kalınlığında basit bir kutudur; incelemede ayrı panel 100 × 100 cm ve 12 üçgen olarak bulundu.
- Cam/polikarbonat seçimi bu geometri üzerinde malzeme değiştirilerek gösterilecek.
- Panelin en ve boyu montaja göre değişir; kalınlık genel ölçekleme yüzünden değişmez.
- Görsel malzeme seçimi ile ürün/fiyat seçeneği eşleştirilir. Polikarbonatın gerçek satış teknik özellikleri görsel kutu kalınlığından türetilmez.

## 5. Glasschiebewand

- 3, 4, 5 ve 6 raylı tamamlanmış sistemler yüklendi.
- Kullanıcı, seçilen tamamlanmış modeli **doğrudan genişlik yönünde ölçekleme** yöntemini açıkça seçti. Cam kanatların eninin bu işlemle değişmesi kabul ediliyor.
- Bu aşamada sabit enli kanatları yalnızca kaydırıp bindirme değiştiren başka bir yöntemle değiştirilmez.
- Genişlik belirli sınırları geçtiğinde uygun 3/4/5/6 raylı hazır sistem seçilir; kanat sayısı buna göre artar veya azalır. Kesin aralık tablosu kullanıcı tarafından daha sonra verilecek.
- 3 ray için 264–305 cm ve 306 cm'den sonra 4 ray örneği **henüz kesin üretim kuralı değildir**. Özellikle ara değerler ve ölçü adımı tablo gelmeden tamamlanmış sayılmaz.
- Kural tablosu geldiğinde aralıkların çakışmaması, boşluk bırakmaması ve destek dışı ölçülerin açıklanması kontrol edilir.
- Kaynak modellerin mevcut dış yükseklikleri yaklaşık 220 cm'dir. Sürgü yüksekliğinin ayar yöntemi ve eğimli yan açıklıkların üst dolgu çözümü henüz tanımlanmadı; kullanıcıya ihtiyaç duyulan aşamada sorulacak.

## 6. Model incelemesinden bilinen durumlar

| Kaynak montaj | İncelemede sayılan üçgen |
| --- | ---: |
| Prime 500×300 | 31.650 |
| Premium 500×300 | 559.208 |
| 3 ray | 3.981 |
| 4 ray | 5.175 |
| 5 ray | 6.411 |
| 6 ray | 7.625 |

- Premium'da adları vida/bağlantı gruplarıyla eşleşen alt ağaçlar yaklaşık 394.528 üçgen içeriyor. Bu inceleme sadeleştirme adaylarını gösterir; otomatik parça silme talimatı değildir.
- Premium örnek montajında iki ön kolon, iki yan/beş orta taşıyıcı ve altı çatı paneli var. Bu sayılar yalnızca örneğe aittir.
- **Premium oluk kapakları düzeltildi:** yanlış ölçekli orijinaller korunur. Kullanılacak doğrulanmış kopyalar `PreparedModels/Premium/Regenrinne/` altında; ölçek, yön ve konum tamamlanmış Premium montajıyla eşleştirildi. `model-repairs/README.md` ve `MODEL-001-validation.json` entegrasyon referansıdır. `MODEL-001` çözüldü; web/AR kabulü ayrıca yapılacak.
- Kullanıcının kaynak dosyaları değiştirilmedi; kapakların düzeltilmiş türev kopyaları hazırlandı. Telefonda gerçek AR ve tarayıcı performans kabulü yapılmadı.

## 7. Sol/Luna planına eklenecek kabul ölçütleri

- **P02:** iki satış ürünü ve dört ayrı ölçü alanı bulunur; nominal ölçü tanımları yukarıdaki tabloyla eşleşir.
- **P03:** ölçüm açıklamaları ilgili profil alt yüzünü ve kolonun ön yüzünü gösterir; model seçimiyle arka plan indirmesi ayrı durumlar olarak sunulur.
- **P04:** Prime/Premium arasında geçişte müşteri ölçüleri korunur. Ürünlerin farklı kesitleri ve bağlantı payları ayrı hesaplanır. Yanlış ölçekli kapaklar fark edilmeden sahneye alınamaz.
- **P04:** Glasschiebewand genişliği seçilen hazır sistemin genişlik ekseninde ölçeklenir. Ray seçimi kullanıcıdan gelecek sürümlü aralık tablosuna bağlıdır.
- **P05–P08:** fiyat, kayıt, PDF ve AR ürün kimliğini korur; önceden yüklenmiş başka ürünün çıktısı kullanılamaz.
- Yeni, boş oturum Prime ile başlar; kayıtlı Premium tasarımı Premium olarak açılır; hızlı model değişimlerinde eski yükleme cevabı yeni seçimi geçersiz kılamaz.
- Kaynak varlıkların ilk incelenmiş olması, montaj kurallarının veya satışa hazır olmanın tamamlandığı anlamına gelmez.

## 8. Onaylanan temel fiyat tablosu seçimi

Kullanıcı fiyat listesini daha sonra sağlayacak. Fiyat genel olarak genişlik × derinlik tablosundaki hücreden alınır; aşağıdaki kural 29 Eylül 2026'da onaylandı.

- Fiyat genişliği bir üst **100 cm** basamağına; fiyat derinliği bir üst **50 cm** basamağına çıkarılır. Tam basamağa eşit ölçü bir sonraki basamağa taşınmaz.
- Minimum fiyat genişliği **300 cm**, minimum fiyat derinliği **200 cm**; her eksene ayrı uygulanır. Bunlar fiziksel minimum üretim ölçüsü değildir.
- mm cinsinden: `fiyatGenisligi = max(3000, ceil(genislik / 1000) * 1000)`; `fiyatDerinligi = max(2000, ceil(derinlik / 500) * 500)`.
- Gerçek müşteri ölçüleri değiştirilmez. 3D, kayıt, PDF ve AR gerçek ölçüleri kullanır; fiyat hücresi ayrı bilgi olarak saklanır.

| Tasarlanan ölçü (cm) | Fiyat hücresi (cm) |
| --- | --- |
| 530 × 320 | 600 × 350 |
| 600 × 350 | 600 × 350 |
| 250 × 150 | 300 × 200 |
| 250 × 320 | 300 × 350 |
| 530 × 150 | 600 × 200 |

- Geçersiz/sıfır/negatif ölçüye minimum fiyat atanmaz. Ürün maksimumları fiyat basamağına çıkarma işlemiyle aşılmaz; camın 400 cm ve polikarbonatın 500 cm gerçek derinlik sınırları korunur.
- Fiyat verisi ürün, çatı malzemesi, katalog ve tarife sürümüyle eşleşmelidir. Bir hücre yoksa komşu hücreden fiyat alınmaz; eksik fiyat durumu gösterilir. Gerçek tutarlar henüz yoktur.
- Cam sürgü duvar, alüminyum duvar ve sabit çerçeve cam gibi ekstraların tarifeleri sonra verilecek. Ekstra fiyatı bilinmiyorsa ücretsiz varsayılmaz. Ek çatı bölmesi artışı için de tutar/kapsam bekleniyor.
- Mevcut adet × birim fiyat testleri yalnız para aritmetiği kontrolüdür; verandanın gerçek temel fiyatını parça başı toplama talimatı değildir.
- Vergi, montaj, nakliye, tarife geçerliliği ve ek kalem kapsamı fiyat listesiyle netleştirilecek. Temel fiyatın bulunması bütün sipariş toplamının hazır olduğu anlamına gelmez.

Uygulama: `src/domain/pricing/basePriceGrid.ts`. `selectPriceBasis` fiyat basamaklarını hesaplar; `lookupBasePrice` güvenilir kaynaktan sağlanan tablodaki tam hücreyi seçer. `base_price_available` yalnız temel fiyat içindir, genel teklif onayı değildir.

Teklif bağlantısı: `buildGridQuote` ve `respondToGridQuoteRequest` bu temel hücreyi sürümlü teklife aktarır. Fazladan çatı bölmesi seçilmişse ve bedeli henüz yoksa temel fiyat ayrı korunur, toplam `missing_data` olur. Gerçek bir sunucu fiyat kaynağı henüz kurulmadı; kontrollü sayılar yalnız test dosyalarında bulunur.
