# Terrassenkonfigurator

React + TypeScript + Vite ile çalışan Almanca konfigüratör prototipi. Arayüz ve şematik 3D çalışıyor; gerçek GLB montajı, gerçek müşteri fiyatı, indirilebilir PDF ve telefon AR deneyimi henüz tamamlanmadı.

**Durum (30 Eylül 2026):** P01/P02/K01 temeli, D02 arayüz, P04/D03 şematik 3D ve kolon/açıklık düzenleme, P05 fiyat altyapısı ve P06 yerel kayıt kodlandı. P07 PDF veri kopyası ile P08 şematik GLB/HTTPS adres sözleşmesi hazır. Son kontrolde 16 dosyada 72 test ve üretim derlemesi geçti. Gerçek montaj (`SOL-K01-001`), fiyat listesi (`SOL-P05-001`) ve telefon AR yayın ortamı (`SOL-P08-002`) bilgi bekliyor. [Güncel durum ve bütün aşamalar](GUNCEL_DURUM_VE_ASAMALAR.md) sonraki görevleri ve kullanıcıdan gerekenleri açıklar.

## Yerel geliştirme

```sh
npm ci
npm run dev
```

`npm run check` tip kontrolünü, `npm run build` tip kontrolü ve üretim derlemesini, `npm test` onaylanmış kurallara ait hesap kontrollerini çalıştırır.

Geliştirme sunucusunda `http://127.0.0.1:5173/?preview=1` örnek ölçülü şematik 3D sahneyi gösterir. Görünüm gerçek Prime/Premium kesiti veya çatı eğimi değildir. Örnek rotanın importu yalnız geliştirmede oluşturulur; üretim paketine dahil edilmediği doğrulandı.

Doğrulanan ortam: Node 26.0.0, npm 11.12.1. Paket sürümleri `package.json` ve kilit dosyasında bulunur. İlk kurulum npm kayıt sunucusuna erişim gerektirir; eksiksiz önbellek oluştuktan sonra `npm ci --offline --no-audit --no-fund` de doğrulanmıştır. Codex sandbox ortamında DNS veya yerel port için `EPERM` alınırsa ilgili ağ/port izni gerekir; uygulama kodunu değiştirerek bu kısıt aşılmaya çalışılmaz.

`.env.example` yalnız tarayıcıya açık örnek ayarları içerir. `VITE_` önekli değişkenlere gizli anahtar konmaz. Sunucu hesabı veya fiyat tablosu olmadan proje açılır; gerçek teklif üretildiği iddia edilmez.

Plan, ürün ölçüleri ve teknik sınırlar kök dizindeki ilgili Markdown belgelerinde tutulur. Dosya sahipliği `AGENTS.md` ve görev kartlarında tanımlıdır. Luna'nın görsel bileşenleri ana uygulamaya bağlıdır; gerçek model ve çıktı servisleri henüz tamamlanmadı.

## Luna ve sonraki uygulama görevleri için sözleşme

