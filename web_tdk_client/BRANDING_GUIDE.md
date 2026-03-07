# การตั้งค่า Logo และ Install Prompt

## 📄 ไฟล์ที่ได้รับการแก้ไข

### 1. **App Name & Branding**
- `public/manifest.json` - อัปเดตชื่อแอป (จาก "React App" → "TDK School")
- `public/index.html` - อัปเดต title, description, meta tags
- `package.json` - ชื่อแพ็คเกจ (ไม่จำเป็นต้องเปลี่ยน)

### 2. **Install Prompt**
- `src/components/js/InstallPrompt.js` - Component ใหม่สำหรับข้อความติดตั้งแอป
- `src/components/css/InstallPrompt.css` - Styling สำหรับ install prompt
- `src/App.js` - เพิ่ม InstallPrompt component ลงใน render

---

## 🎨 การปรับแต่งเพิ่มเติม

### เปลี่ยนชื่อแอป
แก้ไข `public/manifest.json`:
```json
{
  "short_name": "ชื่อแอปสั้น",
  "name": "ชื่อแอปแบบเต็ม"
}
```

### เปลี่ยนสี Theme
แก้ไข `public/manifest.json`:
```json
{
  "theme_color": "#1976d2",        // สีบาร์
  "background_color": "#ffffff"    // สีพื้นหลัง
}
```

### เปลี่ยนข้อความ Install Prompt
แก้ไข `src/components/js/InstallPrompt.js` บรรทัด 45-46:
```javascript
<h3>ติดตั้ง TDK School</h3>
<p>ติดตั้งแอปพลิเคชัน TDK School เพื่อเข้าถึงได้อย่างรวดเร็ว...</p>
```

### เปลี่ยนไอคอนแอป
ใส่ไฟล์รูป PNG ใน `public/`:
- `logo192.png` - 192x192 pixels
- `logo512.png` - 512x512 pixels

กำหนดใน `public/manifest.json`:
```json
{
  "icons": [
    {
      "src": "logo192.png",
      "type": "image/png",
      "sizes": "192x192"
    },
    {
      "src": "logo512.png",
      "type": "image/png",
      "sizes": "512x512"
    }
  ]
}
```

---

## 📱 Install Prompt - วิธีการทำงาน

### ว่าเมื่อไร Install Prompt ปรากฏ?
1. **บน Android/Desktop** - เมื่อครั้งแรกที่เข้าเว็บ (ถ้าใช้ HTTPS)
2. **บน iPhone/iPad** - ปกติ iOS ไม่รองรับ beforeinstallprompt (ต้องเลือก "Share" > "Add to Home Screen")

### Features:
- ✓ ติดตั้งแอปแบบ PWA (Progressive Web App)
- ✓ เข้าถึงจากหน้าจอหลัก
- ✓ ใช้งานแบบเต็มจอ
- ✓ ทำงานแบบ offline (ถ้าตั้งค่า service worker)

---

## 🚀 Deploy Update

```powershell
cd e:\web\web_tdk_client
npm run build
firebase deploy
```

หรือใช้ script:
```powershell
.\deploy_client_final.ps1
```

---

## ✅ Checklist

- [ ] แก้ไข `manifest.json` - ชื่อแอป
- [ ] แก้ไข `index.html` - title, description
- [ ] เพิ่มไอคอน (logo192.png, logo512.png)
- [ ] ปรับแต่ง InstallPrompt.js - ข้อความภาษาไทย
- [ ] Test บน Android/Chrome
- [ ] Deploy ไป Firebase Hosting
- [ ] Test install prompt

---

## 📝 หมายเหตุ

- Install Prompt จะปรากฏโดยอัตโนมัติบน Android
- บน Desktop/Chrome จะมีปุ่มติดตั้งอยู่ที่ address bar
- PWA ต้องใช้ HTTPS เท่านั้น
- ต้อง `manifest.json` ที่ถูกต้องและมีไอคอนครบ
