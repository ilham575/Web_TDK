# วิธีเร็วสุด: เพิ่ม Owner บน GCP ด้วย Cloud Shell

## ขั้นตอน (ทำได้ใน 2 นาที):

### 1. เปิด Cloud Shell
- เข้า https://console.cloud.google.com/
- คลิกปุ่ม **>_** (Cloud Shell) ที่มุมบนขวา

### 2. รันคำสั่งเหล่านี้:

```bash
# Clone repository
git clone https://github.com/ilham575/Tadika.git
cd Tadika/web_tdk_server

# ติดตั้ง dependencies
pip install -r requirements.txt

# เปิด Cloud SQL Proxy ในแท็บใหม่ (Ctrl+Shift+T)
# ในแท็บใหม่ รัน:
cloud-sql-proxy tdk-proj:asia-southeast1:web-tdk-db --port=3306

# ขณะ proxy ทำงาน ให้กลับไปแท็บแรก รัน:
python create_owner.py
```

### 3. ผลลัพธ์:
```
Owner user created successfully
Username: owner
Password: owner123
```

### 4. ล็อกอิน Frontend
- ไปที่ https://your-frontend-url
- Username: `owner`
- Password: `owner123`

### 5. เปลี่ยนรหัสผ่าน (สำคัญ!)
- ไปที่ Profile → Change Password
- เปลี่ยนเป็นรหัสผ่านใหม่ที่ปลอดภัย

---

## หากต้องการใช้ Cloud Build (วิธีอัตโนมัติ):

ถ้า Cloud Build submission ล้มเหลว ให้ใช้วิธีอื่น:

### วิธี A: ใช้ Dockerfile.init โดยตรง
```bash
# สร้าง container image
docker build -f Dockerfile.init -t web-tdk-init .

# รันในเครื่อง
docker run --env DATABASE_URL="..." web-tdk-init
```

### วิธี B: เพิ่ม endpoint ใน main.py
แก้ไข `main.py` เพิ่มบรรทัด:

```python
@app.post("/admin/init-owner")
async def init_owner_endpoint(secret: str):
    """Initialize owner account"""
    if secret != "your-secret-key-here":
        raise HTTPException(status_code=403)
    
    from models.user import User
    from utils.security import hash_password
    
    db = SessionLocal()
    existing = db.query(User).filter(User.username == "owner").first()
    if existing:
        return {"message": "Owner already exists"}
    
    owner = User(
        username="owner",
        email="owner@example.com",
        full_name="System Owner",
        hashed_password=hash_password("owner123"),
        role="owner"
    )
    db.add(owner)
    db.commit()
    return {"message": "Owner created successfully"}
```

จากนั้น:
```bash
curl -X POST "https://your-cloud-run-url/admin/init-owner?secret=your-secret-key-here"
```

---

## ✅ ตรวจสอบว่า Owner ถูกสร้างสำเร็จ:

ใน Cloud Shell:
```bash
# ติดตั้ง MySQL client
sudo apt-get update && sudo apt-get install -y mysql-client

# เชื่อมต่อ Cloud SQL
cloud-sql-proxy tdk-proj:asia-southeast1:web-tdk-db --port=3306 &

# ตรวจสอบ
mysql -h 127.0.0.1 -u admin_tdk -pIhsan53295 tadika_db -e "SELECT id, username, role FROM users WHERE role='owner';"
```

ถ้าเห็น owner row แสดงว่าสำเร็จ!

---

## 🆘 หากยังมีปัญหา:

### ปัญหา 1: cloud-sql-proxy: command not found
```bash
gcloud components install cloud-sql-proxy
# หรือใช้วิธี Cloud Shell native tools
```

### ปัญหา 2: Permission denied
ตรวจสอบ:
```bash
gcloud auth list
gcloud config list project
```

### ปัญหา 3: Connection refused
```bash
# ให้ Cloud SQL Proxy ทำงานนานขึ้นไป
# รันในแท็บต่างหากแล้วรอ 5-10 วินาที
```

---

## ✨ เสร็จแล้ว!

ตอนนี้ owner user พร้อมใช้งาน สามารถ:
- ล็อกอินด้วย owner account
- อนุมัติคำขอสร้างแอดมิน
- จัดการโรงเรียนและผู้ใช้ทั่วระบบ
