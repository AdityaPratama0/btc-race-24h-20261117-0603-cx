# Strategi: hold dengan crash guard

Bot ini cuma punya satu simbol (CBBTC) dan satu round trip. Gak ada indikator, gak ada sinyal. Ide-nya: ikut naik selama trennya naik, keluar kalau trennya patah.

## Aturan masuk

Tunggu 15 bar dulu sejak window mulai. Bar ke-15, beli pakai semua cash yang bisa dipakai.

Ukuran posisi:
- `cash - 1_000_000` raw unit, itu buffer 1 USDC buat fee dan slippage yang gak kelihatan di harga.
- Di-cap ke `max_weight_bps * equity / 10000`, biar gak nabrak caps.
- Kalau hasilnya di bawah `fees.min_notional_quote_units`, gak beli sama sekali. Lebih baik flat daripada order yang ditolak.

Slippage toleransi 200 bps per fill. Di ukuran ini impact pool kecil, tapi 200 bps kasih ruang kalau depth-nya lagi tipis.

## Aturan keluar: trailing stop 12%

Selama posisi terbuka, simpan `peakClose`, yaitu close tertinggi yang pernah dilihat sejak masuk. Tiap bar:

```
peakClose = max(peakClose, close)
if close < peakClose * 88 / 100: jual semua qty
```

Artinya: selama harga bikin high baru, tahan. Begitu harga turun 12% dari puncaknya, keluar di close itu juga.

Kenapa 12%? Itu yang lolos di window dev: drawdown aktual 2.12%, jauh di bawah batas 25%. Stop yang lebih rapat bikin kena noise, stop yang lebih longgar bikin drawdown naik tanpa nambah return, karena window-nya cuma 24 jam.

## Kenapa cuma satu round trip

Setelah exit, bot gak pernah beli lagi. Keputusan ini sengaja. Window-nya pendek, dan sinyal entry kedua gak punya dasar apa pun selain "harga udah turun". Trailing stop yang kena biasanya berarti momentum-nya udah rusak, dan masuk lagi cuma nambah fee.

## Biaya yang harus dibayar

Dari hasil grade dev:
- Fee total: 800,403 raw unit (0.80 USDC) dari modal 1,000 USDC. Itu sekitar 0.08% untuk masuk dan keluar.
- Net PnL: +2,605,903 raw unit (2.61 USDC), return 0.26%.
- Gross sebelum fee kira-kira 3.41 USDC. Fee makan hampir seperempat dari gross.
- Exposure 98.86%. Praktis selalu di pasar selama window, karena posisi dibuka di bar 15 dan dipegang sampai stop atau sampai window habis.

Kalau fee naik 2x (skenario `cost_sensitivity` di scorer), net turun ke 1,805,422 raw unit. Masih positif, tapi tipis. Ini strategi yang bergantung pada satu tren naik yang cukup panjang buat nutup biaya bolak-balik.

## Yang gak dipakai

Gak ada clock, gak ada `Math.random`, gak ada baca file, gak ada `console.log`. Semua aritmetika bigint. Hasilnya deterministik: input bar yang sama selalu keluar order yang sama.
