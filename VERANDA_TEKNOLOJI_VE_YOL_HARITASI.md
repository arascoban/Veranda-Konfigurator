# Veranda konfigüratörü — araçlar, mimari ve hazırlık rehberi

Araştırma tarihi: 28 Eylül 2026. Durum: teknoloji araştırması ve modeller öncesi görev planı hazır. Uygulama geliştirme veya yayınlama başlamadı. Güncel uygulama sırası ve Sol/Luna görev kartları: [Modeller öncesi uygulama planı](MODELLER_ONCESI_UYGULAMA_PLANI.md).

29 Eylül güncellemesi: Prime/Premium ve Glasschiebewand modelleri yüklendi, ilk inceleme yapıldı. Kullanıcının doğruladığı ürün ayrımı, yükleme sırası, dört ölçünün tanımı ve sürgü ölçekleme yöntemi [Ürün ve ölçü kurallarında](URUN_VE_OLCU_KURALLARI.md) kayıtlıdır; bu konularda önceki varsayımların yerini alır.

## 1. Önerilen yön

**React + TypeScript + Vite; 3D için Three.js / React Three Fiber; AR için model-viewer; PDF için React-pdf; kayıt, güvenilir fiyat ve model dosyaları için küçük bir sunucu katmanı.**

**Site bilgisi ve yayın kararı:** Kullanıcının mevcut sitesi Wix; ileride WordPress'e taşınacak. Konfigüratör için Vercel ve ayrı bir alt alan adı seçildi: örneğin `konfigurator.seninalanin.com`. Gerçek alan adı henüz paylaşılmadı. Ana site bu uygulamaya bağlantı verir; uygulamanın çalışması Wix veya WordPress'e bağlı olmaz. Henüz yayınlama veya DNS değişikliği yapılmadı.

Bu, mevcut SketchUp parçalarını kullanan, ana sitenin menüsünden ayrı bir uygulama sayfası olarak açılan özel bir uygulama önerisidir. Aşağıdaki araçlar incelenmiş seçeneklerdir; tüm veranda üreticilerinin aynı teknolojiyi kullandığı iddia edilmemektedir. Üretici sayfaları kullanıcı deneyimini, araçların resmî belgeleri teknik olanakları doğrulamak için kullanılmıştır.

- İlk sürüm: müşteri ürün tipini, geçerli ölçüleri ve seçenekleri seçer; 3D görünüm ve fiyat güncellenir; PDF indirir/yazdırır; desteklenen telefonunda verandayı bahçesinde AR ile görür.
- Kaydedilen bir bağlantı/QR kodu, bilgisayardaki tasarımın telefonda aynı haliyle açılmasını sağlar.
- İlk sürümde ödeme, sepet, üyelik zorunluluğu ve otomatik üretim emri yoktur.
- Sonraki satış modülüne hazırlanmak için ürün kimlikleri, parça listesi, fiyat sürümü ve konfigürasyon kayıtları baştan düzenli tutulur.
- Mevcut ürünler Prime ve Premium'dur; yeni boş oturum Prime ile açılır, Premium arka planda hazırlanır ve müşteri seçtiğinde kullanılır. Yeni ürünler daha sonra eklenebilir.

## 2. Sektör araştırmasından çıkan ihtiyaçlar

