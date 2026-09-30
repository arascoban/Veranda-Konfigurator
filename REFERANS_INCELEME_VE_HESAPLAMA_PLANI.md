# Schweng referans incelemesi ve hesaplama planı

Tarih: 29 Eylül 2026. Sorumlu: Astra. Durum: plan; uygulama geliştirme başlatılmadı.

Görsel tasarım eki: [Luna ve Sol tasarım planı](TASARIM_PLANI_LUNA_SOL.md). Kullanıcı Schweng yerleşimini, referans görselindeki cam menüleri ve turuncu yerine RAL 7016 antrasit vurguyu seçti. Bu ek K02'nin görsel kurallarını ve K03/K04 bağlantılarını detaylandırır.

## 1. İncelenen referans

Kullanıcının bağlantısının görünen yazısı S350 olsa da gerçek hedefi [Schweng S400 konfigüratörü](https://konfigurator.schweng.eu/product/S400_canopy?config=xm7jd). İnceleme bu S400 sayfasında yapıldı. Ürün kuralları için kaynak kullanıcının [ürün ve ölçü kurallarıdır](URUN_VE_OLCU_KURALLARI.md); rakip ürünün ölçü, yük ve fiyat sınırları bizim kataloğa aktarılmaz.

### Doğrudan gözlenenler

- Masaüstünde solda seçenekler, sağda geniş 3D sahne; alt sağda fiyat/teklif alanı bulunuyor.
- Dört ana adım: Konstruktion (yapı), Dach (çatı), Ausstattung (donanım), Feld (açıklık).
- Yapı ekranında genişlik, derinlik, geçiş yüksekliği, arka yükseklik ve hesaplanmış eğim gösteriliyor. Ölçü şeması referansları açıklıyor.
- Kolonları 3D üzerinde taşıma yönergesi, ön kolon içeri alma ölçüsü, ön/sol/sağ açıklık adetleri ve kolonları eşit dağıtma düğmeleri var. Sürükleme hareketinin bütün sınırları bu incelemede test edilmedi.
- Çatı adımında cam/polikarbonat çeşitleri, ek çatı bölmesi, tente ve aydınlatma kartları var. Bu seçenekler bizim ilk sürüm kapsamını kendiliğinden genişletmez.
- Donanım adımında sürgü cam, farklı yan duvarlar ve eğimli üst dolgu seçenekleri var.
- Açıklık adımında, donanım yerleştirilecek açıklığın tıklanarak seçilmesi isteniyor.
- Aç/kaydet, geri/ileri, ölçülendirme, animasyon, kamera merkezleme ve kalite kontrolleri var. Kaydetme/paylaşma işleminin tamamı denenmedi.
- AR düğmesi kullanıldığında hazırlık sonrasında QR kod ve AR görüntüleyici bağlantısı çıktı. Telefon kamerasıyla yerleştirme doğrulanmadı.
- PDF üretimi bu incelemede doğrulanmadı. Bizim PDF hedefi kullanıcının talebinden geliyor.

Sayfanın arayüz akışı incelendi; kaynak kod, model varlıkları veya tasarım dosyaları alınmadı. Kullanıcının modelleri değiştirilmedi. İnceleme görseli geçici olarak `/private/tmp/schweng-ar-inceleme.png` konumunda.

## 2. Bizim müşteri akışı

1. **Ürün ve ölçüler:** Prime/Premium, genişlik, derinlik, arka/ön yükseklik. Ölçüm yüzlerini gösteren şema ve hesaplanan eğim.
2. **Çatı ve görünüm:** cam/polikarbonat, gerçek katalog renkleri, otomatik en az bölme ve isteğe bağlı ilave bölme. Bölme, taşıyıcı ve panel eni birlikte açıklanır.
3. **Kolonlar ve açıklıklar:** kolona tıklama, sınırlar içinde sürükleme veya sayı girişi, eşit dağıtma, ön/yan açıklıkların net ölçüleri. Çatı bölmeleri burada kolon açıklıklarıyla karıştırılmaz.
4. **Açıklığa donanım:** açıklığı seç, uygun sürgü cam/duvar seçeneklerini gör. Ölçü tablosu eksik ürün için uygunluk veya fiyat uydurulmaz.
5. **Özet ve çıktı:** fiyatın kapsamı, PDF indir/yazdır, taslağı kaydet, telefonda aç ve “Bahçemde göster”. Ödeme ilk sürümde yok.

Seçilen bir parça için ayrıca **“Profili incele” → ayrıntılı 3D → “Masamda incele”** akışı bulunur. Ayrıntılı parça seçili satış ürününün gerçek parçasıdır; Premium parça Prime'ın teknik detayı olarak gösterilmez. Aynı inceleme ekranında parça adı, kesit/ölçü ve gerçek ölçek açıklaması bulunur. AR ölçek davranışı cihaz kabulünde doğrulanır.

Masaüstünde sürekli 3D ve seçim paneli; mobilde 3D ile ölçü girişi arasında kolay geçiş hedeflenir. Kolon konumu klavyeyle/sayıyla da ayarlanabilir. Sürükleme sırasında kamera dönmez; seçili parçanın vurgusu ölçü çizgilerinden ayırt edilir. Üretim için bilinmeyen sınırlar tamamlanmadan serbest sürükleme satışa hazır özellik sayılmaz.

## 3. Hesaplama ve veri sırası

1. Konfigürasyon girişini birime çevir ve ürün/malzeme sınırlarını değerlendir.
2. Eşit çatı bölmelerinde onaylı formülle en az bölme sayısını bul. Elle seçilen sayı varsa sınırını doğrula. Taşıyıcı, panel ve ara kapak enlerini üret.
3. Arka/ön profil bağlantı referanslarından gerçek çatı düzlemini ve eğimi hesapla. İzin verilen eğim 5–12°.
4. Ürün kolon kurallarını uygula; doğrulanmış konumlardan ön/yan net açıklıkları üret. Çatı bölme sayısı kolon adedini doğrudan belirlemez.
5. Her açıklığın seçili donanımını uygunluk tablosuyla yeniden değerlendir. Sürgü sistemini seç, tamamlanmış modeli genişlik yönünde ölçekle.
6. Tek montaj tanımından parça listesi ve sahne yerleşimini; doğrulanmış fiyat tablosundan fiyatı üret.
7. Aynı konfigürasyon, katalog, varlık ve fiyat sürümünün kopyasıyla kayıt/PDF/AR çıktısını üret. Sonradan gelen eski sonuç yeni tasarımın üstüne yazılamaz.

Planlanan ayrı alanlar: `roofBayCount` (çatı bölme sayısı), `postPositions` (kolon konumları), `openings` (sınır kolon/duvar kimlikleri ve hesaplanan net açıklıklar), `openingInfillSelections` (açıklığa bağlanan donanım). Açıklık genişlikleri kolonlardan türetilir; bağımsız ve çelişen ikinci bir ölçü kaynağı tutulmaz.

Kolon hareketi iki komşu açıklığı etkileyebilir. Net açıklık ölçüsü, sürgü seçimi ve fiyat birlikte güncellenir. Bir açıklık bölünür/birleştirilirse mevcut donanımın hangi açıklığa taşınacağı açıkça ele alınır; sessiz veri kaybına izin verilmez.

## 4. Sol ve Luna için ek görev kartları

Bu kartlar mevcut P01–P09 planını tamamlar; otomatik olarak geliştirmeyi başlatmaz. Belirtilen yollar oluşturulması planlanan dosya alanlarıdır.

### K01 — Hesap sözleşmesi ve sınır kontrolleri

- Sorumlu: Sol. Önkoşul: P01/P02 altyapısı; eksik kurallar açık bilgi durumu olarak korunur.
- Dosya sınırı: `src/domain/geometry/`, `src/catalog/`, ilgili hesap testleri. UI ve 3D dosyalarına girmez.
- Kapsam: genişlik/derinlik sınırları, eşit çatı bölme algoritması, kapak/panel ölçüsü; Prime 400 cm merkez aralığı, Premium en fazla 600 cm genişlikte 600 cm merkez aralığı ve 600 cm üstünde Prime kuralına geçiş; uç kolon merkezinin ilgili oluk ucundan en fazla 50 cm içeri alınması. Kolon sayısı geçerli konumlar ve mesafe sınırından türetilir; eski sabit Premium adet tablosu kullanılmaz.
- Kabul: 500/1200 cm örnekleri ürün belgesindeki tabloyu verir. Her seçilen minimum `n` geçerlidir; `n−1` panel sınırını aşar. `n × araKapakEni + 5,5 × (n+1) = W` sağlanır.
- Kontrol: panel sınırına tam eşit ve bir ölçü adımı üstü; 1200 cm ve üstü; cam derinlik 400/polikarbonat 500 cm ve üstü; Premium 600 cm ve hemen üstünde merkez aralığı kuralı değişimi; negatif/sıfır/anlamsız giriş. 1000 cm'de 3 kolon reddedilir; geçerli konumlarla 4 kolon kabul edilir. 900 cm'de 50/450/850 cm merkez konumları 3 kolonla sınırı sağlar; uçları dışarı taşımanın etkisi ayrıca kontrol edilir. 50 cm uç sınırı ve hemen üstü sınanır. Ölçü adımı kesinleşmeden üretim yuvarlaması tanımlanmaz.
- İlave kabul: 5°/12° dahil sınır testleri gerçek bağlantı referanslarıyla yapılır; profil alt yüzlerinin farkı çatı eğimiymiş gibi sunulmaz.

### K02 — Ölçü ve açıklık düzenleme tasarımı

- Sorumlu: Luna. Önkoşul: K01 veri sözleşmesi; taslak çalışması sınırlar tamamlanmadan yapılabilir.
- Dosya sınırı: `src/ui/`, `src/features/configurator/`, `src/styles/`, `src/content/`.
- Kapsam: yukarıdaki işlevleri taşıyan doğrudan seçilebilir Almanca bölümler (numaralı sihirbaz yok), ölçü açıklamaları, çatı/kolon ayrımı, seçili kolon/açıklık paneli, eşit dağıt/geri al, profil inceleme ve AR girişleri.
- Kabul: kullanıcı çatı bölmesi ile cam sürgü açıklığını karıştırmaz; telefonda sayı girişi ve dokunma kullanılabilir. Geçersiz ölçü alanın yanında neden gösterir. Eksik fiyat sıfır olarak gösterilmez.
- Kontrol: masaüstü ve dar telefon görünümü; klavye ve dokunma; taşan ölçü etiketleri; yükleme/bilgi eksik/uygun değil durumları. Hesap mantığı UI içine yazılmaz.

### K03 — Montaj ve kolon etkileşimi

- Sorumlu: Sol. Önkoşul: K01, parça bağlantı referansları, MODEL-001 çözümü ilgili parçalar için; satışa uygun sürükleme için kolon mesafe ve taşma sınırları.
- Dosya sınırı: `src/features/viewer/`, `src/assets/manifest/`. Ortak hesap sözleşmesi değişikliği Astra incelemesine gider.
- Kapsam: gerçek parça montajı, kolon seçimi/hareketi, açıklık ölçüleri, ürün geçişleri ve ayrıntılı parça görüntüleyici.
- Kabul: ölçüler doğru yüzlerden ölçülür; kesitler/kapaklar uzama yüzünden bozulmaz; kolonlar çakışmaz, izin verilen aralık dışına gitmez. Kolon sürüklerken kamera dönmez; tek sürükleme tek geri alma adımıdır. Sürgü ölçüsü açıklıkla aynı sürümde kalır.
- Kontrol: farklı genişlik/derinlik/yükseklik kombinasyonları; uç ve orta kolon; ürün değişimi; donanımlı açıklığı daraltma. Eksik kural sahte güvenli sınırla tamamlanmaz.

### K04 — Fiyat, PDF ve iki AR modu

- Sorumlu: Sol hesap/çıktı bağlantıları; Luna yalnız PDF yerleşimi. Önkoşul: P05–P08 sözleşmeleri ve ilgili montaj verisi.
- Dosya sınırı: Sol `src/domain/pricing/`, `src/features/pdf/service/`, `src/features/ar/`; Luna `src/features/pdf/template/`.
- Kapsam: ek çatı bölmesinin fiyat etkisi, kolon/donanım güncellemeleri, PDF ölçü/parça özeti; tüm veranda ve tek parça AR çıktıları.
- Kabul: ek bölme için kullanıcının fiyat kuralı kullanılır; tarife yoksa fiyat eksik gösterilir. PDF/3D/fiyat/AR aynı tasarımdır. Tam veranda AR'si gerçek montaj boyutlarında; profil AR'si seçili ürüne/parçaya aittir. Masaüstünde QR, telefonda uygun AR açılışı ve desteklenmeme durumu vardır.
- Kontrol: ölçü değiştirilirken devam eden çıktı işlemi, kayıtlı Premium tasarımı, eksik fiyat, Android/iPhone gerçek cihaz kontrolü. Telefon testi yapılmadığında başarı diye raporlanmaz.

Sol/Luna hatayı mevcut kanıtla `Problems.md` dosyasına kaydeder; kendi görev ve dosya sınırları içinde tek bir gerekçeli düzeltme yaklaşımı ve bir doğrulama turu uygular. Başarılıysa kanıtla kapatıp devam eder. Başarısızsa veya doğrulanamıyorsa ikinci deneme yapmadan Astra’ya devreder ve bağımlı işi durdurur; bağımsız işler sürebilir. Yetki/bilgi/güvenlik engelinde doğrudan devreder. Ayrıntılı ve bağlayıcı akış `AGENTS.md` içindedir.

## 5. Açık kararlar

- Kolon mesafesi ve uç sınırı kesinleşti: Prime 400 cm; Premium toplam genişlik 600 cm'ye kadar 600 cm, bunun üstünde Prime kuralı; iki üründe uç kolon merkezleri en fazla 50 cm içeride. 1000 cm'de en az 4 kolon gerekir. Açık kalan: en dış montaj konumu, minimum açıklık, varsayılan yerleşim ve derinlik yönünde hareket davranışı.
- Minimum ölçüler, yükseklik sınırları, giriş adımı; panel/kapak minimum eni, üretim kesim yuvarlaması ve en fazla isteğe bağlı bölme.
- Gerçek profil bağlantı noktaları ve eğim payları; genişlik değişiminde manuel kolon yerleşiminin korunma davranışı.
- Glasschiebewand kesin aralıkları, montaj boşlukları, yükseklik ve eğimli üst dolgu çözümü.
- Fiyat tarifesi ve ek bölme artışı; renk/opsiyon kataloğu; marka/dil.

29 Eylül fiyat güncellemesi: temel tutar ürün/malzeme bazlı genişlik × derinlik tablosundan alınacak. Genişlik 100 cm, derinlik 50 cm basamakla yukarı seçilir; minimum fiyat hücresi eksen bazında 300 × 200 cm'dir. Bu fiyat minimumları üretim minimumu değildir. Örnek: 530 × 320 → 600 × 350 cm. Fiyat listesi ve ekstraların tutarları daha sonra gelecek; kesin kurallar `URUN_VE_OLCU_KURALLARI.md` bölüm 8'de.

Bu eksikler planlama veya temel arayüz sözleşmesini engellemez; ilgili üretim/fiyat işlevlerinin tamamlandığı iddia edilemez.
