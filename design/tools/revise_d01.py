from pathlib import Path
import xml.etree.ElementTree as ET
N='http://www.w3.org/2000/svg'
ET.register_namespace('', N)
M={
'VERANDA TASARIMI':'TERRASSENPLANER','Aç':'Öffnen','Kaydet':'Speichern','Ölçüler ve görünüm':'Maße & Ansicht','KONFİGÜRATÖR':'KONFIGURATOR','Yapı ve ölçüler':'Aufbau & Maße','Verandanın temel ölçülerini belirle.':'Maße der Überdachung festlegen.',
'Yapı':'Aufbau','Çatı':'Dach','Kolonlar':'Pfosten','Donanım':'Ausstattung','···':'Mehr','Ölçüler':'Maße','Genişlik':'Breite','Derinlik':'Tiefe','Arka yükseklik':'Höhe hinten','Ön yükseklik':'Höhe vorne','Çatı eğimi':'Dachneigung','Yüksekliklerden hesaplanır':'Aus den Höhen berechnet',
'Montaj tipi':'Messpunkte','Duvara bağlı':'Hinten','Seçili':'Unterkante Profil','Bağımsız':'Vorne','Adım 1 / 5':'Bereich frei wählen','Devam et  →':'Zum Dach  →','3D ÖNİZLEME':'3D-VORSCHAU','Tasarım taslağı · Görünümü sürükle':'Designvorschau · Ansicht drehen','Kolonlar · seç':'Pfosten auswählen','ÖRNEK GÖRÜNÜM · GERÇEK FİYAT GÖSTERİLMEZ':'DESIGNENTWURF · KEIN ANGEBOT','Tasarım özeti':'Ihre Planung','Prime · Cam':'Prime · Glas','500 × 300 cm · Fiyat ölçülerden sonra hesaplanır':'500 × 300 cm · Preis noch nicht verfügbar','Özeti gör':'Übersicht',
'ADIM 2 / 5':'BEREICH: DACH ▾','Çatı ve görünüm':'Dach & Material','Malzeme ve bölmeleri belirle.':'Material und Dachfelder wählen.','Çatı malzemesi':'Dacheindeckung','Cam':'Glas','Polikarbonat':'Polycarbonat','7 mm':'','Çatı bölmeleri':'Dachfelder','En az bölme sayısı panel sınırına göre hesaplanır.':'Feldzahl aus der maximalen Plattenbreite.','Panel sınırı':'Max. Plattenbreite','Eşit bölme hesabı · 6 bölme / 7 taşıyıcı':'Gleichmäßig: 6 Felder / 7 Träger','Bölme sayısı':'Anzahl Dachfelder','İlave bölmeler parça sayısını ve fiyatı artırabilir.':'Weitere Felder erhöhen den Preis.','Fiyat, ürün ve seçenekler netleşince gösterilir.':'Preis noch nicht verfügbar.','← Geri':'← Konstruktion','3D ÖNİZLEME · ÖRNEK GÖRÜNÜM':'3D-VORSCHAU · DESIGNENTWURF','Ölçüler  ·  ⌖':'Maße  ·  ⌖','Taşıyıcılar · 7 adet':'7 Träger','Görünümü sıfırla':'Ansicht zurücksetzen','FİYAT ÖZETİ':'PREISÜBERSICHT','Seçeneklerden sonra':'Noch nicht verfügbar',
'Tasarımım':'Meine Planung','Pro':'Premium','3D ÖNİZLEME · ÖRNEK':'3D-VORSCHAU · ENTWURF','Seçili kolon':'Pfosten ausgewählt','Modeli büyüt  ⤢':'Ansicht vergrößern','ADIM 3 / 5 · KOLONLAR':'KONSTRUKTION ▾','Kolon konumu':'Pfostenposition','Kolonu taşı veya ölçüyü sayı ile ayarla.':'Pfosten verschieben oder Position eingeben.','Ön orta kolon · seçili':'Mittlerer Pfosten vorne','Modelde antrasit konturla vurgulanır':'Im Modell dunkel markiert','Komşu kolonla merkez aralığı':'Maximaler Abstand der Pfostenachsen','cm · en fazla':'cm · maximal','Prime’da merkezler arası üst sınır · Her iki komşu aralık':'Prime: maximal 400 cm zwischen den Achsen.','Açıklıkları gör  →':'Felder ansehen  →'
}
for p in Path('design').glob('D01-*.svg'):
 tree=ET.parse(p);root=tree.getroot();root.set('{http://www.w3.org/XML/1998/namespace}lang','de')
 for e in root.iter():
  if e.tag==f'{{{N}}}text' and e.text in M:e.text=M[e.text]
  if e.tag==f'{{{N}}}text':e.set('font-family','Arial, sans-serif')
  if e.tag==f'{{{N}}}title':e.text='Terrassenkonfigurator — '+p.stem+' — Designentwurf'
  if e.tag==f'{{{N}}}desc':e.text='Deutscher Designentwurf mit anthrazitfarbenen Akzenten, hellen Glaspaneelen und vereinfachter Modellillustration.'
 # Remove the tiny multi-tab bar from desktop. A direct section picker has room for complete names.
 if 'MASAUSTU' in p.name:
  for e in list(root):
   if e.tag==f'{{{N}}}text' and e.get('y') in ['219','220']:root.remove(e)
   elif e.tag==f'{{{N}}}rect' and e.get('x')=='46' and e.get('y')=='198':root.remove(e)
   elif e.tag==f'{{{N}}}circle' and e.get('cx')=='328':root.remove(e)
  t=ET.SubElement(root,f'{{{N}}}text',{'x':'58','y':'220','font-family':'Arial, sans-serif','font-size':'14','font-weight':'600','fill':'#383e42'});t.text='Konstruktion'
  t=ET.SubElement(root,f'{{{N}}}text',{'x':'329','y':'220','text-anchor':'end','font-family':'Arial, sans-serif','font-size':'16','fill':'#383e42'});t.text='⌄'
  for e in root.iter(f'{{{N}}}text'):
   if e.text=='DESIGNENTWURF · KEIN ANGEBOT':e.set('x','422');e.set('y','847')
   if e.text=='Ansicht zurücksetzen':e.set('font-size','10')
 elif 'TABLET' in p.name:
  for e in root.iter(f'{{{N}}}text'):
   if e.text=='← Konstruktion':e.text='← Aufbau';e.set('font-size','12')
   if e.text=='Zum Dach  →':e.text='Zu den Feldern →'
 elif 'TELEFON' in p.name:
  for e in root.iter(f'{{{N}}}text'):
   if e.text=='← Konstruktion':e.text='Bereiche ▾'
   if e.text=='Premium':e.set('font-size','9');e.set('x','340')
 tree.write(p,encoding='utf-8',xml_declaration=True)
 print('Updated',p)
