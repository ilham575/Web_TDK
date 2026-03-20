# Student Grades API - Quick Reference

## ✅ API Endpoints Related to Student Transcripts, Scores & Subjects

### Primary Endpoints

| Endpoint | Method | Purpose | Key Response Fields |
|----------|--------|---------|-------------------|
| `/grades/student/{id}/transcript` | GET | Get complete transcript | score, max_score, subject_name, subject_type, teachers |
| `/grades/student/{id}/activity-breakdown` | GET | Activity grades detail | contribution, percentage, normalized_score |
| `/grades/student/{id}/semester-list` | GET | Available semesters | academic_year, semester |
| `/subjects/student/{id}` | GET | Student's enrolled subjects | subject_type, credits, max_collected_score, max_exam_score |
| `/grades` | GET | Grades for subject/classroom | title, grade, max_score, student_number |
| `/grades/classroom/{id}/ranking` | GET | Class ranking | average_score, rank, total_score |

---

## Query Parameters Supported

### Academic Year & Semester Filters
- **academic_year**: String (supports short like "69" = "2569")
- **semester**: Integer (1 or 2)
- **classroom_id**: Integer (to filter by specific class)
- **grade_level**: String (e.g., "6", "5", "4")

### Response Structure Alignment

| Frontend Need | API Provides | Field Name | Notes |
|---------------|--------------|------------|-------|
| ✓ วิชา (Subject name) | Yes | `subject_name` | Direct from Subject table |
| ✓ คะแนน (Score) | Yes | `score` | Calculated: collected + exam |
| ✓ max_score | Yes | `max_score` | Subject configuration |
| ✓ subject_type | Yes | `subject_type` | "main" or "activity" |
| ✓ ปีการศึกษา | Yes | `academic_year` | "2569", "2568" format |
| ✓ ภาค | Yes | `semester` | 1 or 2 |
| ✓ Teachers | Yes | `teachers[]` | Full array with names |
| ✓ Credits | Yes | `credits` | Numeric |
| ✓ Activity % | Yes | `activity_percentage` | For activity subjects |
| ✓ Score 0-100 | Yes | `normalized_score` | Always 0-100 scale |

---

## Test These Endpoints

### 1. Get Student Transcript (Most Important)
```bash
curl -X GET "http://localhost:8000/grades/student/42/transcript?academic_year=2569&semester=1" \
  -H "Authorization: Bearer {token}"
```
**Response:**
- Array of subject objects with score, max_score, normalized_score
- Activity subjects grouped under "กิจกรรม (Activity)"

### 2. Get Available Years/Semesters
```bash
curl -X GET "http://localhost:8000/grades/student/42/semester-list" \
  -H "Authorization: Bearer {token}"
```
**Response:**
- `[{academic_year: "2569", semester: 1}, ...]`

### 3. Get Subject Details
```bash
curl -X GET "http://localhost:8000/subjects/student/42?academic_year=2569&semester=1" \
  -H "Authorization: Bearer {token}"
```
**Response:**
- Array of subject objects with all metadata (credits, teachers, max scores)

### 4. Get Grades for Specific Subject
```bash
curl -X GET "http://localhost:8000/grades?subject_id=123&classroom_id=10" \
  -H "Authorization: Bearer {token}"
```
**Response:**
- Array of grade records with student_id, grade, title (assignment name), max_score

### 5. Get Activity Breakdown
```bash
curl -X GET "http://localhost:8000/grades/student/42/activity-breakdown" \
  -H "Authorization: Bearer {token}"
```
**Response:**
- Individual activity subjects with their percentages and contributions

### 6. Get Rankings
```bash
curl -X GET "http://localhost:8000/grades/classroom/10/ranking?academic_year=2569&semester=1" \
  -H "Authorization: Bearer {token}"
```
**Response:**
- Sorted list of students with rank, total_score, average_score

---

## Score Calculation Examples

### Example 1: Regular Subject with Assignments + Exam
```
Subject: Math, max_collected=100, max_exam=100

Assignments (Collected):
- Exercise 1: 18/20
- Exercise 2: 19/20
- Assignment: 33/50
- Total: 70/90

Exam (Final):
- Final Exam: 45/50

Calculation:
collected = (70/90) * 100 = 77.78
exam = (45/50) * 100 = 90.00
final_score = 77.78 + 90.00 = 167.78
max_score = 100 + 100 = 200
normalized = (167.78/200) * 100 = 83.89

Response:
{
  "score": 167.78,
  "max_score": 200,
  "normalized_score": 83.89,
  "subject_type": "regular"
}
```

### Example 2: Activity Subjects
```
School has 3 activity subjects with percentages:
1. PE (สุขศึกษา): 30%
2. Music (ดนตรี): 20% 
3. Social (สังคม): 50%

Each normalized to 100 scale:
PE: 85 score → 85 normalized
Music: 90 score → 90 normalized
Social: 75 score → 75 normalized

Contributions:
PE: (85 * 30) / 100 = 25.5
Music: (90 * 20) / 100 = 18.0
Social: (75 * 50) / 100 = 37.5
Total: 25.5 + 18.0 + 37.5 = 81.0

Response:
{
  "subject_type": "activity",
  "subject_name": "กิจกรรม (Activity)",
  "score": 81.0,
  "max_score": 100.0,
  "breakdown": [
    {"subject_name": "สุขศึกษา", "normalized_score": 85, "percentage": 30, "contribution": 25.5},
    {"subject_name": "ดนตรี", "normalized_score": 90, "percentage": 20, "contribution": 18.0},
    {"subject_name": "สังคม", "normalized_score": 75, "percentage": 50, "contribution": 37.5}
  ]
}
```

---

## Authorization Levels

| Role | Endpoints | Restrictions |
|------|-----------|--------------|
| **Student** | GET /grades/student/{own}/transcript, semester-list, activity-breakdown | Only own data; respects grade announcement date; access control checks |
| **Teacher** | All GET endpoints + POST/PUT grades for assigned subjects | Can only manage subjects assigned to them |
| **Admin** | All endpoints | Full access |

---

## Error Scenarios

### "Grades have not been announced yet"
- Status: 403
- Cause: Student accessing before `school.grade_announcement_date`
- Fix: Admin sets announcement date in school settings

### "Not authorized to view this student transcript"
- Status: 403
- Cause: Student viewing another student OR missing access control record
- Fix: Verify `SchoolAccessControl` record exists for the academic_year/semester

### "Assignment with this title already exists"
- Status: 400
- Cause: Duplicate assignment title in POST/PUT
- Fix: Use different title or delete existing first

---

## Next Steps

1. **Test Endpoints**: Use the curl commands above with your API
2. **Check Frontend Integration**: Verify frontend maps these fields correctly
3. **Verify Access Control**: Test with student/teacher/admin roles
4. **Check Announcement Date**: Ensure grade_announcement_date is set if needed
5. **Test Score Calculations**: Verify normalized_score matches frontend calculations

**Documentation File:** [API_ENDPOINTS_STUDENT_GRADES.md](API_ENDPOINTS_STUDENT_GRADES.md)
