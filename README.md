# GeoJSON Editörü

Tarayıcıda çalışan GeoJSON çizim ve düzenleme aracı. Nokta, çizgi, alan, dikdörtgen ve daire çizin; köşeleri sürükleyin, taşıyın, döndürün, kesin; alan ve uzunluk ölçün; özellik ekleyin; GeoJSON veya WKT olarak dışa aktarın. Sunucu gerektirmez, çizimler tarayıcıda otomatik kaydedilir.

## Özellikler

**Çizim ve düzenleme**
- Nokta, çizgi, alan, dikdörtgen, daire çizimi; çizerken köşelere yapıştırma (snapping)
- Seçili öğede köşe ekleme/taşıma/silme, öğeyi sürükleme, döndürme, alanları kesme, silme
- Kendi kendini kesen alanlar engellenir
- Sınırsız geri al / yinele (son 100 adım)
- Klavye kısayolları: V M L P R C (araçlar), D O X E (taşı, döndür, kes, sil), S (yapıştır), F (sığdır), Esc, Delete, Ctrl+Z / Ctrl+Y

**Ölçüm ve bilgi**
- Alan (m², ha, km²), çevre, uzunluk, köşe sayısı, merkez, sınır kutusu
- Tüm öğeler için toplam alan ve uzunluk
- İmleç koordinatı ve zoom seviyesi durum çubuğu, ölçek çubuğu

**Öğeler ve özellikler**
- Öğe listesi: ad, tür, kısa ölçüm; yakınlaştır ve sil
- Ad ve serbest anahtar-değer özellik düzenleyici
- Görünüm: çizgi ve dolgu rengi, kalınlık, saydamlık ([simplestyle](https://github.com/mapbox/simplestyle-spec) özellikleriyle saklanır: `stroke`, `fill`, `stroke-width`, `fill-opacity`, `marker-color`)
- Araçlar: tampon (buffer) oluşturma, geometri basitleştirme, merkez noktası ekleme, kopyalama, daireyi alana dönüştürme

**İçe / dışa aktarma**
- Dosya seçme veya sürükle-bırak ile GeoJSON yükleme (FeatureCollection, Feature, Geometry veya bunların dizisi)
- Canlı GeoJSON paneli: metni düzenleyip haritaya uygulama, hatalı JSON için açıklayıcı mesaj
- GeoJSON ve WKT indirme veya panoya kopyalama; tümü ya da yalnızca seçili öğe
- Daireler dışa aktarımda 64 köşeli alana dönüştürülür, `radius_m` özelliği eklenir

**Harita**
- Altlıklar: OpenStreetMap, CARTO açık, Esri uydu
- Konum arama (Nominatim)
- Mobil düzen: harita üstte, panel altta

## Teknoloji

- React 19 + TypeScript + Vite 8
- [Leaflet](https://leafletjs.com/) 1.9 + [leaflet-geoman](https://geoman.io/) (çizim ve düzenleme)
- [Turf](https://turfjs.org/) modülleri: `area`, `length`, `bbox`, `centroid`, `circle`, `buffer`, `simplify`

## Mimari notlar

- Tek doğruluk kaynağı React'teki `EditorFeature[]` dizisidir. Harita üzerindeki düzenlemeler (geoman olayları) bu diziye yazılır; arayüzden gelen değişiklikler (içe aktarma, özellik düzenleme, geri al) ise bir `version` sayacıyla harita katmanlarını yeniden kurar. Böylece iki taraf birbirini bozmadan senkron kalır.
- Daireler GeoJSON'da bulunmadığı için nokta + `_radius` olarak saklanır; `_` ile başlayan iç özellikler dışa aktarımda temizlenir.
- Geri al/yinele, öğe dizisinin anlık görüntülerini tutan küçük bir geçmiş kancasıyla yapılır; harita tıklamaları gibi değişiklik üretmeyen olaylar geçmişe yazılmaz.

## Çalıştırma

```bash
npm install
npm run dev
```

Üretim derlemesi:

```bash
npm run build
npm run preview
```
