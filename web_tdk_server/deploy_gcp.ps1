# สคริปต์สำหรับ Deploy ไปยัง Google Cloud Run
$PROJECT_ID = "tdk-proj-487218" # เปลี่ยนเป็น Project ID ของคุน
$SERVICE_NAME = "tdk-api-server"
$REGION = "asia-southeast1"

# แนะนำให้ตั้งค่า DATABASE_URL เป็น environment variable ใน Cloud Console
# หรือรันคำสั่งด้านล่างเพื่อเซ็ต (ระวังเรื่องเครื่องหมายอัญประกาศ)
# $DB_URL = "mysql+pymysql://USER:PASSWORD@/DB_NAME?unix_socket=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME"

Write-Host "--- เริ่มกระบวนการ Deploy ไปยัง Cloud Run ---" -ForegroundColor Cyan

gcloud run deploy $SERVICE_NAME `
  --source . `
  --project $PROJECT_ID `
  --region $REGION `
  --allow-unauthenticated `
  --memory 512Mi `
  --cpu 1

Write-Host "--- Deploy เสร็จสิ้น! ---" -ForegroundColor Green
Write-Host "อย่าลืมเข้าไปตั้งค่า Environment Variables และ Cloud SQL Connection ใน Cloud Console" -ForegroundColor Yellow
