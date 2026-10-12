# english-worksheets

İngilizce alıştırma sitesi: interaktif üniteler (sürükle-bırak, cümle sıralama, boşluk
doldurma) + yazdırılabilir A4 çalışma kağıtları.

Kurulum yok, derleme yok: `index.html` dosyasını tarayıcıda açmak yeterli.

```
index.html                          ana sayfa (ünite kartları + ilerleme)
assets/style.css                    ortak tema (açık/koyu) + aktivite stilleri
assets/engine.js                    aktivite motoru (sürükle-bırak, kontrol, kayıt)
units/am-is-are-a1.html             interaktif ünite · A1 (17 aktivite)
units/am-is-are-a2.html             interaktif ünite · A2 (17 aktivite, there is/there are + was/were)
units/have-got-a1.html              interaktif ünite · A1–A2 (14 aktivite, have got/has got + be dönüşümü)
units/reading-school-life-a1.html   interaktif ünite · A1 okuma (7 aktivite)
worksheets/                         yazdırılabilir A4 kağıtları (hepsi cevap anahtarlı)
  am-is-are-worksheet.html
  am-is-are-worksheet-a2.html
  have-got-worksheet.html
  reading-school-life-a1.html
```

Her yazdırılabilir kağıdın bir interaktif eşi var; ikisi de aynı alıştırmaları içerir:

| yazdırılabilir | interaktif | baskı |
|---|---|---|
| `worksheets/am-is-are-worksheet.html` | `units/am-is-are-a1.html` | 11 + 3 sayfa |
| `worksheets/am-is-are-worksheet-a2.html` | `units/am-is-are-a2.html` | 11 + 4 sayfa |
| `worksheets/have-got-worksheet.html` | `units/have-got-a1.html` | 12 + 3 sayfa |
| `worksheets/reading-school-life-a1.html` | `units/reading-school-life-a1.html` | 5 + 2 sayfa |

Çalışma kağıtlarının üstündeki ince şerit (ana sayfa · interaktif sürüm · tema düğmesi)
yalnızca ekranda görünür, yazdırmada çıkmaz.

## Baskı düzeni

Her `<section class="page">` tam olarak bir A4 sayfasına karşılık gelir ve bu, Chrome ile
gerçek PDF çıktısı alınarak doğrulanmıştır (bölüm sayısı = PDF sayfa sayısı).

- `@page { margin: 0 }` kullanılır, kenar boşlukları `.page` dolgusuna (`13mm 15mm 10mm`)
  taşınmıştır. Böylece tarayıcının kendi üstbilgi/altbilgisine (tarih, sayfa adresi) yer
  kalmaz ve baskıda görünmez. Yine de çıkıyorsa yazdırma ekranındaki
  "Üstbilgi ve altbilgi" kutucuğunu kapatmak kesin çözümdür.
- `.footer`'daki `margin-top: auto` altbilgiyi her sayfanın en altına sabitler.
- **Bir bölüme alıştırma eklerken dikkat:** içerik bir sayfayı aşarsa bölüm ikiye bölünür
  ve altbilgi sayfa ortasında kalır. Bir A4'e yaklaşık **255 mm** içerik sığar; daha fazlası
  için yeni bir `<section class="page">` açın ve altbilgilerdeki `Page n of N` değerlerini
  güncelleyin.

## Öğrenci nasıl kullanır?

- **Sürükle:** bankadaki mavi blokları boşluğa taşı. Bloklar **bitmez** (üzerlerinde ∞ işareti var), aynı blok defalarca kullanılabilir.
- **Tıkla:** bloğa tıkla → boşluğa tıkla. (Dokunmatik ekranda da çalışır.)
- **Sil:** boşluğa yerleştirilmiş bloğa tıkla, ya da onu dışarı sürükle.
- **Cümle sıralama:** kelime kutularını sürükleyerek sırala, veya iki kutuya sırayla tıklayarak yerlerini değiştir.
- Her aktivitenin altında **Kontrol et / Temizle / Cevapları göster** düğmeleri; üstte toplam ilerleme çubuğu var.
- Cevaplar ve puanlar `localStorage`'a kaydedilir (sayfa yenilense de durur). "Sıfırla" hepsini siler.

