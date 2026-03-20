# สรุป API Routes สำหรับ Student Transcripts, Grades, Subject Scores

## 📍 ตำแหน่ง Files
- **หลัก**: `web_tdk_server/routers/grades.py`, `subject.py`
- **Models**: `models/grade.py`, `models/subject.py`, `models/subject_student.py`
- **Schemas**: `schemas/grade.py`

---

## ✅ ตอบคำถามของคุณ

### 1️⃣ Endpoint ที่ใช้ดึงข้อมูลวิชา/คะแนนของนักเรียนแต่ละคน

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/grades/student/{student_id}/transcript` | GET | **หลัก** - ได้ข้อมูลคะแนนของข้อมูลทั้งหมด |
| `/subjects/student/{student_id}` | GET | ดึงรายวิชาทั้งหมด (enrollment list) |
| `/grades` | GET | ดึงคะแนนแต่ละอัน (detail) |
| `/grades/student/{student_id}/activity-breakdown` | GET | เฉพาะคะแนนกิจกรรม (activity) |

---

### 2️⃣ ตัวอย่าง Endpoint Patterns

**✓ YES - ใช้ 3 แบบนี้:**

```
GET /grades/student/42/transcript
GET /grades/student/42/transcript?academic_year=2569&semester=1
GET /grades/student/42/semester-list
```

**✗ NO - ไม่มี /transcripts/{id}/... แบบนี้**

นอกจากนี้ยังมี:
```
GET /subjects/student/42
GET /grades/classroom/10/ranking  (ranking หลายคนพร้อมกัน)
```

---

### 3️⃣ Parameters ที่ต้องส่ง

#### **Transcript Query Parameters:**
```
?academic_year=2569   (Support short year "69" = "2569")
?semester=1           (1 or 2)
?classroom_id=10      (optional, filter to specific class)
```

#### **Subject Query Parameters:**
```
?academic_year=2569   (optional)
?semester=1           (optional)
```

#### **Complete Example:**
```bash
GET /grades/student/42/transcript?academic_year=2569&semester=1&classroom_id=10
```

---

### 4️⃣ Response Structure - Fields ที่ได้กลับมา

#### **Transcript Response (Array of Subjects):**
```json
[
  {
    "subject_id": 123,
    "subject_name": "วิชาคณิตศาสตร์",         ✓ Match Frontend
    "subject_type": "regular",               ✓ "main" or "activity"
    "academic_year": "2569",                 ✓
    "semester": 1,                           ✓
    "credits": 3,                            ✓
    "score": 85.5,                           ✓ Collected + Exam
    "max_score": 200,                        ✓
    "normalized_score": 85.5,                ✓ 0-100 scale
    "teachers": [                            ✓ Array
      {
        "id": 1,
        "teacher_id": 5,
        "teacher_name": "นายจากร",
        "is_ended": false
      }
    ]
  },
  {
    "subject_id": null,
    "subject_name": "กิจกรรม (Activity)",
    "subject_type": "activity",
    "credits": 0,
    "score": 81.0,                           ✓ Weighted activity score
    "max_score": 100.0,
    "breakdown": [
      {
        "subject_id": 50,
        "subject_name": "สุขศึกษา",
        "raw_score": 95,
        "max_score": 100,
        "normalized_score": 95,
        "percentage": 30,                    ✓ Activity percentage
        "contribution": 28.5,
        "grade_count": 4,
        "academic_year": "2569",
        "semester": 1
      }
    ],
    "total_percent": 100
  }
]
```

---

### 5️⃣ ตัวอย่าง Response Fields ตรงกับ Frontend ไหม?

| Field | Present? | Value Example | Notes |
|-------|----------|---------------|-------|
| `subject_name` | ✓ | "คณิตศาสตร์" | Yes |
| `score` | ✓ | 85.5 | Calculated field |
| `subject_type` | ✓ | "regular" \| "activity" | Yes |
| `max_score` | ✓ | 200 | Configurable per subject |
| `normalized_score` | ✓ | 85.5 | Always 0-100 scale |
| `academic_year` | ✓ | "2569" | Yes |
| `semester` | ✓ | 1 | Yes |
| `credits` | ✓ | 3 | Yes |
| `teachers` | ✓ | Array of objects | Full list |
| `activity_percentage` | ✓ | 30 | For activity subjects |
| `teacher_name` | ✓ | In teachers[] | Yes |

---

## 📊 ตัวอย่าง Request-Response จริง

### Query 1: Get Student Transcript
```bash
GET /grades/student/42/transcript?academic_year=2569&semester=1
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
[
  {
    "subject_id": 1,
    "subject_name": "ภาษาไทย",
    "subject_type": "regular",
    "credits": 3,
    "score": 75.5,
    "max_score": 200,
    "normalized_score": 37.75,
    "teachers": [{...}],
    "academic_year": "2569",
    "semester": 1
  },
  {
    "subject_id": 2,
    "subject_name": "คณิตศาสตร์",
    "subject_type": "regular",
    "credits": 4,
    "score": 150,
    "max_score": 200,
    "normalized_score": 75,
    "teachers": [{...}],
    "academic_year": "2569",
    "semester": 1
  },
  {
    "subject_id": null,
    "subject_name": "กิจกรรม (Activity)",
    "subject_type": "activity",
    "score": 85.0,
    "max_score": 100,
    "breakdown": [
      {
        "subject_id": 50,
        "subject_name": "สุขศึกษา",
        "percentage": 50,
        "normalized_score": 90,
        "contribution": 45
      }
    ],
    "total_percent": 50
  }
]
```

### Query 2: Get Subject Enrollment
```bash
GET /subjects/student/42?academic_year=2569&semester=1
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "ภาษาไทย",
    "code": "THAI101",
    "subject_type": "main",
    "teacher_id": 5,
    "credits": 3,
    "max_collected_score": 100,    ← ใช้สำหรับ scaling
    "max_exam_score": 100,         ← ใช้สำหรับ scaling
    "activity_percentage": null,
    "is_ended": false,
    "teachers": [
      {
        "schedule_id": 1,
        "teacher_id": 5,
        "teacher_name": "นายจากร",
        "classroom_id": 10,
        "classroom_name": "6/1",
        "is_ended": false
      }
    ]
  }
]
```

### Query 3: Get Individual Grades (for Teacher)
```bash
GET /grades?subject_id=1&classroom_id=10
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": 1001,
    "subject_id": 1,
    "student_id": 42,
    "classroom_id": 10,
    "title": "แบบฝึกหัด 1",          ← Assignment name
    "max_score": 20,
    "grade": 18.5,
    "student_number": "001"
  },
  {
    "id": 1002,
    "subject_id": 1,
    "student_id": 42,
    "classroom_id": 10,
    "title": "ปลายภาค",             ← Exam
    "max_score": 50,
    "grade": 45,
    "student_number": "001"
  }
]
```

---

## 🔐 Authorization

| Role | Can Access | Restrictions |
|------|-----------|--------------|
| **Student** | Own transcript only | Subject to `grade_announcement_date` |
| **Teacher** | All students | Some endpoints restricted |
| **Admin** | All students | Full access |

---

## 🧮 Score Calculation (ตรวจสอบกับ Frontend)

### Step 1: Collect Score (เก็บ)
```
Sum all non-exam assignments:
- แบบฝึกหัด 1: 18/20
- แบบฝึกหัด 2: 19/20
- งาน: 45/50
- Total: 82/90

