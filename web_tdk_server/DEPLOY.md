# Quick Deploy Guide

## วิธีการ Deploy Update

### ขั้นตอนที่ 1: เข้า Folder Server
```powershell
cd e:\web\web_tdk_server
```

### ขั้นตอนที่ 2: รัน Deploy Script
```powershell
.\deploy.ps1
```

นั่นแหละ! Script จะทำ 3 สิ่ง อัตโนมัติ:
1. ✓ Build Docker image
2. ✓ Push ไป Google Container Registry
3. ✓ Deploy ไป Cloud Run

### ระยะเวลา
ใช้เวลาประมาณ **2-3 นาที** ขึ้นอยู่กับขนาด code changes

### Service URL
```
https://web-tdk-server-449550769588.asia-southeast1.run.app
```

---

## โปรแกรมส่วนที่ Deploy ได้
- ✅ API endpoints ใน `/routers/` 
- ✅ Auto-generation logic สำหรับ bulk upload
- ✅ Database connection
- ✅ การ handle non-ASCII names (Thai, Chinese, etc.)

## หลังจาก更新
ตรวจสอบว่า:
1. ไม่มี syntax error ในโค้ด
2. `requirements.txt` ถูกต้องถ้าเพิ่ม dependencies ใหม่
3. `env-prod.yaml` มีข้อมูลถูกต้อง (password, CORS URLs)

## ตัวอย่าง: ทีมโหลด Bulk Upload
```bash
POST https://web-tdk-server-449550769588.asia-southeast1.run.app/users/bulk_upload
Content-Type: multipart/form-data

[Excel file with columns: full_name, role]
```

Server จะ auto-generate: username, email, password
