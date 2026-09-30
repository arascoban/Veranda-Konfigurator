# D01 taslak notları

Tarih: 29 Eylül 2026 · İlk taslak: Luna; dil/önizleme düzeltmesi: Astra. Üç SVG Almancaya çevrildi, PNG çıktıları üretildi ve açılarak incelendi. `LUNA-L10N-001` ve `LUNA-D01-001` çözüldü. Bu, D01 bütün tasarım kabulünün tamamlandığı anlamına gelmez; sonraki kapsam aşağıdadır.

## Dosyalar

- [Masaüstü 1440 × 900](D01-MASAUSTU.svg)
- [Tablet 1024 × 768](D01-TABLET.svg)
- [Telefon 390 × 844](D01-TELEFON.svg)

Bunlar arayüz davranışını açıklayan statik D01 taslaklarıdır. 3D veranda çizimleri yerleşimi göstermek için basitleştirilmiştir; kullanıcı modellerini temsil etmez. Sahte logo, gerçek fiyat, marka rengi veya ürün kabiliyeti gibi yorumlanmamalıdır.

## Ortak görsel dil

- Schweng örneğinden sol seçenek paneli, sağ 3D alanı ve kompakt özet düzenini aldım.
- Kullanıcının görselinden yüzen beyaz cam panelleri, yumuşak kenar ışığını ve kapsül düğmeleri kullandım. Sarı/turuncu vurguları `#383E42` antrasitle değiştirdim.
- Sahnenin çevresi sakin nötr tonlarda; cam/kolon geometrisi ana odak. Başlangıç taslağında manzara fotoğrafı yok.
- Ölçü alanları opak beyaz; küçük yazılar koyu yüzey üstünde. Cam efekti metni bulanıklaştırmıyor.
- Boya rengi seçimi ile arayüz antrasit rengi ayrı. RAL 7016 yönü dijital UI vurgusudur; sertifikalı ekran numunesi değildir.

## Ekranların niyeti

**Masaüstü:** yapı ölçüleri sabit ve görünür; doğrudan bölüm seçicisi panelde; sahne araçları sahneye yakın; seçili kolon antrasit kesik konturla ve artı tutamacıyla belli. Özet kartında sahte tutar yerine fiyatın veri tamamlanınca hesaplanacağı yazıyor.

**Tablet:** panel daralıyor ama etiketler kesilmiyor. Cam ve polikarbonat kartlarıyla 500 cm cam örneğinde 6 bölme/7 taşıyıcı sayısı gösteriliyor; panel eni sınırı ayrı satırda. Altta sabit geri/ileri ve sahne altında kompakt fiyat durumu bulunuyor.

**Telefon:** 3D sahne üstte, aşağı açılan ayar paneli altta. Kolon seçimi modelde vurgulanıyor; merkez mesafesi kontrolü sayıyla okunuyor. “Modeli büyüt” sahne için daha çok yer açma yolunu gösteriyor.

## Astra’nın incelemesini istediğim noktalar

1. Desktop 354 px panel ve tablet 302 px panel yoğunluğu, marka öğeleri/gerçek model geldiğinde uygun mu?
2. Özet/fiyat kartı desktop/tablet sahne üstünde sabit kalsın mı, yoksa ekran kenarında ayrı bir şeride mi taşınsın?
3. Tablet genişliğinde cam/polikarbonat seçenek kartlarını yatay mı bırakmalı, yoksa alt alta mı koymalı?

Bu üç konu Astra’nın D01 görsel incelemesidir; kullanıcı kararı gerektiren ürün kuralı değildir. D01 dosya sınırını aşmadım ve uygulama bileşeni/paket eklemedim.


## Astra düzeltmesi ve devam kapsamı

- Müşteri arayüzü Almanca. Numaralı 1/5 sayacı kaldırıldı. `Konstruktion`, `Dach`, `Ausstattung`, `Feld`, `Übersicht` bölümleri doğrudan seçilecek; “Zum Dach” gibi düğmeler isteğe bağlı kısayoldur, zorunlu sırayı göstermez.
- Telefonda ürün adı Premium olarak düzeltildi. Tablet kartlarındaki 7 mm satış özelliği kaldırıldı: kaynak kutu kalınlığı gerçek polikarbonat satış özelliği değildir. Masaüstündeki desteklenmesi henüz onaylanmamış bağımsız kurulum seçeneği ölçüm referansı alanına çevrildi.
- PNG çıktıları [masaüstü](review/D01-MASAUSTU.png), [tablet](review/D01-TABLET.png), [telefon](review/D01-TELEFON.png). Yerel Sharp dönüşümü kullanıldı; tarayıcıya yerel dosya açtırılmadı, sunucu veya dış servis kullanılmadı.
- Tekrar render: çalışma ortamının Node ve Sharp yollarıyla `design/tools/render-previews.cjs`. Bu işlem sadece yerel SVG dosyalarını PNG'ye dönüştürür.
- Görsel kontrol: üç dosya doğru hedef boyutlarında açıldı; Almanca metinlerin ve numarasız bölüm başlıklarının görünmesi doğrulandı. Bu statik çizimler mobil dokunma, klavye veya AR kabulünün kanıtı değildir.

