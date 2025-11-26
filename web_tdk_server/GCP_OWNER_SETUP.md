# วิธีเพิ่ม Owner Role บน Google Cloud Platform

## วิธีที่ 1: ใช้ Cloud Shell (ง่ายและรวดเร็ว) ✅

### ขั้นตอน:
1. เข้า [Google Cloud Console](https://console.cloud.google.com)
2. เลือก Project: `tdk-proj`
3. คลิกปุ่ม **Cloud Shell** (ไอคอนเทอร์มินัล) ที่มุมบนขวา
4. รันคำสั่งต่อไปนี้:

```bash
# Clone repository
git clone https://github.com/ilham575/Tadika.git
cd Tadika/web_tdk_server

# ติดตั้ง Python dependencies
pip install -r requirements.txt

# เพิ่ม Cloud SQL client
sudo apt-get update && sudo apt-get install -y cloud-sql-proxy

# สตาร์ท Cloud SQL proxy ในพื้นหลัง (ทำในแท็บใหม่)
cloud-sql-proxy tdk-proj:asia-southeast1:web-tdk-db --port=3306 &

# รอสักครู่ แล้วรันสคริปต์
sleep 5
python create_owner.py
```

**ผลลัพธ์ที่คาดว่า:**
```
Owner user created successfully
Username: owner
Password: owner123
```

---

## วิธีที่ 2: ใช้ Cloud Run Jobs (อัตโนมัติ)

### ขั้นตอน:
1. ไปยังโฟลเดอร์ project บน local machine
2. รันคำสั่ง:

```bash
cd web_tdk_server
gcloud builds submit --config cloudbuild-init-owner.yaml
```

3. รอให้ Build เสร็จสิ้น
4. ตรวจสอบว่า Owner ถูกสร้าง:

```bash
# เข้า Cloud Shell แล้วรัน
gcloud run jobs list
gcloud run jobs logs read web-tdk-init-owner
```

---

## วิธีที่ 3: ใช้ SQL Client บน Cloud Console

### ขั้นตอน:
1. ไปที่ [Cloud SQL Instances](https://console.cloud.google.com/sql/instances)
2. คลิก `web-tdk-db`
3. เลือก Tab **DATABASES**
4. คลิก `tadika_db`
5. คลิก **CONNECT USING CLOUD SHELL**
6. รันคำสั่ง SQL:

```sql
-- ตรวจสอบว่า owner มีอยู่หรือไม่
SELECT * FROM users WHERE username = 'owner';

-- ถ้าไม่มี ให้ใช้ Python script
-- หรือเพิ่มด้วย SQL (ต้องรู้ hashed password ของ owner123)
```

---

## วิธีที่ 4: ใช้ Cloud Run Services (ทำให้ API endpoint)

สร้างไฟล์ `init_owner_endpoint.py`:

```python
from fastapi import FastAPI, HTTPException
from database.connection import SessionLocal
from models.user import User
from utils.security import hash_password

app = FastAPI()

@app.post("/admin/init-owner")
def init_owner(secret: str):
    """Initialize owner account - requires secret key"""
    # ตรวจสอบ secret key เพื่อความปลอดภัย
    if secret != "your-secret-init-key":
        raise HTTPException(status_code=403, detail="Invalid secret")
    
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == "owner").first()
        if existing:
            return {"message": "Owner already exists"}
        
        hashed = hash_password("owner123")
        owner = User(
            username="owner",
            email="owner@example.com",
            full_name="System Owner",
            hashed_password=hashed,
            role="owner"
        )
        db.add(owner)
        db.commit()
        return {
            "message": "Owner created successfully",
            "username": "owner",
            "password": "owner123"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()
```

จากนั้น Deploy และเรียก:
```bash
curl -X POST "https://YOUR_CLOUD_RUN_URL/admin/init-owner?secret=your-secret-init-key"
```

---

## ✅ หลังจากเพิ่ม Owner สำเร็จ

### ล็อกอินด้วย:
- **Username:** `owner`
- **Password:** `owner123`

### เปลี่ยนรหัสผ่านทันที (สำคัญ!):
1. ล็อกอินด้วยบัญชี owner
2. ไปที่ Profile → Change Password
3. เปลี่ยนเป็นรหัสผ่านที่ปลอดภัย

---

## 🔒 เพิ่มความปลอดภัย

### 1. เปลี่ยน default password
```bash
# ใน create_owner.py
hashed = hash_password("YOUR_STRONG_PASSWORD_HERE")
```

### 2. ลบไฟล์ initialization หลังจากใช้งานแล้ว
```bash
# ลบไฟล์ create_owner.py หลังจากใช้ (optional)
```

### 3. เพิ่ม authorization check
แก้ไข `create_owner.py` ให้ต้องใช้ secret key:

```python
import os
SECRET_KEY = os.getenv("INIT_SECRET_KEY", "default-secret")

def create_owner(secret=None):
    if secret != SECRET_KEY:
        print("Invalid secret key!")
        return
    # ... ส่วนที่เหลือ
```

---

## 🆘 Troubleshooting

### ปัญหา: Connection to Cloud SQL failed
```bash
# ใน Cloud Shell ลองทดสอบ connection
cloud-sql-proxy tdk-proj:asia-southeast1:web-tdk-db --port=3306
```

### ปัญหา: Module not found
```bash
pip install -r requirements.txt --upgrade
```

### ปัญหา: Permission denied
```bash
# ตรวจสอบ IAM roles ของ service account
gcloud projects get-iam-policy tdk-proj
```

---

## 📚 หมายเหตุ
- **เฉพาะครั้งแรก**: ทำการ initialize owner เพียงครั้งเดียวเท่านั้น
- **ความปลอดภัย**: ห้ามแชร์ default password - เปลี่ยนทันทีหลังล็อกอินสำเร็จ
- **Backup**: ตรวจสอบให้แน่ใจว่า Cloud SQL มีการ backup อยู่
