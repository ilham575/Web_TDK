# คู่มือ Deploy (GCP Cloud Run + Cloud SQL + Firebase Hosting)

## สถาปัตยกรรม

```
[React Client]                [FastAPI Server]            [MySQL Database]
Firebase Hosting    ──────►   GCP Cloud Run    ──────►   GCP Cloud SQL
(ฟรี / ราคาถูก)              (~$0 ไม่มีคน      (~$7/เดือน db-f1-micro)
                               ใช้ scale to 0)
```

### ทำไมถึงเลือก Service เหล่านี้

| Service | เหตุผล | ราคาโดยประมาณ |
|---------|--------|----------------|
| **Cloud Run** | Serverless container, scale to zero คิดเงินเฉพาะตอนมีคน request | ~$0–5/เดือน (traffic ปกติ) |
| **Cloud SQL db-f1-micro** | MySQL ราคาถูกที่สุดใน Cloud SQL, shared vCPU, 614MB RAM | ~$7/เดือน |
| **Firebase Hosting** | CDN ฟรี 10GB storage + 360MB/วัน, เร็วทั่วโลก | ฟรี (Spark plan) |

---

## ข้อกำหนดเบื้องต้น

- [gcloud CLI](https://cloud.google.com/sdk/docs/install) ติดตั้งแล้ว
- [Node.js + npm](https://nodejs.org/) ติดตั้งแล้ว
- [Firebase CLI](https://firebase.google.com/docs/cli): `npm install -g firebase-tools`
- มีสิทธิ์ Owner หรือ Editor ใน GCP project `tdk-proj-487218`

---

## ขั้นตอนการ Deploy

### 1. Login และตั้งค่า GCP

```powershell
# Login gcloud
gcloud auth login

# ตั้ง project
gcloud config set project tdk-proj-487218
```

### 2. Setup ครั้งแรก (รันครั้งเดียว)

สร้าง Cloud SQL + Secret Manager:

```powershell
cd e:\web\web_tdk_server
.\setup_gcp.ps1
```

Script นี้จะ:
- สร้าง Cloud SQL MySQL 8.0 (`db-f1-micro`, Singapore)
- สร้าง database และ user
- บันทึก password และ JWT secret ใน Secret Manager
- ตั้งค่า IAM ให้ Cloud Run เข้าถึง Cloud SQL และ secrets ได้

> **หมายเหตุ**: Cloud SQL ใช้เวลาสร้างประมาณ 5–10 นาที

### 3. Deploy Server (Cloud Run)

```powershell
cd e:\web\web_tdk_server
.\deploy_server.ps1
```

Script นี้จะ:
1. Build Docker image ผ่าน Cloud Build
2. Push image ไปยัง Container Registry
3. Deploy ไปยัง Cloud Run (Singapore, min=0, max=3, 512Mi)
4. แสดง URL ของ server ที่ได้

### 4. อัปเดต API URL ใน Client

หลัง deploy server แล้วจะได้ URL เช่น:
`https://web-tdk-server-xxxxxxxxxx-as.a.run.app`

แก้ไขไฟล์ `e:\web\web_tdk_client\.env.production`:

```
REACT_APP_API_BASE_URL=https://web-tdk-server-xxxxxxxxxx-as.a.run.app
```

### 5. Deploy Client (Firebase Hosting)

```powershell
# Login Firebase
firebase login

cd e:\web\web_tdk_client

# Deploy (พร้อมระบุ API URL ใหม่ในคำสั่งเดียว)
.\deploy_client.ps1 -ApiUrl "https://web-tdk-server-xxxxxxxxxx-as.a.run.app"

# หรือถ้าอัปเดต .env.production เองแล้ว
.\deploy_client.ps1
```

Script นี้จะ:
1. อัปเดต `.env.production` (ถ้าระบุ `-ApiUrl`)
2. Build React app (`npm run build`)
3. Deploy ไปยัง Firebase Hosting

**Client URL**: https://tdk-proj-487218.web.app

---

## Deploy ครั้งต่อไป (แค่อัปเดตโค้ด)

### อัปเดต Server เท่านั้น

```powershell
cd e:\web\web_tdk_server
.\deploy_server.ps1
```

### อัปเดต Client เท่านั้น

```powershell
cd e:\web\web_tdk_client
.\deploy_client.ps1
```

---

## สรุปค่าใช้จ่ายโดยประมาณ

| รายการ | ราคา/เดือน |
|--------|------------|
| Firebase Hosting (Spark) | ฟรี |
| Cloud Run (traffic ปกติ) | ~$0–3 |
| Cloud SQL db-f1-micro | ~$7 |
| Cloud Build (120 นาทีฟรี/วัน) | ฟรี |
| **รวม** | **~$7–10/เดือน** |

> **ถ้าต้องการประสิทธิภาพดีขึ้น**: เปลี่ยน Cloud SQL เป็น `db-g1-small` (~$25/เดือน)
> ซึ่งมี RAM มากขึ้น (1.7GB) และ dedicated CPU

---

## Troubleshooting

### Cloud Run ไม่สามารถเชื่อมต่อ Cloud SQL

ตรวจสอบว่า Cloud Run Service Account มีสิทธิ์ `Cloud SQL Client`:

```powershell
$PROJECT_NUMBER = gcloud projects describe tdk-proj-487218 --format="value(projectNumber)"
gcloud projects add-iam-policy-binding tdk-proj-487218 `
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" `
    --role="roles/cloudsql.client"
```

### ดู logs ของ Cloud Run

```powershell
gcloud run services logs read web-tdk-server --region=asia-southeast1 --limit=50
```

### ตรวจสอบ Cloud SQL instance

```powershell
gcloud sql instances describe web-tdk-db
```
