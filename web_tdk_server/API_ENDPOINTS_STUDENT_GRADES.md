# Student Grades, Transcripts & Subject API Endpoints

**Location:** `web_tdk_server/routers/`  
**Files:** `grades.py`, `subject.py`, `evaluation.py`

---

## TABLE OF CONTENTS
1. [Transcript & Student Grades](#transcript--student-grades)
2. [Subject Enrollment](#subject-enrollment)
3. [Grade Management (Teacher/Admin)](#grade-management-teacheradmin)
4. [Classroom Rankings](#classroom-rankings)
5. [Key Response Fields](#key-response-fields)
6. [Score Calculation Logic](#score-calculation-logic)

---

## Transcript & Student Grades

### 1. GET `/grades/student/{student_id}/transcript`

**Purpose:** Get student's complete transcript with regular + activity subjects  
**File:** `grades.py` line 701

#### Parameters
| Parameter | Type | Location | Required | Notes |
|-----------|------|----------|----------|-------|
| `student_id` | int | path | ✓ | Student ID |
| `classroom_id` | int | query | ✗ | Filter to specific classroom grades |
| `academic_year` | string | query | ✗ | Supports short year like '69' or full '2569' |
| `semester` | int | query | ✗ | Semester 1 or 2 |

#### Response (Array of Subject Records)
```json
{
  "subject_id": 123,
  "subject_name": "วิชาคณิตศาสตร์",
  "subject_type": "regular",  // "regular" or "activity"
  "credits": 3,
  "score": 85.5,              // Collected + Exam
  "max_score": 200,           // max_collected + max_exam
  "normalized_score": 85.5,   // 0-100 scale: (score/max_score)*100
  "teachers": [
    {
      "id": 1,
      "teacher_id": 5,
      "teacher_name": "นายจากร",
      "is_ended": false
    }
  ],
  "academic_year": "2569",
  "semester": 1
}
```

**Activity Subject Response (when present):**
```json
{
  "subject_id": null,
  "subject_name": "กิจกรรม (Activity)",
  "subject_type": "activity",
  "credits": 0,
  "score": 85.0,              // Weighted activity score (0-100)
  "max_score": 100.0,
  "breakdown": [
    {
      "subject_id": 50,
      "subject_name": "สุขศึกษา",
      "raw_score": 95,
      "max_score": 100,
      "normalized_score": 95,
      "percentage": 30,       // Activity percentage
      "contribution": 28.5,   // (normalized * percentage) / 100
      "grade_count": 4,
      "academic_year": "2569",
      "semester": 1
    }
  ],
  "total_percent": 100        // Sum of all activity percentages
}
```

#### Authorization
- ✓ Student viewing own transcript
- ✓ Admin (any student)
- ✓ Teacher (any student)

#### Access Control
- **For Students/Teachers:** Only accessible if school allows view for the requested academic_year/semester
  - Check: `SchoolAccessControl.allow_student_view_grades`
  - Check: `SchoolAccessControl.allow_teacher_view_summary`

#### Example Request
```bash
GET /grades/student/42/transcript?academic_year=2569&semester=1
```

---

### 2. GET `/grades/student/{student_id}/activity-breakdown`

**Purpose:** Get detailed activity grades breakdown for a student  
**File:** `grades.py` line 519

#### Parameters
| Parameter | Type | Location | Required |
|-----------|------|----------|----------|
| `student_id` | int | path | ✓ |
| `classroom_id` | int | query | ✗ |

#### Response
```json
{
  "activity_subjects": [
    {
      "subject_id": 50,
      "subject_name": "สุขศึกษา",
      "raw_score": 95.0,
      "max_score": 100.0,
      "normalized_score": 95.0,
      "percentage": 30,           // Activity percentage weight
      "contribution": 28.5,       // Score contribution to total
      "grade_count": 4,           // Number of grades/assignments
      "academic_year": "2569",
      "semester": 1
    }
  ],
  "total_activity_score": 85.0,   // Weighted total (0-100, capped at 100)
  "total_activity_percent": 100   // Sum of percentages
}
```

#### Authorization
- ✓ Student (own)
- ✓ Admin
- ✓ Teacher

---

### 3. GET `/grades/student/{student_id}/semester-list`

**Purpose:** Get list of available semesters for a student  
**File:** `grades.py` line 769

#### Parameters
| Parameter | Type | Location | Required |
|-----------|------|----------|----------|
| `student_id` | int | path | ✓ |

#### Response
```json
[
  {"academic_year": "2568", "semester": 1},
  {"academic_year": "2568", "semester": 2},
  {"academic_year": "2569", "semester": 1}
]
```

#### Authorization
- ✓ Student (own)
- ✓ Admin
- ✓ Teacher

---

## Subject Enrollment

### 4. GET `/subjects/student/{student_id}`

**Purpose:** Get all subjects a student is enrolled in  
**File:** `subject.py` line 276

#### Parameters
| Parameter | Type | Location | Required | Notes |
|-----------|------|----------|----------|-------|
| `student_id` | int | path | ✓ | Student ID |
| `academic_year` | int | query | ✗ | Filter by academic year |
| `semester` | int | query | ✗ | Filter by semester |

#### Response (Array)
```json
{
  "id": 123,
  "name": "วิชาคณิตศาสตร์",
  "code": "MATH101",
  "subject_type": "main",         // "main" or "activity"
  "teacher_id": 5,                // Primary teacher
  "school_id": 1,
  "credits": 3,
  "activity_percentage": null,    // % of grade if activity type
  "max_collected_score": 100,     // Max collected score for this subject
  "max_exam_score": 100,          // Max exam score for this subject
  "is_ended": false,
  "created_at": "2024-01-15T10:30:00",
  "updated_at": "2024-01-15T10:30:00",
  "teachers": [
    {
      "id": 1,                     // Schedule ID
      "schedule_id": 1,
      "teacher_id": 5,
      "teacher_name": "นายจากร",
      "classroom_id": 10,          // null = global teacher
      "classroom_name": "6/1",     // null = global
      "is_ended": false
    }
  ],
  "teacher_count": 1
}
```

#### Authorization
- ✓ Student (own only)
- ✓ Admin

#### Example Request
```bash
GET /subjects/student/42?academic_year=2569&semester=1
```

---

## Grade Management (Teacher/Admin)

### 5. GET `/grades`

**Purpose:** Get grades for a subject/classroom combination  
**File:** `grades.py` line 182

#### Parameters
| Parameter | Type | Location | Required |
|-----------|------|----------|----------|
| `subject_id` | int | query | ✗ |
| `classroom_id` | int | query | ✗ |

#### Response (Array)
```json
{
  "id": 1001,
  "subject_id": 123,
  "student_id": 42,
  "classroom_id": 10,             // null for global subject
  "title": "แบบฝึกหัด 1",         // Assignment name
  "max_score": 20,
  "grade": 18.5,                  // null if not graded yet
  "student_number": "001"         // Student ID from classroom
}
```

#### Authorization
- Student: Only for subjects they're enrolled in
- Teacher: For assigned subject/classrooms
- Admin: All

---

### 6. GET `/grades/assignments/{subject_id}`

**Purpose:** Get list of unique assignments for a subject  
**File:** `grades.py` line 228

#### Parameters
| Parameter | Type | Location | Required |
|-----------|------|----------|----------|
| `subject_id` | int | path | ✓ |
| `classroom_id` | int | query | ✗ |

#### Response (Array)
```json
{
  "id": 1,                    // Index-based ID
  "title": "แบบฝึกหัด 1",
  "max_score": 20,
  "classroom_id": 10          // null = global assignment
}
```

---

### 7. POST `/grades/bulk`

**Purpose:** Upload/update grades for multiple students  
**File:** `grades.py` line 107

#### Request Body
```json
{
  "subject_id": 123,
  "title": "กลางภาค",
  "max_score": 50,
  "classroom_id": 10,  // optional
  "grades": [
    {"student_id": 42, "grade": 45.5},
    {"student_id": 43, "grade": 48},
    {"student_id": 44, "grade": null}
  ]
}
```

#### Response
```json
{
  "detail": "ok",
  "count": 3  // Number of grades processed
}
```

#### Authorization
- ✗ Student
- ✓ Teacher (only for assigned subjects)
- ✓ Admin

---

### 8. POST `/grades/assignments/{subject_id}`

**Purpose:** Create a new assignment for a subject  
**File:** `grades.py` line 282

#### Request Body
```json
{
  "title": "แบบฝึกหัด 2",
  "max_score": 25,
  "classroom_id": 10  // optional, null = global
}
```

#### Response
```json
{
  "id": 2,
  "title": "แบบฝึกหัด 2",
  "max_score": 25,
  "classroom_id": 10
}
```

#### Behavior
- Creates grade records for ALL enrolled students in that subject
- If classroom_id specified, only creates for students in that classroom

#### Authorization
- ✗ Student
- ✓ Teacher (assigned to subject)
- ✓ Admin

---

### 9. PUT `/grades/assignments/{subject_id}/{assignment_title}`

**Purpose:** Update existing assignment  
**File:** `grades.py` line 389

#### Parameters
| Parameter | Type | Location | Required |
|-----------|------|----------|----------|
| `subject_id` | int | path | ✓ |
| `assignment_title` | string | path | ✓ |
| `classroom_id` | int | query | ✗ |

#### Request Body
```json
{
  "title": "แบบฝึกหัด 2 (Updated)",  // optional
  "max_score": 30,                    // optional
  "classroom_id": 10                  // optional
}
```

#### Response
```json
{
  "id": 0,
  "title": "แบบฝึกหัด 2 (Updated)",
  "max_score": 30,
  "classroom_id": 10
}
```

#### Authorization
- ✗ Student
- ✓ Teacher (assigned)
- ✓ Admin

---

### 10. DELETE `/grades/assignments/{subject_id}/{assignment_title}`

**Purpose:** Delete assignment and all its grades  
**File:** `grades.py` line 457

#### Parameters
| Parameter | Type | Location | Required |
|-----------|------|----------|----------|
| `subject_id` | int | path | ✓ |
| `assignment_title` | string | path | ✓ |
| `classroom_id` | int | query | ✗ |

#### Response
```json
{
  "detail": "Assignment deleted successfully"
}
```

#### Authorization
- ✓ Teacher (assigned)
- ✓ Admin

---

## Classroom Rankings

### 11. GET `/grades/classroom/{classroom_id}/ranking`

**Purpose:** Get ranking of students in a classroom or grade level  
**File:** `grades.py` line 797

#### Parameters
| Parameter | Type | Location | Required | Notes |
|-----------|------|----------|----------|-------|
| `classroom_id` | int | path | ✓ | Classroom ID |
| `academic_year` | string | query | ✗ | Filter by year |
| `semester` | int | query | ✗ | Filter by semester |
| `grade_level` | string | query | ✗ | Use grade level instead of classroom |

#### Response (Array, sorted by score descending)
```json
{
  "student_id": 42,
  "full_name": "สมชาย ใจดี",
  "username": "somchai001",
  "total_score": 850.5,           // Sum of all subject scores
  "total_max_score": 1000,
  "average_score": 85.05,         // Percentage 0-100
  "rank": 1
}
```

#### Authorization
- ✓ Admin
- ✓ Teacher
- ✓ Student

---

### 12. GET `/grades/school/{school_id}/ranking`

**Purpose:** Get ranking for entire school  
**File:** `grades.py` line 877

#### Parameters
| Parameter | Type | Location | Required |
|-----------|------|----------|----------|
| `school_id` | int | path | ✓ |

#### Response
Same structure as classroom ranking, but all students in school

#### Authorization
- ✓ Admin
- ✓ Teacher
- ✓ Student

---

## Key Response Fields

| Field | Description | Example |
|-------|-------------|---------|
| `score` | Calculated grade (collected + exam if exists) | 85.5 |
| `max_score` | Maximum possible points | 200 |
| `normalized_score` | Score scaled to 0-100 | 85.5 |
| `subject_type` | "main" (regular) or "activity" | "main" |
| `subject_name` | Subject name in Thai | "คณิตศาสตร์" |
| `credits` | Course credits | 3 |
| `academic_year` | Year like "2569" or "2568" | "2569" |
| `semester` | 1 or 2 | 1 |
| `title` | Assignment/assessment name | "กลางภาค" |
| `grade` | Actual score earned | 45 |
| `activity_percentage` | Weight of activity subject | 30 (for 30%) |
| `teachers` | Array of assigned teachers | [...] |

---

## Score Calculation Logic

### Regular (Main) Subjects
1. **Collect Scores**: Group assignments by type
   - **Collected**: All non-exam assignments ("แบบฝึก", "งาน", etc.)
   - **Exam**: Assignments with "กลางภาค", "ปลายภาค", "final", "midterm" in title

2. **Normalize to Max**:
   ```
   collected_score = (sum_collected / sum_collected_max) * max_collected_score
   exam_score = (sum_exam / sum_exam_max) * max_exam_score
   ```

3. **Combine**:
   ```
   total_score = collected_score + exam_score
   total_max = max_collected_score + max_exam_score (if exam exists, else just collected_max)
   normalized = (total_score / total_max) * 100
   ```

### Activity Subjects
1. **Per Subject**:
   ```
   normalized = (sum_score / sum_max) * 100
   contribution = (normalized * activity_percentage) / 100
   ```

2. **Aggregated**:
   ```
   total_activity = min(sum_of_contributions, 100)  // Capped at 100
   ```

### Subject Scaling Parameters
- `max_collected_score`: Default 100 (configurable per subject)
- `max_exam_score`: Default 100 (configurable per subject)
- `activity_percentage`: 20, 30, 40, etc. (must have per activity subject)

---

## Common Query Patterns

### Get Student's Current Transcript
```bash
GET /grades/student/42/transcript
```

### Get Student's Specific Year/Semester
```bash
GET /grades/student/42/transcript?academic_year=2569&semester=1
```

### Get Available Semesters for Selection UI
```bash
GET /grades/student/42/semester-list
```
Returns: `[{academic_year, semester}, ...]`

### Get All Subject Enrollment (Dropdown)
```bash
GET /subjects/student/42?academic_year=2569
```

### Upload Grades for Class
```bash
POST /grades/bulk
{
  "subject_id": 123,
  "title": "ปลายภาค",
  "max_score": 50,
  "classroom_id": 10,
  "grades": [
    {"student_id": 42, "grade": 45},
    {"student_id": 43, "grade": 48}
  ]
}
```

### Create First Assignment
```bash
POST /grades/assignments/123
{
  "title": "แบบฝึกหัด 1",
  "max_score": 20,
  "classroom_id": 10
}
```

### Get Class Ranking
```bash
GET /grades/classroom/10/ranking?academic_year=2569&semester=1
```

### Get Grade/Level Ranking
```bash
GET /grades/classroom/0/ranking?grade_level=6&academic_year=2569&semester=1
```

---

## Error Responses

### 403 Forbidden
```json
{
  "detail": "Not authorized to view this student transcript"
}
```
**Causes:**
- Student trying to view another student's grades
- Teacher trying to access unauthorized subject
- Grade announcement date not reached (student only)

### 404 Not Found
```json
{
  "detail": "Student not found"
}
```

### 400 Bad Request
```json
{
  "detail": "Assignment with this title already exists"
}
```

---

## Implementation Notes for Frontend

### Matching Response Fields
✓ `subject_name` - Direct from `Subject.name`  
✓ `score` - Calculated from grades  
✓ `max_score` - Based on configuration  
✓ `subject_type` - "main" or "activity"  
✓ `academic_year` - From subject  
✓ `semester` - From subject  

### Data Dependencies
1. **For Transcript**: Need `classroom_id` OR `academic_year + semester`
2. **For Assignments**: Need `subject_id`
3. **For Grades**: Need `subject_id` + optional `classroom_id`
4. **For Ranking**: Need `classroom_id` OR `grade_level`

### Page Load Sequence
```
1. Get semester list → Populate selector
2. Select semester → Load transcript
3. Click subject → Load subject details from /subjects/student/{id}
4. (For teachers) Subject → Load assignments → Load grades
```

---

**Last Updated:** 2026-03-08  
**API Version:** FastAPI (SQLAlchemy ORM)
