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
units/reading-school-life-a1.html   interaktif ünite · A1 okuma (7 aktivite)
worksheets/                         yazdırılabilir A4 kağıtları (hepsi cevap anahtarlı)
  am-is-are-worksheet.html
  am-is-are-worksheet-a2.html
  reading-school-life-a1.html
```

Her yazdırılabilir kağıdın bir interaktif eşi var; ikisi de aynı alıştırmaları içerir:

| yazdırılabilir | interaktif |
|---|---|
| `worksheets/am-is-are-worksheet.html` | `units/am-is-are-a1.html` |
| `worksheets/am-is-are-worksheet-a2.html` | `units/am-is-are-a2.html` |
| `worksheets/reading-school-life-a1.html` | `units/reading-school-life-a1.html` |

Çalışma kağıtlarının üstündeki ince şerit (ana sayfa · interaktif sürüm · tema düğmesi)
yalnızca ekranda görünür, yazdırmada çıkmaz.

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
