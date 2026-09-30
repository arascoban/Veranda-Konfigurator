# MODEL-001 — Premium oluk kapakları düzeltmesi

29 Eylül 2026 · Astra · Ölçek/yön/konum hatası çözüldü.

## Kullanılacak dosyalar

- [Sol kapak](../PreparedModels/Premium/Regenrinne/RegenrinneDeckelLinks.fbx)
- [Sağ kapak](../PreparedModels/Premium/Regenrinne/RegenrinneDeckelRechts.fbx)
- [Sayısal doğrulama raporu](MODEL-001-validation.json)
- [Tekrarlanabilir düzeltme ve doğrulama betiği](repair_premium_caps.py)

`Models/` altındaki orijinaller değiştirilmedi. İki FBX ve referans tam montajın SHA-256 değerleri işlem öncesi/sonrası aynı. Dokular, düzeltilmiş kopyaların yanında kendi alt klasörlerinde bulunuyor; referanslar göreli dosya yoluna dönüştürüldü.

## Yapılan düzeltme

- Kaynak tepe noktaları 0,1 ile ölçeklendi.
- Eksen dönüşümü `(x, y, z) → (−z, y, x)` uygulandı. Normal/yön vektörleri de döndürüldü. Dönüşüm ayna içermez; üçgenlerin sırası korunur.
- Her kapak doğru `Premium500x300.fbx` karşılığıyla hizalandı. Kapak plakası yaklaşık 0,2 × 17,6 × 20,4 cm oldu (referans montajın X/Y/Z eksenleriyle).
- Kullanıcının **içeriden bakış** adlandırması korundu: duvardan bahçeye (+Z) bakarken sol +X ucunda, sağ −X ucunda. Sol/sağ geometri ve vidaların yönü referansla eşleştirildi.
- Her dosyadaki beş mesh (kapak + dört vida), referansın beş karşılığıyla iki yönde en yakın tepe noktası uzaklığı bakımından karşılaştırıldı. En büyük hata 0,0000001 cm kabul toleransının altında; ayrıntılar JSON raporunda.
- FBX tekrar okundu: üçgen indeksleri, mesh sayısı, yön vektörü uzunlukları, birim ve dokular kontrol edildi. Kaynak ve çıktı üçgen indeksleri bire bir aynı.

## Sol'un entegrasyon notu

Bu kopyalar **500×300 referans montajının cm koordinatlarında** hizalıdır; sıfır noktasına taşınmış genel web parçaları değildir. JSON'daki `reference_anchor_cm` kapağın referans alt köşesidir. Parametrik montajda bu referansı ayırıp yeni oluk ucuna yerleştirmek gerekir; genişlik artarken kapak kesiti ölçeklenmez. Web aktarımında cm→metre dönüşümü bir kez yapılır.

Bu kabul, ilgili kaynak ölçek/yön/konum hatasını kapatır. GLB hazırlama, gerçek uygulama montajı, malzeme görünümü ve telefon AR kabulü kendi görevlerinde yapılacak. Yanlış ölçekli orijinal dosyalar uygulamaya bağlanmamalı.
