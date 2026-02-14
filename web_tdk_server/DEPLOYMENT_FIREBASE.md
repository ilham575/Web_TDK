# คู่มือการ Deploy FastAPI Server บน Firebase Functions (Python)

## 1. การเตรียมตัว
ระบบนี้ถูกเปลี่ยนจาก Cloud Run มาเป็น **Firebase Functions (2nd Gen)** ซึ่งประหยัดและรวมอยู่ใน Ecosystem ของ Firebase มากกว่า

1. ติดตั้ง Firebase CLI (หากยังไม่มี):
   ```bash
   npm install -g firebase-tools
   ```
2. Login และเลือกโปรเจกต์:
   ```bash
   firebase login
   firebase use tdk-proj-487218
   ```

## 2. การตั้งค่า Cloud SQL (ประหยัดที่สุด)
(เหมือนเดิมจากคู่มือ Cloud Run)
- ใช้ `db-f1-micro`
- ใช้ HDD 10GB
- เปิด Public IP แต่ใช้ Private Network/Cloud SQL Auth Proxy ในการเชื่อมต่อจริง

## 3. การ Deploy
เนื่องจากเราใช้สถาปัตยกรรมแบบ Firebase Functions (Python):

```bash
# สั่ง deploy ทั้ง functions และ hosting (rewrites)
firebase deploy --only functions,hosting
```

*หมายเหตุ: ในการรันครั้งแรก Firebase จะถามเรื่องการเปิดใช้งาน API ต่างๆ ให้ตอบ "Yes"*

## 4. การตั้งค่า Environment Variables
การตั้งค่า `DATABASE_URL` สำหรับ Firebase Functions:
1. ไปที่ Google Cloud Console -> Functions.
2. เลือกฟังก์ชัน `api_server`.
3. คลิก **Edit**.
4. ไปที่ส่วน **Runtime, build, connections and security settings**.
5. เพิ่ม Environment Variable:
   - `DATABASE_URL`: `mysql+pymysql://USER:PASSWORD@/DB_NAME?unix_socket=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME`
6. ในส่วน **Connections** ให้เพิ่ม Cloud SQL Instance ที่ต้องการเชื่อมต่อ.

## 5. ทำไมต้อง Firebase Functions?
- **Serverless**: ถ้าไม่มีคนใช้ ก็ไม่ต้องจ่ายเงินค่าประมวลผล.
- **Integration**: เชื่อมต่อกับ Firebase Hosting ได้ทันทีผ่านไฟล์ `firebase.json`.
- **Scaling**: ขยายตัวอัตโนมัติเมื่อมีการใช้งานมากขึ้น.

---
**ข้อควรระวัง**: 
- Firebase Functions for Python (2nd Gen) ณ ปัจจุบันรองรับ Python 3.10/3.11 เป็นหลัก หากใน `pyproject.toml` ตั้งไว้สูงกว่า อาจต้องปรับลดลงมาถ้า Firebase บ่นตอน deploy.
- ไฟล์ `main.py` ต้องมี `from firebase_functions import https_fn` และการ export `api_server`.
