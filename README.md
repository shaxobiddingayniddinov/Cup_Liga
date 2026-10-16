# Stakan Liga — onlayn

Stakan-o'yinchilar bilan first-person sport o'yini: voleybol, basketbol, badminton, stol tennisi.
Do'stlar bitta xonada o'ynaydi, bo'sh joylarni botlar to'ldiradi.

## Fayllar

- `public/index.html` — o'yinning o'zi
- `server.js` — xonalar va o'yinchilar o'rtasida xabar uzatadigan kichik server
- `package.json` — server uchun kerakli paket (`ws`)
- `render.yaml` — Render sozlamalari

## Render.com'ga joylash

1. **GitHub'ga yuklash**
   - github.com → o'ng yuqorida **+** → **New repository** → nomi `stakan-liga`, **Public** → **Create repository**.
   - Ochilgan sahifada **uploading an existing file** havolasini bosing.
   - Arxivdan chiqarilgan hamma narsani (`public` papkasi, `server.js`, `package.json`, `render.yaml`, `README.md`) sudrab tashlang → **Commit changes**.

2. **Render'da ishga tushirish**
   - render.com → **Get Started** → GitHub orqali kiring.
   - **New +** → **Web Service** → `stakan-liga` reposini tanlang → **Connect**.
   - Sozlamalar: Runtime — **Node**, Build Command — `npm install`, Start Command — `node server.js`, Instance Type — **Free**.
   - **Deploy Web Service** ni bosing. 2–3 daqiqada `https://stakan-liga.onrender.com` ko'rinishidagi havola paydo bo'ladi.

3. **O'ynash**
   - Havolani oching → **ONLAYN O'YIN** → ismingizni yozing → **XONA YARATISH**.
   - **HAVOLANI NUSXALASH** ni bosib do'stingizga yuboring (yoki 4 harfli kodni ayting).
   - Hamma kirgach, sportni tanlab **BOSHLASH** ni bosing.

## Bilish kerak

- Bepul Render serveri 15 daqiqa hech kim kirmasa "uxlab qoladi". Keyingi ochilishda ~1 daqiqa kutiladi.
- Xona egasining brauzeri o'yinni hisoblaydi. U chiqib ketsa, xona yopiladi.
- Bir xonada ko'pi bilan 4 kishi: voleybol va basketbolda 2×2, badminton va stol tennisida 1×1.

## Kompyuterda sinash

```
npm install
npm start
```
Keyin brauzerda `http://localhost:3000` ni oching.
