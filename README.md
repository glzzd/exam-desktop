# İmtahan Mərkəzi - Exam Desktop Application

Bu proje, imtahan mərkəzi için masaüstü istemci uygulamasıdır. Electron ve React ile geliştirilmiştir.

## Kurulum ve Çalıştırma

### Geliştirme Modu (Development)

Projeyi geliştirmek için:

```bash
cd client
npm install
npm run dev:electron
```

Backend sunucuyu başlatmak için:

```bash
cd backend
npm install
npm run dev
```

---

## Build Alma (Uygulama Paketleme)

Uygulama paketlemek için aşağıdaki komutları kullanın.

### macOS için Build (Apple Silicon / Intel)

macOS üzerinde, özellikle Apple Silicon (M1/M2/M3) işlemcilerde oluşan "Trace/BPT trap" hatasını önlemek için özel bir build scripti hazırlanmıştır.

```bash
cd client
npm run build:mac
```

Bu komut sırasıyla şunları yapar:
1. `vite build` ve `electron-builder` çalıştırır.
2. `dist/mac-arm64/ExamClient.app` adında temiz bir Electron bundle oluşturur.
3. Uygulama kaynaklarını (app.asar, icon.icns) kopyalar.
4. `Info.plist` ayarlarını düzenler.
5. `sign-app.sh` scripti ile derinlemesine imzalama (Deep Sign) yapar.

**Çıktı Konumu:** `client/dist/mac-arm64/ExamClient.app`

### Windows için Build

Windows için .exe oluşturmak için:

```bash
cd client
npm run build:win
```

**Not:** Bu komut macOS üzerinde çalıştırılırsa, `wine` kurulu olmalıdır veya sadece NSIS installer oluşturmaya çalışır. En sağlıklı sonuç için Windows makinede çalıştırılması önerilir.

---

## Özellikler

### Otomatik Masa Atama Sistemi

Sisteme bağlanan her bilgisayarın UUID bilgisi alınır ve veritabanına kaydedilir.
- İlk kez bağlanan bilgisayara otomatik olarak sıradaki masa numarası atanır (Örn: "Masa 1", "Masa 2").
- Bilgisayar tekrar bağlandığında, veritabanından UUID kontrol edilir ve aynı masa numarası korunur.
- Veritabanı: MongoDB (`ClientMachine` koleksiyonu).

### Sistem Gereksinimleri
- Node.js 18+
- MongoDB (Backend için)
