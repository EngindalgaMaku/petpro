# PetPro

Pet kuaförleri için kabul, hayvan kartı, salon panosu, randevu, bakım karnesi ve kasa.

## Kurulum

```bash
npm install
cp .env.example .env   # DATABASE_URL ve SESSION_SECRET doldurulur
npm run db:push
npm run db:seed        # Örnek salon, iş emirleri ve demo hesapları yükler
npm run dev
```

## Akış

1. Hizmetler ve fiyatlar (kediden dev köpeğe fiyat sınıfı katsayıları)
2. Kabul: sahibinin telefonu → hayvan → hizmetler → kabul muayenesi ve fotoğraf → sahibinin onayı
3. Salon panosu ve iş emri
4. Sahibine takip bağlantısı ve bakım karnesi
5. Randevu takvimi (istasyon çakışması) ve online randevu: `/r/<salon-adresi>`
6. Kasa, giderler, kuaför primi
7. Tıraş ve bakım hatırlatmaları

Kabul muayenesi yalnızca kuaförün gördüğünü kaydeder; teşhis değildir.

## Demo modu

`AUTO_SEED=true` ile uygulama herkese açık demo olarak çalışır: demo salonu açılışta ve her gece 03.00'te yeniden kurulur, demo hesapta şifre, işletme bilgisi ve personel işlemleri kapanır, fotoğraf yüklemeye sınır gelir.

## Android

Android kabuğu henüz eklenmedi. Eklenince giriş sayfasındaki APK bağlantısı da geri gelecek.

## Giriş seviyesi ve kısıtlı mod

Kaydolan işletme 30 gün bütün özelliklerle kullanır. Süre bitince kapanmaz, kayıtlarını kaybetmez; kısıtlı moda düşer: 30 günde en fazla 10 yeni kabul, yeni personel ve yeni fotoğraf yok, online randevu kapalı. Sınırlar `lib/plan.ts` içindedir. Kaydolanlar `/yonetim?key=<ADMIN_KEY>` sayfasında görünür, süre uzatma ve ücretli yapma oradan yapılır. Yalnız ortak demo işletmesi her gece sıfırlanır.