- Katalogdaki iki ayrı satış ürünü `prime` ve `premium`; çatı malzemeleri `glass` ve `polycarbonate` kimliklerini kullanır. Boş taslak Prime ile açılır, kayıtlı Premium taslak `parseConfiguration`/`replaceConfiguration` yoluyla Premium kalır.
- Dört giriş ölçüsü `dimensionsMm.width`, `depth`, `rearHeight`, `frontHeight` içinde **mm** olarak saklanır; Almanca arayüzde cm girişi için `centimetresToMillimetres` kullanılır. Geçersiz ondalık hassasiyet sessizce yuvarlanmaz. 3D sınırında `millimetresToMetres` kullanılır.
- `roofBayCount` eşit çatı bölmesi sayısıdır (`null`: onaylı panel üst sınırına göre en az bölme). `postCenters` oluk sol ucundan mm cinsinden merkez konumlarıdır. Kolon açıklığı çatı bölmesinden türetilmez.
- `evaluateConfiguration` alan ve hata kodlarını verir; eksik montaj/fiyat kuralı varken `manufacturable` daima `false` olur. UI bu sonucu üretim veya fiyat onayı gibi göstermemelidir.
- `useConfiguratorStore.getState().replaceConfiguration(next)` şemaya aykırı veriyi reddeder ve başarılı değişiklikte revizyonu artırıp eski fiyat durumunu temizler. Çağıran tarafın taslağını sonradan değiştirmesi kayıtlı durumu değiştirmez.
- `saveCurrentDraft` ve `restoreCurrentDraft` aynı tarayıcının yerel deposunu kullanır. Eski/bozuk kayıt açık hata durumu verir; bu kayıt için paylaşılabilir bağlantı yoktur. Çevrimiçi kayıt hesabı ve sunucu sözleşmesi kurulmadı.
- `buildQuoteFromApprovedPrices` yalnız güvenilir fiyat kaynağından alınan, sürümlü ve kapsamı açıklanmış kalemleri toplar. Runtime tarifesi ve fiyat sunucusu yoktur; testlerdeki sayılar müşteri fiyatı olarak kullanılamaz. Eksik tutar “0 €” diye gösterilmez.
- Gerçek temel fiyat için `basePriceGrid.ts`: genişlikte yukarı 100 cm, derinlikte yukarı 50 cm basamak; eksen bazında minimum fiyat 300/200 cm. Örnek 530 × 320 cm tasarım → 600 × 350 cm fiyat hücresi. Tasarım ölçüleri korunur; bu minimumlar üretim minimumu değildir.
- `respondToGridQuoteRequest` güvenilir sunucu tablo sağlayıcısını `buildGridQuote` üzerinden teklif aritmetiğine bağlar; tarayıcıdan gönderilen tutar/fiyat hücresi kabul edilmez. Temel kalemde `priceBasis`, yanıtta revizyon, ürün ve çatı malzemesi korunur. Ek çatı bölmesi seçilip tarifesi verilmemişse toplam `missing_data` döner; `basePrice` ayrı gösterilebilir. Diğer ekstralar kendi onaylı seçenek/fiyat sözleşmeleri gelince bağlanacak.
- `exportDemoGlb` yalnız tam girilmiş, temel alan kurallarını geçen taslağı **şematik demo** GLB'ye dönüştürür. GLB gerçek profil parçaları veya onaylı montaj değildir. Zemin kılavuzu dışarıda kalır; konfigürasyon revizyonu işlem sırasında değişirse sonuç atılır. GLB yeniden yükleme ve metre ölçeği otomatik kontrolden geçti.
- `buildPdfDocumentSnapshot` aynı konfigürasyon revizyonundan bağımsız bir kopya çıkarır. Ürün, çatı malzemesi, dört ölçü ve taslak numarası bu kopyada korunur; fiyat yoksa/eskiyse/ürünle uyuşmuyorsa durum açıkça `unavailable` olur, sıfır fiyat yazılmaz. Görseli `schematic_demo_only` diye etiketler. Bu yalnız PDF verisidir; Luna'nın şablonu ve indirilebilir PDF henüz yoktur.
- `createLocalArAsset` yalnız aynı tarayıcıdaki önizleme için `blob:` adresi verir; QR ve telefon bağlantısı oluşturmaz. `publishArAsset` güvenilir yayın sağlayıcısı ve herkese açık HTTPS GLB adresi ister; sağlayıcı henüz bağlı değil. `modelViewerArOptions` güncel revizyonun HTTPS adresini model-viewer'a aktarma sözleşmesidir. iOS için ayrı USDZ adresi isteğe bağlıdır; model-viewer Quick Look için USDZ'yi kendisi de üretebilir, ancak cihaz/kullanılabilirlik kontrolü yapılmadı. Gerçek HTTPS depo, model-viewer UI bağlantısı, Android/iPhone denemesi ve gerçek parçaların AR kabulü bekliyor.
# Veranda-Konfigurator