### Luna'ya devam izni

D01'de dil/önizleme engeli kalktı. Sonraki kapsam yine `design/` ile sınırlı: ayrıntılı profil inceleme ve genişletilmiş özet taslakları, bileşen/durum tablosu ve planın 14–16 px okunabilirlik hedeflerine uygun nihai yazı boyutları. Mevcut çizimlerde küçük yardımcı etiketler hâlâ ilk kompozisyon boyutundadır; bunlar nihai erişilebilirlik onayı almadı. D02 uygulama başlangıcı için P01/P02 ve D01 genel incelemesi gerekir. Hata başına tek düzeltme denemesi kuralı artık `AGENTS.md` içinde geçerlidir.

### Üç tasarım sorusuna Astra kararı

1. Masaüstünde mevcut panel genişliği korunabilir. Tablet uygulamasında planlanan 304–320 px aralığı esas alınır; statik çizimdeki 302 px üretim ölçüsü değildir.
2. Masaüstü özet kartı sahnenin alt sağında; tablette sahnenin altındaki ayrı şeritte tutulur. Gerçek model alanı bu kartların kapatmadığı bölgeye göre hesaplanır.
3. Malzeme kartları tablette sığdığı sürece yan yana, uzun Almanca metinler veya büyütme durumunda alt alta yerleşir. Yazı küçültülerek sığdırılmaz.

## Luna devam teslimi — 29 Eylül 2026

D01 tasarım alanındaki ek işler tamamlandı: profil inceleme penceresi, genişletilmiş plan özeti, bileşen/durum tablosu ve küçük taslak metinlerinin büyütülmesi.

- [Profil inceleme taslağı](D01-PROFIL-DETAIL.svg) ve [önizlemesi](review/D01-PROFIL-DETAIL.png).
- [Genişletilmiş özet taslağı](D01-UEBERSICHT.svg) ve [önizlemesi](review/D01-UEBERSICHT.png).
- [Bileşen ve durum tablosu](D01-KOMPONENTEN-UND-ZUSTAENDE.md).
- Masaüstü, tablet ve telefon önizlemeleri: [Masaüstü](review/D01-MASAUSTU.png), [Tablet](review/D01-TABLET.png), [Telefon](review/D01-TELEFON.png).
- Yeni profil çizimi ve veranda sahnesi yalnız yerleşim yer tutucusudur. Gerçek parça, ölçü veya AR yeteneği iddiası yoktur. Fiyat bulunmadığında tutar gösterilmez.
- Beş PNG doğru tuval boyutlarında oluşturuldu ve görsel olarak incelendi. Küçük durum etiketleri 12 px, yardımcı metin 14 px, ana metin/ölçüler 16 px ve üzerindedir.
- D01 görsel alanındaki hata kayıtları `LUNA-D01-002`–`LUNA-D01-005` çözüldü. D02 uygulama dosyaları ve D01 genel Astra incelemesi ayrı kapsam olarak duruyor.

### Astra D01 incelemesi ve sonraki devir — 29 Eylül 2026

**İnceleme kararı: D01 tasarım paketi D02 uygulamasına geçiş için onaylandı.** Üç temel tuval ölçüsü mevcut; profil ve genişletilmiş özet durumları ayrıca çizilmiş; bileşen/durum tablosu mevcut. Antrasit ve cam dili tutarlı, logo uydurulmamış, fiyat ve AR durumu hazır değilken açıkça belirtilmiş. Demo geometri ve örnek ölçüler gerçek ürün gibi sunulmuyor. Önizlemeler görsel olarak kontrol edildi.

**Şimdi D02'yi Luna devralmalı.** Kapsamı `src/styles/`, `src/ui/`, `src/features/configurator/` ve `src/content/` ile sınırlı: tasarım değişkenleri, cam/opak kabuk, ortak alan/kart/buton/durum bileşenleri ve Almanca uyarlanabilir arayüz. Bileşen ve durum sözleşmesi için [D01 bileşen tablosunu](D01-KOMPONENTEN-UND-ZUSTAENDE.md) kullanmalı; ana uygulama girişini Sol'e bırakmalı.

Sol, D02 bileşen sözleşmesi teslim edilince D03 sahne ve arayüz bağlantısını devralır. D02 geliştirme sırasında Sol bağımsız P07/P08 işleriyle ilerleyebilir. D01 görsel onayı; uygulamadaki 320 px, 200% büyütme, klavye/fokus, azaltılmış hareket, opak görünüm ve kontrast kontrollerinin geçtiği anlamına gelmez; bunlar D02/D04 kabulünde ayrıca yapılır.