| Resmî örnek | Kaynakta doğrulanan akış | Bizim uygulamamıza çıkarım |
| --- | --- | --- |
| [Brustor 3D Simulator](https://www.brustor.com/en-us/3d-simulator) | Çatı/kurulum tipi, ölçü, renk ve aksesuar; bahçe fotoğrafında görselleştirme; bayiye gönderme | Seçimleri anlaşılır adımlara bölmek; tasarımı teklif sürecine taşımak |
| [Tuinmaximaal veranda](https://www.tuinmaximaal.nl/veranda) | Renk, stil, çatı ve ölçü seçimi; doğrudan fiyat; ek seçenekler | Müşteri seçim yaparken fiyatı görünür tutmak |
| [Renson Outdoor](https://renson.net/es-es/soluciones/disfrute-al-maximo-del-jardin-y-del-patio) | Model, ölçü, aksesuar/yan elemanlar, kaydetme ve bayiye götürme | Yeniden açılabilir konfigürasyon kimliği |
| [markilux konfigüratör](https://www.markilux.com/en-de/service/awning-configurator) | Ölçü, tasarım, donanım; konfigürasyon ID’siyle geri açma; bayi fiyat talebi | Standart dışı ölçüleri gerekçeli özel teklif akışına yönlendirmek |
| [Solarlux AR Viewer](https://solarlux.com/de-de/spezial/landing/ar-viewer.html) | Bayiden alınan QR ile ayrı uygulamada teras çatısı/kış bahçesi yerleştirme | AR için tasarımın telefona güvenilir aktarımı |

Bu örneklerde AR her zaman web sayfasının içinde değildir. Fotoğraf üzerine yerleştirme de canlı AR ile aynı şey değildir. İncelenen sayfalarda otomatik konfigürasyon PDF’i ortak bir özellik olarak doğrulanmadı; PDF bu projenin açık müşteri gereksinimidir.

Önerilen müşteri sırası:

1. Veranda ailesi ve kurulum: duvara bağlı / bağımsız, ürün kataloğunda varsa.
2. Genişlik, derinlik, yükseklik; ölçülerin nereden nereye alındığını gösteren basit çizim.
3. Çatı tipi, renk, yan kapamalar, sürgü cam, aydınlatma ve mevcut diğer opsiyonlar.
4. Her seçimde güncellenen 3D görünüm, ölçü etiketleri ve fiyat özeti.
5. Özeti kontrol et, PDF indir/yazdır, bağlantıyı kaydet veya telefonda bahçende görüntüle.

## 3. Kullanılacak araç ve paket listesi

### 3.1. Web uygulaması ve arayüz

| Araç / paket | Görevi | Karar |
| --- | --- | --- |
| React — `react`, `react-dom` | Adımlı müşteri arayüzü ve bileşenler | Ana tercih; [R3F ile ilişkisi](https://r3f.docs.pmnd.rs/) |
| TypeScript — `typescript` | Ölçü, parça, seçenek ve fiyat verilerinin tutarlı tanımlanması | Ana tercih |
| [Vite](https://vite.dev/guide/static-deploy.html) — `vite`, `@vitejs/plugin-react` | Geliştirme ve taşınabilir statik çıktı | Vercel'de bağımsız uygulama için seçildi |
| [Tailwind CSS](https://tailwindcss.com/docs/installation/using-vite) — `tailwindcss`, `@tailwindcss/vite` | Mobil ve masaüstü yerleşim, marka görünümü | Önerilen stil sistemi |
| [shadcn/ui](https://ui.shadcn.com/docs) | Form, panel, diyalog gibi özelleştirilebilir arayüz bileşenleri | İhtiyaç duyulan bileşenler eklenir; tek bir hazır tema değildir |
| [Zustand](https://github.com/pmndrs/zustand) — `zustand` | Seçili konfigürasyonu tek merkezde tutma | Ana tercih |
| [Zod](https://zod.dev/) — `zod` | Gelen ölçülerin, seçeneklerin ve kayıtların şema doğrulaması | Tarayıcı ve sunucuda kullanılır |
| [React Hook Form](https://github.com/react-hook-form/react-hook-form) — `react-hook-form`, gerekirse `@hookform/resolvers` | Ölçü formu ve alan bazlı geri bildirim | Form karmaşıklığına göre eklenir |
| Tarayıcının `Intl` API’si | Yerel sayı, para birimi ve tarih gösterimi | İlk aşamada ek paket gerektirmez |

Alternatif: [Next.js](https://nextjs.org/docs/app/getting-started/deploying), uygulama ve sunucu uçlarını tek framework içinde yönetme ihtiyacı doğarsa değerlendirilebilir. Mevcut karar React + Vite'tır; Vercel kullanmak Next.js gerektirmez. [Vercel'in Vite desteği](https://vercel.com/docs/frameworks/frontend/vite)

Sürüm politikası: geliştirme başlarken uyumlu, kararlı sürümler seçilip kilit dosyasına yazılır. React / R3F ana sürümleri eşleştirilir; deneysel WebGPU/alpha sürümleri başlangıç bağımlılığı yapılmaz. [R3F uyumluluk notları](https://r3f.docs.pmnd.rs/)

### 3.2. 3D ve model hazırlama

| Araç / paket | Görevi | Karar |
| --- | --- | --- |
| [Three.js](https://threejs.org/docs/pages/GLTFExporter.html) — `three`, geliştirmede `@types/three` | 3D sahne, geometri, malzeme ve GLB dışa aktarma | Ana 3D motor |
| [React Three Fiber](https://r3f.docs.pmnd.rs/) — `@react-three/fiber` | Three.js sahnesini React ile kurma | Ana tercih |
| [Drei](https://drei.docs.pmnd.rs/) — `@react-three/drei` | Kamera kontrolü, model yükleme ve yardımcı bileşenler | Gereken yardımcılar kullanılır |
| Three.js `GLTFExporter` | Seçilmiş parçalarla oluşan verandayı tek GLB dosyasına dönüştürme | AR aktarımı için; ayrı npm paketi değildir |
| SketchUp | Mevcut kaynak modellerin düzenlenmesi | Kullanıcının mevcut aracı |
| [Blender / glTF aktarımı](https://github.com/KhronosGroup/glTF-Blender-IO) | Gerektiğinde eksen, pivot, malzeme ve geometri temizliği | Yardımcı araç; tüm parçaları yeniden modellemek şart değil |
| [glTF Transform](https://gltf-transform.dev/) — `@gltf-transform/cli` | GLB inceleme ve optimizasyon | Geliştirme aracı; müşteriye gönderilen uygulamaya tüm CLI eklenmez |
| [Khronos glTF Validator](https://github.khronos.org/glTF-Validator/) | GLB dosyasının format doğrulaması | Her yeni model grubu için |

Meshopt/Draco geometri sıkıştırması ve KTX2 dokular, gerçek cihaz ölçümlerine göre seçilir. Her AR görüntüleyicisinin aynı uzantıları desteklediği varsayılmaz. Gerekirse web görünümü için sıkıştırılmış, AR için daha uyumlu ayrı çıktı üretilir.

### 3.3. AR: “Bahçemde göster”

- **Paket:** [`@google/model-viewer`](https://modelviewer.dev/examples/augmentedreality/).
- **Android yolu:** desteklenen cihazlarda Google Scene Viewer; GLB/glTF modeli. [Google belgeleri](https://developers.google.com/ar/develop/scene-viewer)
- **iPhone/iPad yolu:** Apple Quick Look; USDZ modeli. [Apple belgeleri](https://developer.apple.com/quick-look-gallery/)
- **WebXR:** destekleyen cihaz/tarayıcıda ek yol; tek başına tüm telefonları kapsadığı varsayılmaz.
- **İlk uygulama:** R3F konfigürasyonu düzenler; AR isteğinde oluşan GLB model-viewer’a yüklenir. İki görüntüleyici aynı anda sürekli çalıştırılmaz.
- **USDZ:** model-viewer’ın otomatik üretimi önce örnek veranda üzerinde denenir. Malzeme veya uyumluluk sorunu çıkarsa aynı konfigürasyondan ayrı USDZ üretim adımı planlanır. [AR örnekleri](https://modelviewer.dev/examples/augmentedreality/)
- **Ölçek:** metre temelli gerçek ölçüler, zemine oturan model başlangıcı ve `ar-scale="fixed"`. Yerleştirme taşınabilir/döndürülebilir; keyfî büyütme/küçültme engellenir.
- **Gerçek sınır:** AR, görsel yerleştirme aracıdır. Hassas saha ölçümü, duvara otomatik kusursuz hizalama veya yapısal uygunluk garantisi değildir.
- Desteklenmeyen cihazda normal 3D görünüm ve telefonda açma bağlantısı sunulur. HTTPS ve gerçek iPhone/Android testleri gereklidir; bilgisayardaki mobil ekran emülasyonu AR testi sayılmaz.

**Kritik ayrıntı:** Scene Viewer kaynak URL’deki modeli yeniden indirir; tarayıcı sahnesinde yapılan değişiklikleri kendiliğinden devralmaz. Bu nedenle ölçüler, parçalar ve renkler uygulanmış son GLB hazırlanıp erişilebilir bir HTTPS adresine yüklenmelidir. Sadece geçici `blob:` adresine güvenilmez. iOS için kullanılan USDZ de aynı tasarımı temsil etmelidir. [model-viewer sahne değişiklikleri](https://modelviewer.dev/examples/scenegraph/)

### 3.4. PDF ve yazdırma

- **Paket:** [`@react-pdf/renderer`](https://react-pdf.org/). Bu, PDF üretme paketidir; benzer isimli PDF görüntüleme paketleriyle karıştırılmamalıdır.
- İlk sürümde tarayıcıda, sunucudan doğrulanmış fiyat özetiyle PDF oluşturulabilir. Resmî teklif arşivi gerektiğinde sunucu üretimi ayrıca değerlendirilir.
- PDF içeriği: logo, tarih, konfigürasyon numarası, 3D görsel, ölçüler, çatı/renk/opsiyonlar, fiyat kalemleri, vergi ve montaj/nakliye kapsamı, fiyat geçerliliği, yeniden açma bağlantısı.
- Türkçe/Almanca karakterleri destekleyen lisanslı bir font gömülür; uzun seçenek listeleri sayfa taşması açısından kontrol edilir.
- WebGL sahnesinin görseli kontrollü olarak alınır; model ve dokuların yüklenmesi beklenir. Farklı kaynaktan gelen dokular için CORS doğru kurulmalıdır.
- PDF müşterinin indirme/yazdırma eylemiyle açılır. Mobil indirme/paylaşma ve yazdırma ayrı ayrı denenir.
- PDF, AR modeli ve fiyat aynı konfigürasyon sürümünden oluşturulur; model değişirken eski fiyatlı PDF üretilemez.

### 3.5. Sunucu, kayıt ve fiyat

Önerilen başlangıç hizmeti **Supabase**. Arayüz Vercel'de, kayıt/depolama ve fiyat uçları başlangıç önerisinde Supabase'de çalışır. Wix veya WordPress API'sine bağımlılık kurulmaz. Hizmet hesabı, bölge ve bütçe henüz belirlenmedi.

- PostgreSQL: ürün kataloğu, konfigürasyon, fiyat sürümü ve teklif kaydı.
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions): ölçü/seçenek doğrulama, fiyat hesaplama, kontrollü kayıt ve dosya yükleme yetkisi. TypeScript destekli Deno ortamıdır; sınırsız bir Node.js sunucusu gibi varsayılmaz.
- [Supabase Storage](https://supabase.com/docs/guides/storage): GLB, gerektiğinde USDZ ve önizleme görselleri.
- `@supabase/supabase-js`: bu hizmetler seçilirse uygulama bağlantısı.
- Ürün kuralları ve fiyat hesabı framework’ten bağımsız TypeScript modülleri olarak tutulur.
- Fiyatın yetkili sonucu sunucudan gelir. Tarayıcının gönderdiği toplam veya indirim kabul edilmez; sunucu katalogdan yeniden hesaplar.
- AR dosyalarının görüntüleyici tarafından erişilebilmesi gerekir; dosya bağlantısı ile kişinin iletişim bilgileri ayrılır. Yükleme boyutu, yetki, saklama süresi ve istek sınırı belirlenir.
- İlk prototip yerel JSON katalogla başlayabilir. Kalıcı telefon bağlantısı, doğrulanmış fiyat ve AR dosyası paylaşımı için sunucu aşaması tamamlanır.

### 3.6. Tasarım, kalite ve bakım

- [Figma](https://help.figma.com/hc/en-us/articles/360040314193-Guide-to-prototyping-in-Figma): isteğe bağlı ekran tasarımı ve tıklanabilir akış. Şart değil; önce marka ve ekran akışı kararlaştırılır. Bu çalışma için bir eklenti kurulmadı.
- [Vitest](https://vitest.dev/guide/) — `vitest`: fiyat, ölçü sınırları ve parça sayısı kurallarının testleri.
- [Playwright](https://playwright.dev/docs/intro) — `@playwright/test`: seçim → kayıt → yeniden açma → PDF gibi müşteri akışı testleri.
- TypeScript kontrolü, ESLint ve biçimlendirme: teslimlerin tutarlılığı.
- Git ve seçilecek bir depo/CI hizmeti: değişiklik geçmişi, önizleme, kontrol ve geri dönüş.
- Gerçek cihaz testi: en az hedeflenen bir iPhone/Safari, AR destekli Android/Chrome ve masaüstü tarayıcılar.
- Başlangıçta uygulama hata kayıtları; gerçek kullanıcı trafiği başlamadan önce uygun hata izleme hizmeti seçilir. Kişisel bilgiler hata kayıtlarına taşınmaz.

## 4. Alternatif yollar: neden bunları başlangıç seçmiyorum?

| Seçenek | Ne zaman uygun? | Bu proje açısından değerlendirme |
| --- | --- | --- |
| [Babylon.js](https://www.babylonjs.com/) | Başka bir güçlü web 3D motoruyla özel uygulama | Geçerli alternatif; Three.js ile birlikte iki motor kurmaya gerek yok |
| [Roomle](https://www.roomle.com/en) / [Threekit](https://www.threekit.com/) | Ticari görsel konfigürasyon platformu ve hazır işletme entegrasyonları | Lisans, ürün kurallarına uyum ve model aktarım süreci ayrıca değerlendirilir |
| [ShapeDiver](https://www.shapediver.com/) | Grasshopper tabanlı parametrik hesaplama gereken ürünler | Mevcut parçalar SketchUp’ta olduğundan doğrudan başlangıç yolu değil |
| Sadece model-viewer | Sabit bir ürünü 3D/AR göstermek | Çok parçalı ölçüye göre montaj ve fiyat kurallarını yine bizim geliştirmemiz gerekir |

Bunlar teknik alternatiflerdir; tedarikçi fiyatları veya pazar payları hakkında doğrulanmamış bir sıralama yapılmamıştır.

## 5. Uygulamanın asıl çekirdeği: ürün kuralları

En büyük iş, 3D parçaları göstermekten çok hangi birleşimin üretilebilir olduğunu tanımlamaktır. SketchUp modeli bu kuralları kendiliğinden içermez.

- Her ürün/parçaya kalıcı kimlik: örneğin `post_100x100`, `front_beam_a`, `roof_panel_clear`.
- Ölçüler uygulama verisinde tam sayı **mm**; 3D sahneye geçişte **metre**. Para hesabında kuruş/cent gibi en küçük birim veya açık ondalık hesap kullanılır.
- Ürün bazında min/max genişlik, derinlik, yükseklik ve izin verilen ölçü adımları.
- Kolon aralığı, gereken kolon sayısı, taşıyıcı profil seçimi, çatı eğimi, panel bölünmesi ve bağlantı payları.
- Duvara bağlı / bağımsız sistem farkları, drenaj yönü, yan cam/screen uyumu, elektrikli opsiyonların bağımlılıkları.
- Kullanıcının ölçüsü net açıklık mı, dıştan dışa mı? Fiyat ve 3D aynı tanımı kullanır.
- Kurallar üreticinin verdiği tablolarla belirlenir. Taşıma kapasitesi ve gerekli yapısal sınırlar tahmin edilmez; gerekirse “özel inceleme gerekli” sonucu verilir.
- Geçersiz seçenek sessizce değiştirilmez: neden seçilemediği veya hangi değişikliğin gerektiği açıklanır.

Önerilen veri akışı:

```text
Müşteri seçimleri + katalog sürümü
                ↓
        Doğrulanmış konfigürasyon
                ↓
      Montaj planı + parça listesi (BOM)
                ↓
    ┌───────────┼─────────────┐
    3D sahne    Sunucu fiyatı  GLB / USDZ → AR
    └───────────┴─────────────┘
                ↓
       Aynı sürümün özeti → PDF
```

Kayda alınacak temel bilgiler: `schemaVersion`, `catalogVersion`, `priceVersion`, `assetVersion`, ürün kimliği, ölçüler, seçenek kimlikleri, para birimi ve kayıt kimliği. Kamera açısı tasarımın ticari verisinden ayrı tutulur. Eski kaydın yeni fiyatla açıldığı kullanıcıya belirtilir.

Fiyat yalnızca “metrekare × fiyat” olmak zorunda değildir. Gerçek hesap; profil uzunlukları, panel adedi/alanı, sabit bağlantılar, kesim/fire kuralları, renk farkı, aksesuar, montaj, nakliye, indirim ve vergiyi içerebilir. Hangi kalemlerin dahil olduğu ürün sahibi tarafından belirlenir. Fiyat tablosu gelmeden gerçek satış fiyatı uydurulmaz.

## 6. SketchUp modellerini nasıl hazırlamalısın?

Kullanıcı SketchUp 2026 kullanıyor. Prime/Premium ve Glasschiebewand modelleri artık `Models` klasöründe mevcut. İlk dosya incelemesi yapıldı; gerçek montaj ve cihaz üzerinde AR kabulü ayrıca yapılacak. Aşağıdaki aktarım rehberi sonraki parçalar için de geçerlidir.

### 6.1. Önce küçük bir örnek set

Tüm arşivi dönüştürmeden önce şu örnek yeterli:

- Bir kolon, bir ana kiriş, bir ara taşıyıcı, bir çatı paneli ve varsa bağlantı/kapak parçası.
- Bu parçalarla yapılmış, ölçüleri bilinen bir tamamlanmış veranda.
- Kaynak `.skp` dosyaları, varsa dokular ve mümkünse GLB çıktıları.
- Her parça için gerçek ölçü, hangi yönde uzayabileceği ve bağlantı noktası bilgisi.

Bu setle ölçü, renk, parça birleşimi, cam görünümü ve telefondaki AR aktarımı doğrulanır. Sonra kalan parçalar aynı kurala göre hazırlanır.

### 6.2. Tercih edilen export

Güncel SketchUp yardımında **File → Export → 3D Model → GLTF Binary File (*.glb)** yolu belgeleniyor. Menü ve erişim senin sürüm/platform/lisansına göre kontrol edilmeli. [Resmî GLB export rehberi](https://help.sketchup.com/en/sketchup/working-gltf-files)

1. Asıl `.skp` dosyasının kopyası üzerinde çalış.
2. Her tekrar kullanılabilir parçayı adlandırılmış bir component olarak düzenle.
3. Parça başına bir GLB ve ayrıca bir referans montaj GLB’si hazırla. Seçimi dışa aktarma desteği yoksa parçayı temiz geçici modele alıp dışa aktar.
4. İsimleri sade tut: `post_100x100_v001.glb`, `beam_front_v001.glb`. Dosya adını fiyat kimliği yerine kullanma; kimlikleri ayrıca kaydet.
5. GLB’yi tekrar açıp dış ölçüleri, malzemeleri ve yönünü kontrol et. Bir metre uzunluk dışa aktarımdan sonra da bir metre olmalı.

GLB seçeneği yoksa sürümünde sunulan **FBX** gibi bir ara formatla Blender üzerinden GLB üretme yolu değerlendirilebilir. **DAE** de SketchUp’ta bir seçenektir, ancak alıcı programın/sürümün DAE desteği ayrıca kontrol edilir; her Blender sürümünün aynı format desteğine sahip olduğu varsayılmaz. Ara formatla birlikte doku dosyaları da korunur. [SketchUp aktarım seçenekleri](https://help.sketchup.com/en/sketchup/using-sketchup-data-other-modeling-programs-or-tools), [Blender glTF aktarımı](https://github.com/KhronosGroup/glTF-Blender-IO)

### 6.3. Püf noktaları

- **Birim:** SketchUp’ta mm ile çalışabilirsin; final glTF/GLB için metre dönüşümü bir kez yapılır. Bilinen ölçülü referansla test edilir.
- **Eksen:** SketchUp Z-up, hedef web sahnesi Y-up düzenine göre aktarım kontrol edilir. Önerilen hedef: X genişlik, Y yükseklik, Z derinlik; ön/arka yön de katalogda sabitlenir.
- **Pivot:** kolon tabanındaki ve kiriş ucundaki montaj referanslarını tutarlı seç. Her parçayı merkezinden yerleştirmek bağlantıları zorlaştırabilir.
- **Bağlantı noktaları:** adlandırılmış düğüm olarak korunabiliyorsa kullan; korunmuyorsa ayrı parça manifestinde yerel koordinatları tut. SketchUp kılavuz çizgilerinin exportta kalacağını varsayma.
- **Yüz yönleri:** dış yüzler dışarı baksın; tek yüzlü ters yüzler AR’de kaybolabilir. İki taraflı malzeme, hatalı geometriyi düzeltmenin varsayılan yöntemi olmasın.
- **Geometri temizliği:** gereksiz iç detayları, çok küçük vidaları ve görünmeyen yüzleri performans için değerlendir. Kaynak dosyaları ayrıntılı halde sakla.
- **Malzeme isimleri:** `aluminium_frame`, `glass_clear`, `roof_opal`, `gasket_black` gibi anlamlı adlar kullan. Renk değişimi için aynı geometrinin her renk sürümünü çoğaltma.
- **Cam:** saydamlık, kalınlık ve yansımalar web/Android/iOS arasında farklı görünebilir. Basit ve uyumlu PBR malzeme ile başla; gerçek telefonda doğrula.
- **Dokular:** başlangıçta çoğu parça için 1K–2K yeterli olabilir; bu kalite hedefidir, katı kural değildir. Düz renkli alüminyum için büyük fotoğraf dokusu gerekmeyebilir.
- **Ölçekleme:** kirişin uzunluğunu değiştirirken profil kesiti, delikler, conta, kapaklar ve bağlantılar bozulmamalı. Sabit uç + uzayan orta bölüm, profil ekstrüzyonu veya katalog varyantı parça bazında seçilir.
- **Tekrarlı elemanlar:** çatı genişleyince tüm modeli germek yerine panel/taşıyıcı adedi ve yerleşimi kurallardan hesaplanır.
- **Aynalanmış parçalar:** negatif ölçek ve yüz yönü kontrol edilir; sol/sağ parçalar gerektiğinde ayrı varlık olur.
- **Optimizasyon:** değiştirilebilir parçalar tek mesh halinde birleştirilmez; işlevsel isimler ve montaj noktaları korunur.
- **STL:** renk, malzeme ve component yapısı gereken bu işte ana teslim biçimi olarak tercih edilmez.

Önerilen başlangıç performans bütçesi: tamamlanmış AR modelini mümkünse yaklaşık 10 MB veya altında tutmak; tipik modelde yaklaşık 100 bin üçgen ve 1K–2K dokularla denemeye başlamak. Bunlar proje hedefidir, platform garantisi değildir. Nihai sınırlar gerçek veranda karmaşıklığı ve hedef telefonlarda bellek/yükleme ölçümüyle belirlenir.

## 7. Mevcut web sitesinde yayınlama

- **Seçilen hedef:** Vercel üzerinde bağımsız React + Vite uygulaması; örnek adres `konfigurator.seninalanin.com`. Vercel Vite projelerini ve özel alan adı bağlamayı destekler. [Vite desteği](https://vercel.com/docs/frameworks/frontend/vite), [özel alan adı](https://vercel.com/docs/domains/working-with-domains/add-a-domain)
- **Bugün Wix:** menüye veya ürün sayfasına “Verandanı tasarla” bağlantısı eklenir; aynı sekmede konfigüratör açılır. Uygulamada markaya uygun başlık ve ana siteye dönüş bağlantısı bulunur.
- **Yarın WordPress:** aynı bağlantı yeni siteye eklenir. Uygulama Vercel'de kalır; tasarım kayıtları, PDF/QR bağlantıları ve modeller CMS taşınmasından bağımsız olur.
- **DNS:** Vercel'in proje için verdiği alt alan adı kaydı, DNS'i yöneten sağlayıcıda eklenir. DNS Wix tarafından yönetiliyorsa Wix paneli; alan adı yalnızca pointing ile Wix'e bağlıysa yetkili DNS sağlayıcısı kullanılır. Ana alan adının ve e-postanın kayıtları korunur. [Wix dış kaynağa alt alan adı bağlama](https://support.wix.com/en/article/connecting-a-subdomain-to-an-external-resource)
- **WordPress'e geçişte:** DNS sağlayıcısı/nameserver değişirse konfigüratör kaydı da yeni DNS'e taşınır. Alt alan adı ve Vercel projesi korunur.
- **Aynı site yolu:** `site-adresin/konfigurator/` adresi özel gereksinim haline gelirse proxy/platform olanakları ayrıca incelenir. Alt alan adı, aynı alan adı altındaki bir klasör yolu değildir.
- **Iframe:** başlangıç yöntemi olarak seçilmedi. Doğrudan sayfa açılması AR, PDF ve telefon paylaşımı akışlarının ana entegrasyon yoludur. Sonradan gömme istenirse cihaz/izin kontrolleriyle ayrıca değerlendirilir.
- **Yayın ayarları:** Vite çıktı dizini, alt alan adı kökü için `base`, uygulama içi bağlantıların yenileme yönlendirmeleri, HTTPS, CORS, GLB/USDZ içerik türleri ve önbellek sürümleri doğrulanır.
- **Ortamlar:** geliştirme önizlemesi ve canlı ortam ayrılır. Canlı müşteri bağlantıları kalıcı alan adını kullanır; önizleme adresleri PDF ve QR'a yazılmaz.
- **İşletim:** geri dönüş planı, uygun ticari kullanım planı, depolama ve trafik bütçesi yayın aşamasında kontrol edilir. Bu karar herhangi bir ücretli hesap satın alındığı anlamına gelmez.

Vercel arayüzü yayınlar; Supabase önerisi fiyat/kayıt/depolama görevlerini üstlenir. Aynı fiyat hesabı hem Supabase hem Vercel'de iki ayrı uygulama olarak geliştirilmez. Barındırma değişirse taşınabilir veri modeli ve bağımsız TypeScript kuralları korunur. Trafik bilinmeden aylık tutar verilmez.

## 8. Unutulmaması gereken ürün ihtiyaçları

- Müşteri “fiyat” gördüğünde bunun tahmini bedel mi, bağlayıcı teklif mi olduğunu bilmeli; montaj, nakliye ve vergi kapsamı açık olmalı.
- Fiyat ve ürün kataloğunun kim tarafından, nasıl güncelleneceği belirlenmeli. İlk sürümde sürümlü veri dosyası yeterli olabilir; sonra yönetim ekranı eklenebilir.
- Ürün kurallarının sahibi ve onaylanmış örnek hesaplar hazırlanmalı; örneğin standart, minimum, maksimum, ek kolonlu ve aksesuar eklenmiş tasarımlar.
- Mobilde sayısal giriş, birim etiketi, geri adım, sıfırla/geri al, yükleme ilerlemesi ve taslak kurtarma bulunmalı.
- Erişilebilirlik: klavye kullanımı, alan açıklamaları, yeterli kontrast; yalnızca 3D görüntüye bakmadan okunabilen seçenek özeti.
- Büyük model, yavaş bağlantı, WebGL kaybı, AR desteği olmaması, dosya yükleme ve PDF hataları için anlaşılır durum ekranları.
- Paylaşım bağlantısı kişisel bilgi taşımamalı. İletişim bilgisi toplanacaksa saklama, silme, erişim ve hedef pazara göre gizlilik metni gereksinimleri ayrıca belirlenmeli.
- Yayın dili Almanca; hedef ülke, para birimi, marka yazı tipleri, renkler ve mobil hedef cihazlar ayrıca belirlenmeli.
- Gelecekte ödeme eklenirken eski tarayıcı toplamına güvenilmez; sipariş öncesi fiyat/uygunluk tekrar doğrulanır. Konfigürasyon kaydı ile sipariş kaydı ayrı tutulur.

## 9. Astra, Sol ve Luna çalışma düzeni

- **Astra:** gereksinimler, mimari, görevlerin kapsamı ve kabul ölçütleri; teknik kararlar, entegrasyon kontrolü ve bütün hataların çözümü.
- **Sol:** Astra’nın tanımladığı veri modeli, kurallar, fiyat, 3D montaj, sunucu, AR/PDF bağlantıları ve ilgili testlerin uygulanması.
- **Luna:** Astra’nın tanımladığı ekranlar, responsive yerleşim, form bileşenleri, görsel stil, müşteri metinleri ve PDF yerleşiminin uygulanması.
- İhtiyaca göre tasarım/kod görevleri yeniden dağıtılabilir; aynı dosyada eşzamanlı çalışma ancak Astra’nın belirlediği sınırlarla yapılır.
- Sol/Luna hatayı mevcut kanıtla `Problems.md` dosyasına kaydeder; kendi görev ve dosya sınırları içinde tek bir gerekçeli düzeltme yaklaşımı ve bir doğrulama turu uygular. Başarılıysa kanıtla kapatıp devam eder. Başarısızsa veya doğrulanamıyorsa ikinci deneme yapmadan Astra’ya devreder ve bağımlı işi durdurur; bağımsız işler sürebilir. Yetki/bilgi/güvenlik engelinde doğrudan devreder. Ayrıntılı ve bağlayıcı akış `AGENTS.md` içindedir.
- Tek deneme yetkisi görev/dosya sınırları içindedir; tekrar tekrar çalıştırma, test gevşetme, hatayı gizleme veya güvenlik kısıtını aşma yasaktır.
- Astra hatayı inceler, çözer, doğrular ve kaydın durumunu günceller. Model/üretim/fiyat bilgisi eksikse onu tahmin etmek yerine açık soruya dönüştürür.
- Her görev kartında amaç, dokunulacak dosyalar, girdi/çıktı, kabul ölçütü, gerekli test ve teslim notu bulunur.

Bu kurallar ayrıca projenin `AGENTS.md` dosyasına yazılmıştır. Dosya çalışma davranışını tanımlar; model seçimini kendi başına değiştiren bir mekanizma değildir. Görev devredilirken istenen Sol/Luna modeli ayrıca seçilir.

## 10. Sonraki planlama sırası

Bu bölüm genel aşamaları gösterir. Modellerin daha sonra paylaşılacağı bilgisiyle güncel görev sırası [Modeller öncesi uygulama planında](MODELLER_ONCESI_UYGULAMA_PLANI.md) tanımlandı: veri/arayüz ve geçici geometriyle teknik deneme şimdi; gerçek model kabulü dosyalar gelir gelmez. Aşağıdaki gerçek model denemesi, modelden bağımsız hazırlık işlerinin ön koşulu değildir.

| Aşama | Çıktı | Sonraki aşamaya geçiş ölçütü |
| --- | --- | --- |
| 1. Ürün ve site keşfi | İlk veranda ailesi, ölçü/opsiyon kuralları, fiyat örnekleri, mevcut site bilgisi | Belirsiz kurallar listelenmiş; ilk kapsam belirlenmiş |
| 2. Teknik örnek | Bir gerçek veranda modeli → GLB → Android/iOS AR; örnek fiyat ve PDF | Ölçek, cam, parça dönüşümü ve temel cihaz desteği doğrulanmış |
| 3. Veri ve ekran planı | Veri şeması, parça sözleşmesi, ekran akışı, marka stili | Astra’nın Sol/Luna için kabul ölçütleri hazır |
| 4. İlk çalışan dilim | Bir ürünün ölçü/opsiyon/3D/fiyat akışı | Onaylı örneklerle hesap ve montaj eşleşiyor |
| 5. PDF, kayıt ve AR | Aynı tasarımı kaydet, telefonda aç, PDF indir ve AR’de yerleştir | Dört çıktı aynı sürüm ve ölçülerde |
| 6. Yayın hazırlığı | Mobil kontroller, hata durumları, mevcut site entegrasyonu | Gerekli kontroller geçiyor ve açık engelleyici hata bulunmuyor |

AR aktarımı geçici geometriyle erken denenir. Gerçek modeller geldiğinde ölçek, malzeme ve montaj kontrolü öncelikle yapılır; demo sonuçları gerçek ürün doğrulamasının yerine geçmez.

## 11. Bir sonraki adım için senden gereken bilgiler

1. Site adresi ve DNS yönetiminin bulunduğu sağlayıcı. Altyapı netleşti: şimdi Wix, sonra WordPress; uygulama Vercel'de bağımsız yayınlanacak.
2. Hedef ülke, dil ve para birimi.
3. SketchUp 2026 kullanıldığı netleşti. Modeller hazırlanırken platform/lisans ve export menüsündeki GLB seçeneği kontrol edilecek; bu bilgi modelden bağımsız planı engellemez.
4. Prime/Premium ürünleri ve cam/polikarbonat görünüm seçimi netleşti; diğer satış seçenekleri tamamlanacak.
5. Dört ölçünün tanımı netleşti; ölçü sınırları, kolon/panel/taşıyıcı kuralları ve sürgü ray aralıkları bekleniyor.
6. Fiyat tablosu ve birkaç gerçek örnek hesap; montaj/nakliye/vergi kapsamı.
7. Fiyatın tahmini bedel mi kesin teklif mi olması istendiği.
8. Parçalar ve referans montajlar yüklendi; Premium'un ayrı oluk kapaklarının hatalı ölçeği henüz düzeltilmedi.

Bu bilgilerin hepsi ilk konuşmada hazır olmak zorunda değil. İlk ayrıntılı plan, mevcut site ve tek ürün ailesinin kurallarıyla başlayabilir.
