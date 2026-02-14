# คู่มือการ Deploy FastAPI Server บน GCP (Cloud Run) และ Cloud SQL

## 1. การตั้งค่า Cloud SQL (เน้นประหยัดที่สุด)

1. เข้าไปที่ [Google Cloud Console - SQL](https://console.cloud.google.com/sql/instances).
2. คลิก **Create Instance** เลือก **MySQL** (เนื่องจากโปรเจกต์ใช้ `pymysql`).
3. การตั้งค่าเพื่อความประหยัด:
   - **Edition**: Enterprise (ถูกที่สุด).
   - **Preset**: Development (Four cores, 16 GB RAM เริ่มต้น) -> **แต่ให้เปลี่ยนเป็น Custom**.
   - **Machine Configuration**:
     - **Shared Core**: เลือก `db-f1-micro` (ราคาประมาณ $10/เดือน) **ถูกที่สุด**.
   - **Storage**:
     - เลือก **HDD** (ถูกกว่า SSD มาก).
     - ความจุขั้นต่ำ **10 GB**.
     - ปิด "Enable automatic storage increases".
   - **Connections**: 
     - เปิด **Public IP**.
     - ในภายหลังให้เพิ่ม **Cloud Run service** เข้าในส่วนของ Authorized Networks หรือใช้ **Cloud SQL Auth Proxy** (Cloud Run ทำให้อัตโนมัติ).
4. ตั้งชื่อ Instance, Database และรหัสผ่าน Root ให้เรียบร้อย.

## 2. การ Deploy ไปยัง Cloud Run (ผ่าน Firebase Project)

คุณสามารถนำ Cloud Run ไปผูกกับ Firebase Project ได้ เพื่อให้เรียกใช้ผ่าน URL ของ Firebase หรือใช้ร่วมกับ Firebase Auth.

### ขั้นตอนการ Deploy:

ใช้คำสั่ง `gcloud` ในการ deploy (ให้รันในโฟลเดอร์ `web_tdk_server`):

```powershell
# 1. Build และ Push image ขึ้น Artifact Registry (จะถูกสร้างให้อัตโนมัติ)
gcloud run deploy tdk-api-server `
  --source . `
  --region asia-southeast1 `
  --allow-unauthenticated `
  --set-env-vars "DATABASE_URL=mysql+pymysql://USER:PASSWORD@/DB_NAME?unix_socket=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME" `
  --add-cloudsql-instances PROJECT_ID:REGION:INSTANCE_NAME
```

*หมายเหตุ: เปลี่ยนค่า `USER`, `PASSWORD`, `DB_NAME`, `PROJECT_ID`, `REGION`, `INSTANCE_NAME` เป็นค่าจริงของคุณ.*

## 3. การจัดการเรื่อง Firebase

หากต้องการให้นามแฝง URL เป็น Firebase (เช่น `api.yourproject.web.app`):
1. ไปที่ Firebase Console -> Hosting.
2. เลือก **Add Custom Domain** หรือใช้ subdomain ที่มีอยู่.
3. แก้ไขไฟล์ `firebase.json` เพื่อทำ **Rewrites** ไปยัง Cloud Run:

```json
{
  "hosting": {
    "public": "public",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "/api/**",
        "run": {
          "serviceId": "tdk-api-server",
          "region": "asia-southeast1"
        }
      }
    ]
  }
}
```

## 4. สรุปค่าใช้จ่าย (โดยประมาณ)
- **Cloud Run**: มี Free Tier เยอะมาก (2 ล้าน request/เดือน) ถ้าใช้งานน้อยแทบจะไม่เสียเงินเลย.
- **Cloud SQL**: `db-f1-micro` + HDD 10GB ราคาประมาณ $10 - $12 ต่อเดือน.
- **Artifact Registry**: ฟรีสำหรับพื้นที่ใช้งานน้อย.

---
**คำแนะนำเพิ่มเติม**: หากใช้งานน้อยมากจริงๆ และต้องการประหยัดกว่านี้ อาจพิจารณาใช้ **Firebase Cloud Functions (Python)** แทน Cloud Run แต่ Cloud Run จะจัดการง่ายกว่าสำหรับ FastAPI ที่มีหลาย Route.