Normalize to max_collected_score:
collected_score = (82/90) * 100 = 91.11
```

### Step 2: Exam Score (สอบ)
```
Sum all exam assignments (with "กลางภาค", "ปลายภาค", "final" in title):
- Final Exam: 45/50

Normalize to max_exam_score:
exam_score = (45/50) * 100 = 90.00
```

### Step 3: Total
```
total_score = 91.11 + 90.00 = 181.11
max_score = 100 + 100 = 200
normalized_score = (181.11 / 200) * 100 = 90.56
```

### ✓ Response ตรง:
```json
{
  "score": 181.11,
  "max_score": 200,
  "normalized_score": 90.56
}
```

---

## 🎯 สรุป API Endpoints ทั้งหมด

### 📥 **GET Endpoints (Read-Only)**
1. `GET /grades/student/{id}/transcript` - **หลัก**
2. `GET /subjects/student/{id}` 
3. `GET /grades` (filter by subject/classroom)
4. `GET /grades/student/{id}/semester-list`
5. `GET /grades/student/{id}/activity-breakdown`
6. `GET /grades/assignments/{subject_id}`
7. `GET /grades/classroom/{id}/ranking`
8. `GET /grades/school/{id}/ranking`

### ✏️ **POST Endpoints (Write)**
1. `POST /grades/bulk` - Upload multiple grades
2. `POST /grades/assignments/{subject_id}` - Create assignment

### ✏️ **PUT/PATCH Endpoints (Update)**
1. `PUT /grades/assignments/{subject_id}/{title}` - Update assignment

### ❌ **DELETE Endpoints**
1. `DELETE /grades/assignments/{subject_id}/{title}` - Delete assignment

---

## 📝 Key Implementation Points

1. **Year/Semester Selection**: Use `/grades/student/{id}/semester-list` to populate dropdown
2. **Transcript Display**: Use `/grades/student/{id}/transcript?academic_year=X&semester=Y`
3. **Subject Details**: Use `/subjects/student/{id}` for credit/teacher info
4. **Individual Grades**: Use `/grades?subject_id=X` for assignment breakdown (teacher view)
5. **Score Scaling**: Already calculated by backend - just use `normalized_score`
6. **Activity Scores**: Automatically aggregated in `breakdown` array

---

**ไฟล์ละเอียด:** [API_ENDPOINTS_STUDENT_GRADES.md](API_ENDPOINTS_STUDENT_GRADES.md)  
**Quick Reference:** [STUDENT_GRADES_API_QUICK_REFERENCE.md](STUDENT_GRADES_API_QUICK_REFERENCE.md)
