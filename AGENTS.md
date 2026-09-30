# Veranda konfigüratörü çalışma kuralları

Bu kurallar kullanıcının 28 Eylül 2026 tarihli talimatını ve 29 Eylül 2026 tarihli tek düzeltme denemesi güncellemesini uygular.

## Roller ve kapsam

- Astra planlama, mimari, teknik kararlar, inceleme ve hata çözümünden sorumludur.
- Sol ve Luna yalnızca Astra'nın kapsamını ve kabul ölçütlerini belirlediği işleri uygular; kodlama ve tasarım bu modellere dağıtılır.
- Ön araştırma belgesi: `VERANDA_TEKNOLOJI_VE_YOL_HARITASI.md`.
- Modeller öncesi görev kartları: `MODELLER_ONCESI_UYGULAMA_PLANI.md`. Güncel ilerleme, bütün aşamalar, kullanıcı girdileri ve sonraki dosya sınırları: `GUNCEL_DURUM_VE_ASAMALAR.md`. D01 taslakları, D02 arayüz, P01/P02/K01 temeli, P04/D03 şematik 3D bağlantıları, P05 fiyat altyapısı ve P06 yerel kayıt kodlandı. 30 Eylül 2026 son Astra kontrolü: tip/üretim derlemesi ve 72 test başarılı; ASTRA-D03-007/008 çözüldü. Açıklık seçimi kolon kimlikleriyle korunuyor; boş konum girişi kayıt üretmiyor. Sıradaki bağımsız iş Luna D04/P07 PDF taslağı; ardından Sol PDF bağlantısı. Sol web varlığı hazırlığına ayrı dosya kapsamında ilerleyebilir. Gerçek montaj/fiyat/telefon AR ve tam görsel/performance kabulü henüz tamamlanmadı.
- Güncel ürün/ölçü kararları: `URUN_VE_OLCU_KURALLARI.md`. Prime ve Premium ayrı satış ürünleridir; arka plan yüklemesi ürün seçimini kendiliğinden değiştirmez.
- Schweng referans gözlemleri ve ek görev kartları: `REFERANS_INCELEME_VE_HESAPLAMA_PLANI.md`. Çatı bölmeleri ile kolonlar arası açıklıklar ayrı hesaplanır; rakibin ölçü/fiyat sınırları bizim kataloğa aktarılmaz.
- Görsel tasarım ve Luna/Sol görevleri: `TASARIM_PLANI_LUNA_SOL.md`. Schweng yerleşimi, kullanıcının görselindeki cam menüler ve RAL 7016 yönünde antrasit vurgu esastır. P03/K02 görsel kapsamı D01–D04 ile somutlaştırılır; UI rengi ürün boya seçimini değiştirmez.
- SketchUp 2026 kaynaklı Prime, Premium ve 3/4/5/6 raylı Glasschiebewand modelleri `Models` klasörüne yüklenmiş ve ilk inceleme yapılmıştır. Gerçek montaj, tarayıcı performansı ve AR kabulü henüz tamamlanmamıştır. Demo veri/hesap gerçek ürün bilgisi olarak sunulmaz.
- İlk ürün kapsamına ödeme/satın alma dahil değildir.
- Yayın mimarisi: ana site şimdi Wix, sonra WordPress; React + Vite konfigüratörü Vercel'de bağımsız çalışır ve ayrı alt alan adından açılır. Ana site bağlantı verir; Wix/WordPress'e uygulama bağımlılığı kurulmaz. Gerçek alan adı ve hizmet hesapları henüz belirlenmedi.
- Ürün sınırları, fiyatlar ve mühendislik kuralları uydurulmaz; eksikler Astra'ya bildirilir.
- Temel fiyat, gerçek ölçüleri değiştirmeden genişlikte bir üst 100 cm / derinlikte bir üst 50 cm hücresinden seçilir; minimum fiyat eksenleri 300/200 cm'dir. Fiyat minimumları üretim minimumu değildir. Kullanıcı gerçek liste ve ekstra fiyatlarını sonra verecek; bu bekleyiş bağımsız UI/3D/kayıt geliştirmesini engellemez. `URUN_VE_OLCU_KURALLARI.md` bölüm 8 ve `basePriceGrid.ts` esas alınır.
- Müşteri arayüzü Almancadır. Numaralı “1/5” sihirbazı yerine doğrudan seçilebilen bölümler kullanılır; iç çalışma belgeleri Türkçe kalabilir.

## Sol ve Luna için zorunlu hata akışı

1. Her araç, kurulum, derleme, test, çalışma zamanı, görsel veya entegrasyon hatasını mevcut kanıtla `Problems.md` dosyasına benzersiz kayıt olarak ekleyin. Eski kayıtları silmeyin.
2. Sorunu inceleyip kendi görev/dosya yetkiniz içinde **bir kez düzeltmeyi deneyin**. Bir deneme: tek bir gerekçeli çözüm yaklaşımı, bunun gerekli dosya değişiklikleri ve bir ilgili doğrulama turudur. Kör tekrar, art arda farklı çözümler veya aynı sorunu yeni kimlikle açarak hakkı sıfırlama yapılmaz.
3. Görev, model, tarih, ortam/sürüm, beklenen/gerçek sonuç, ilgili dosyalar ve mevcut log yanında denenen çözümü ve doğrulama sonucunu kaydedin. Eksik bilgiye “bilinmiyor” yazın. Test silme/gevşetme, hata bastırma ve güvenlik/izin kısıtını aşma çözüm değildir.
4. Deneme başarılıysa kaydı `Çözüldü` yapın, kanıtı ve kapanış tarihini ekleyin; işe devam edebilir, teslimde Astra'ya kayıt kimliğini bildirebilirsiniz.
5. Deneme başarısızsa veya doğrulanamıyorsa **ikinci deneme yapmayın**. Kaydı `Açık` bırakıp Astra'ya kimliği ve engellenen işi bildirin; bağımlı işi durdurun. Bağımsız görevler sürebilir.
6. Düzeltme için eksik ürün bilgisi, başka görev sahibinin dosyası, güvenlik/izin engeli veya kapsam dışı karar gerekiyorsa yetkiyi aşmadan doğrudan Astra'ya devredin; denemenin neden yapılamadığını kaydedin. Deneme hakkı onay/izin gerekliliklerini kaldırmaz.
7. Astra'ya devredilmiş işe yalnız Astra çözüm uygulayıp doğruladıktan ve devam edilebileceğini bildirdikten sonra dönün. Aynı çözülmemiş sorun görev/oturum değişince yeni deneme hakkı kazanmaz.

## Astra için hata akışı

- Sorunu teşhis edin, gerekli düzeltmeyi uygulayın, uygun kontrolü çalıştırın ve aynı kayda çözüm/kanıt ekleyin.
- Durumları `Açık`, `Astra inceliyor`, `Bilgi bekliyor`, `Çözüldü` olarak kullanın.
- Anahtar, erişim tokenı veya müşteri kişisel bilgisini loglara koymayın.
- İş bölümü gerçek model seçiminin yerine geçmez; görev atanırken Sol/Luna ayrıca seçilmelidir.

## Teslim

- Her uygulama görevi kapsam, dosya sınırı ve kabul ölçütü içermelidir.
- Teslim notunda değişiklik, yapılan kontrol ve açık problem kimlikleri belirtilmelidir.
- 3D, fiyat, PDF ve AR aynı konfigürasyon sürümüne dayanmalıdır.
