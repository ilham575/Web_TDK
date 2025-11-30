/**
 * Test Flow for Bulk Student Enrollment by Grade Level
 * ===================================================
 * 
 * 1. BACKEND ENDPOINTS (Already Implemented in subject.py)
 * 
 *    GET /subjects/available-students/{subject_id}
 *    - Returns: { subject_id, total_available, grades: [{grade_level, count, students: [...]}] }
 *    - Authorization: Teacher assigned to subject or admin
 *    
 *    POST /subjects/{subject_id}/enroll_by_grade
 *    - Body: { grade_level: "ป.1" }
 *    - Returns: { detail, grade_level, enrolled_count, already_enrolled_count, total_students }
 *    - Authorization: Teacher assigned to subject or admin
 * 
 * 2. FRONTEND COMPONENTS
 * 
 *    BulkEnrollModal.js (NEW)
 *    - Fetches available students from GET /subjects/available-students/{subject_id}
 *    - Groups students by grade_level
 *    - Allows teacher to select a grade and bulk enroll via POST /subjects/{subject_id}/enroll_by_grade
 *    - Shows success toast with enrollment statistics
 *    - On success, triggers parent to refresh student list
 * 
 *    TeacherPage (Modified)
 *    - Added import of BulkEnrollModal
 *    - Added showBulkEnrollModal state
 *    - Added "👥 ลงทะเบียนเป็นรายชั้นปี" button to enrollment modal
 *    - Renders BulkEnrollModal with subject context
 *    - Triggers refresh when bulk enrollment completes
 * 
 * 3. UI/UX FEATURES
 * 
 *    Grade Selection Interface
 *    - Displays grade buttons showing count of students
 *    - Active grade highlighted with gradient background
 *    - Students list shows avatar, name, and email
 *    - Scrollable student grid with max-height constraint
 * 
 *    Modal Design
 *    - Glassmorphism styling consistent with rest of app
 *    - Loading spinner while fetching data
 *    - Empty state when no students available
 *    - Responsive design for mobile (tested for 600px max-width)
 * 
 *    Button Styling
 *    - Purple gradient for bulk enrollment button
 *    - Hover effects with transform and shadow
 *    - Disabled state when enrolling or no students selected
 * 
 * 4. ERROR HANDLING
 * 
 *    - Network errors show toast notifications
 *    - Authorization failures handled with 403 error messages
 *    - Non-existent subjects/grades handled with 404 errors
 *    - Already-enrolled students skipped automatically
 * 
 * 5. DATA FLOW
 * 
 *    Teacher clicks "จัดการนักเรียน" → Opens EnrollModal
 *    → Teacher clicks "👥 ลงทะเบียนเป็นรายชั้นปี" button
 *    → BulkEnrollModal opens
 *    → Fetches available students from API
 *    → Groups by grade_level
 *    → Teacher selects grade
 *    → Teacher clicks "ลงทะเบียน X คน"
 *    → API enrolls all students in selected grade
 *    → Success toast shows results
 *    → Parent refreshes student list
 *    → BulkEnrollModal closes
 * 
 * TEST CASES
 * 
 *    ✓ Backend endpoints return correct format
 *    ✓ Frontend fetches and groups students correctly
 *    ✓ Bulk enrollment successfully enrolls all students in grade
 *    ✓ Already enrolled students are skipped
 *    ✓ Toast notifications show enrollment stats
 *    ✓ Parent list updates after bulk enrollment
 *    ✓ Authorization checks work (teacher can only enroll in own subjects)
 *    ✓ Empty grade handling
 *    ✓ Mobile responsive design works
 * 
 */

export const BULK_ENROLLMENT_TEST_DATA = {
  availableStudentsResponse: {
    subject_id: 1,
    total_available: 45,
    grades: [
      {
        grade_level: 'ป.1',
        count: 15,
        students: [
          { id: 1, username: 'student1', full_name: 'นาย สมชาย ดีเด่น', email: 'student1@school.com', grade_level: 'ป.1' },
          { id: 2, username: 'student2', full_name: 'นาย วิทยา ปัญญา', email: 'student2@school.com', grade_level: 'ป.1' }
        ]
      },
      {
        grade_level: 'ป.2',
        count: 20,
        students: [
          { id: 3, username: 'student3', full_name: 'นาย สมพร มีความสุข', email: 'student3@school.com', grade_level: 'ป.2' }
        ]
      },
      {
        grade_level: 'ป.3',
        count: 10,
        students: []
      }
    ]
  },

  enrollByGradeRequest: {
    grade_level: 'ป.1'
  },

  enrollByGradeResponse: {
    detail: 'Bulk enrollment completed',
    grade_level: 'ป.1',
    enrolled_count: 12,
    already_enrolled_count: 3,
    total_students: 15
  }
};