## Yeni ünite eklemek

`units/am-is-are-a1.html` dosyasını kopyalayın, sayfa sonundaki `UZ.mount({...})` çağrısındaki
`unit` kimliğini ve `activities` dizisini değiştirin. Sonra `index.html` içine bir kart ekleyin
(`data-unit="<unit-kimliği>"` yazarsanız kartta ilerleme yüzdesi görünür).

```js
UZ.mount({
  unit: 'present-simple-a1',   // kayıt anahtarı — ünitelere özgü olmalı
  container: '#activities',
  activities: [ /* aşağıdaki tipler */ ]
});
```

Metinlerde `___` yazdığınız her yer bir boşluk olur. Başlık (`title`) HTML kabul eder, `tr` ise
Türkçe yönergedir. Her aktivitede `tag` (A, B, C…) rozeti ve kayıt anahtarıdır.

### Aktivite tipleri

| tip | ne yapar | zorunlu alanlar |
|---|---|---|
| `rule` | kural / açıklama kutusu, kontrol edilmez | `title`, `html` |
| `drag` | boşluğa **bitmeyen** blok sürükleme | `bank`, `items:[{q,a}]` |
| `cloze` | paragrafa numaralı boşluklar + blok bankası | `bank`, `text`, `answers` |
| `type` | klavyeyle yazma | `items:[{q,a:[...]}]` |
| `choice` | seçeneğe tıklama (True/False dahil) | `items:[{q,opts,a}]` |
| `order` | taşınabilir kutularla cümle sıralama | `items:[{words,a}]` |
| `free` | serbest yazma, kontrol edilmez ama kaydedilir | `title` |

```js
// boşluğa blok sürükleme — bank blokları tükenmez
{ type:'drag', tag:'A', title:'Drag <i>am</i>, <i>is</i> or <i>are</i>.',
  tr:'Blokları boşluklara sürükle.', bank:['am','is','are'], cols:3,
  items:[ {q:'I ___', a:'am'}, {q:'They ___', a:'are'} ] }

// cümle sıralama — words: kutularda yazan kelimeler (motor karıştırır)
//                   a: doğru sıra (büyük/küçük harf önemsenmez)
{ type:'order', tag:'M', title:'Put the word boxes in order.',
  items:[ { words:['am','I','student','a','.'], a:['I','am','a','student','.'] } ] }

// yazma — birden çok doğru cevap verebilirsiniz
{ type:'type', tag:'B', title:'Short forms', size:'xl',
  items:[ { q:'he is', a:["he's"] } ] }

// seçenek / True-False
{ type:'choice', tag:'C', cols:2,
  items:[ { q:'Lemons ___ yellow.', opts:['is','are'], a:'are' } ] }
```

Ek seçenekler: `cols: 2|3` (sütun sayısı), `wide: true` (geniş boşluk), `size: ''|'lg'|'xl'`
(yazma kutusu genişliği), `sticky: false` (blok bankası kaydırırken üstte yapışmasın),
`reveal: false` ("Cevapları göster" düğmesini gizle), `challenge: true` (turuncu vurgulu kart).

### Kontrol notları

- Cevap karşılaştırması büyük/küçük harf ve fazla boşluğa duyarsızdır; kıvrık kesme işareti (`’`)
  düz kesme işaretiyle (`'`) aynı sayılır.
- `order` tipinde `words` ile `a` aynı kelimelerden oluşmalıdır; uyuşmazlık olursa tarayıcı
  konsoluna uyarı yazılır.
- `cloze` içinde `___` sayısı `answers` uzunluğuna eşit olmalıdır.
