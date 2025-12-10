# คำแนะนำการ Deploy Web TDK Server ขึ้น Google Cloud Platform (ตั้งแต่เริ่มต้น)

## สิ่งที่ต้องเตรียม
- บัญชี Google Cloud Platform (GCP)
- ชื่อ Project ที่สร้างไว้แล้วใน GCP Console
- เครื่องคอมพิวเตอร์ที่ติดตั้ง Docker และ Git

## ขั้นตอนการ Deploy

### ขั้นตอนที่ 1: ติดตั้งและตั้งค่า Google Cloud SDK (gcloud CLI)

1. ดาวน์โหลดและติดตั้ง Google Cloud SDK จาก: https://cloud.google.com/sdk/docs/install
2. เปิด Command Prompt หรือ Terminal และรันคำสั่ง:
   ```bash
   gcloud init
   ```
3. เลือก "Log in with a new account" และเข้าสู่ระบบด้วยบัญชี Google ของคุณ
4. เลือก Project ที่มีอยู่แล้ว หรือสร้างใหม่ถ้ายังไม่มี

### ขั้นตอนที่ 2: ตั้งค่า Project และเปิดใช้งาน APIs

1. ตั้งค่า Project ID (แทนที่ `YOUR_PROJECT_ID` ด้วยชื่อ project จริงของคุณ):
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```

2. เปิดใช้งาน APIs ที่จำเป็น:
   ```bash
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable run.googleapis.com
   gcloud services enable sqladmin.googleapis.com
   gcloud services enable containerregistry.googleapis.com
   ```

### ขั้นตอนที่ 3: สร้าง Cloud SQL MySQL Instance

1. สร้าง Cloud SQL instance:
   ```bash
   gcloud sql instances create web-tdk-db \
     --database-version=MYSQL_8_0 \
     --region=asia-southeast1 \
     --tier=db-f1-micro \
     --storage-type=HDD \
     --storage-size=10GB
   ```

2. ตั้งรหัสผ่านสำหรับ root user:
   ```bash
   gcloud sql users set-password root \
     --instance=web-tdk-db \
     --password=YOUR_DB_PASSWORD
   ```
   (แทนที่ `YOUR_DB_PASSWORD` ด้วยรหัสผ่านที่ปลอดภัย)

3. สร้างฐานข้อมูล:
   ```bash
   gcloud sql databases create tadika_db \
     --instance=web-tdk-db
   ```

### ขั้นตอนที่ 4: ปรับแต่งไฟล์การตั้งค่า

1. แก้ไขไฟล์ `cloudbuild.yaml` ในโฟลเดอร์ `web_tdk_server`:
   - แทนที่ `_CLOUDSQL_INSTANCE` ด้วย: `YOUR_PROJECT_ID:asia-southeast1:web-tdk-db`
   - แทนที่ `_DB_PASSWORD` ด้วยรหัสผ่านที่ตั้งไว้
   - แทนที่ `_JWT_SECRET_KEY` ด้วย key ที่สร้างเอง (ใช้คำสั่ง `openssl rand -base64 32`)
   - แทนที่ `_CORS_ORIGINS` ด้วย URL ของ frontend (เช่น `https://your-frontend-domain.com`)

   ตัวอย่าง:
   ```yaml
   substitutions:
     _REGION: 'asia-southeast1'
     _MEMORY: '1Gi'
     _CPU: '1'
     _MAX_INSTANCES: '10'
     _CLOUDSQL_INSTANCE: 'my-project-123:asia-southeast1:web-tdk-db'
     _DB_PASSWORD: 'mySecurePassword123'
     _JWT_SECRET_KEY: 'generated-jwt-secret-key-here'
     _CORS_ORIGINS: 'https://my-frontend.com'
   ```

### ขั้นตอนที่ 5: Deploy แอปพลิเคชัน

1. ไปยังโฟลเดอร์โปรเจกต์:
   ```bash
   cd e:\web
   ```

2. Commit และ push โค้ดขึ้น Git (ถ้ายังไม่ได้ทำ):
   ```bash
   git add .
   git commit -m "Add GCP deployment files"
   git push origin develop
   ```

3. Deploy ด้วย Cloud Build:
   ```bash
   cd web_tdk_server
   gcloud builds submit --config cloudbuild.yaml
   ```

   หรือถ้าต้องการ deploy จาก Git repository:
   ```bash
   gcloud builds submit --config cloudbuild.yaml --substitutions _CLOUDSQL_INSTANCE="YOUR_PROJECT_ID:asia-southeast1:web-tdk-db",_DB_PASSWORD="YOUR_PASSWORD",_JWT_SECRET_KEY="YOUR_JWT_KEY",_CORS_ORIGINS="YOUR_FRONTEND_URL"
   ```

### ขั้นตอนที่ 6: ตรวจสอบการ Deploy

1. ตรวจสอบสถานะ Cloud Run service:
   ```bash
   gcloud run services list
   ```

2. ดู logs ถ้ามีปัญหา:
   ```bash
   gcloud run services logs read web-tdk-server
   ```

3. ทดสอบ API โดยใช้ URL ที่ได้จากคำสั่ง list

## การปรับแต่งเพิ่มเติม

### เพิ่ม Firewall Rules สำหรับ Cloud SQL (ถ้าจำเป็น)
```bash
gcloud sql instances patch web-tdk-db \
  --authorized-networks=0.0.0.0/0
```

### อัปเดต Environment Variables หลัง Deploy
```bash
gcloud run services update web-tdk-server \
  --set-env-vars JWT_SECRET_KEY="new-secret-key"
```

### เปิดใช้งาน HTTPS เท่านั้น
ถ้าต้องการปิด public access และใช้ authentication:
```bash
gcloud run services update web-tdk-server \
  --no-allow-unauthenticated
```

## การแก้ปัญหา

### ปัญหา: Cloud SQL Connection Failed
- ตรวจสอบว่า Cloud SQL instance เปิดอยู่
- ตรวจสอบรหัสผ่านและ connection string ใน cloudbuild.yaml
- ตรวจสอบว่า service account ของ Cloud Run มีสิทธิ์เข้าถึง Cloud SQL

### ปัญหา: Build Failed
- ตรวจสอบ Dockerfile และ requirements.txt
- ตรวจสอบว่า APIs เปิดใช้งานแล้ว
- ดู logs จาก Cloud Build Console

### ปัญหา: Application Error
- ตรวจสอบ logs จาก Cloud Run
- ตรวจสอบ environment variables
- ทดสอบ locally ก่อน deploy

## ค่าใช้จ่ายโดยประมาณ
- Cloud Run: ~$0.09/GB-hour + CPU time
- Cloud SQL (f1-micro): ~$10/เดือน
- Cloud Build: ฟรีสำหรับ builds แรก 120 นาที/เดือน

สำหรับข้อมูลเพิ่มเติม: https://cloud.google.com/run/docs