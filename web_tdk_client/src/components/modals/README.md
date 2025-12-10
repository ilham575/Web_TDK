# Modal Components Documentation

นี่คือเอกสารประกอบสำหรับ Modal Components ที่ได้เขียนแยกจาก TeacherPage component

## 📋 รายชื่อ Modal

### 1. **StudentDetailModal** 
📁 `src/components/modals/StudentDetailModal.js`

**วัตถุประสงค์:** แสดงข้อมูลรายละเอียดของนักเรียน

**Props:**
- `isOpen` (boolean) - เปิด/ปิด modal
- `selectedStudentDetail` (object) - ข้อมูลนักเรียนที่ถูกเลือก
- `onClose` (function) - callback เมื่อปิด modal
- `calculateMainSubjectsScore` (function) - function คำนวณคะแนนวิชาปกติ
- `calculateGPA` (function) - function คำนวณ GPA
- `getLetterGrade` (function) - function แปลงคะแนนเป็นเกรด
- `initials` (function) - function สร้าง initials จากชื่อ

**รายละเอียด:**
- แสดงข้อมูลทั่วไป: ชื่อ, ชื่อผู้ใช้, อีเมล
- แสดงส่วนคะแนน:
  - สรุปคะแนนรวม (วิชาปกติเท่านั้น)
  - รายวิชาปกติ (สีน้ำเงิน)
  - วิชากิจกรรม (สีส้ม)
- แสดงส่วนการเข้าเรียน:
  - สรุปการเข้าเรียนโดยรวม
  - รายวิชาแต่ละวิชา

---

### 2. **ScheduleModal**
📁 `src/components/modals/ScheduleModal.js`

**วัตถุประสงค์:** กำหนดหรือแก้ไขตารางเรียน

**Props:**
- `isOpen` (boolean) - เปิด/ปิด modal
- `editingAssignment` (object) - งานที่กำลังแก้ไข (null = เพิ่มใหม่)
- `selectedSubjectId` (string) - ID วิชาที่เลือก
- `setSelectedSubjectId` (function) - set ID วิชา
- `scheduleDay` (string) - วันที่เลือก
- `setScheduleDay` (function) - set วัน
- `selectedClassroomId` (string) - ID ชั้นเรียน
- `setSelectedClassroomId` (function) - set ID ชั้นเรียน
- `scheduleStartTime` (string) - เวลาเริ่มต้น
- `setScheduleStartTime` (function) - set เวลาเริ่มต้น
- `scheduleEndTime` (string) - เวลาสิ้นสุด
- `setScheduleEndTime` (function) - set เวลาสิ้นสุด
- `teacherSubjects` (array) - รายชื่อวิชาของครู
- `scheduleSlots` (array) - เวลาที่เปิดการเรียน
- `classrooms` (array) - รายชื่อชั้นเรียน
- `getDayName` (function) - function แปลงวันเป็นชื่อ
- `onSubmit` (function) - callback เมื่อบันทึก
- `onCancel` (function) - callback เมื่อยกเลิก

**รายละเอียด:**
- ข้อมูลพื้นฐาน:
  - เลือกรายวิชา
  - เลือกวันเรียน
  - เลือกชั้นเรียน (ตัวเลือก)
- ช่วงเวลาเรียน:
  - เวลาเริ่มต้น
  - เวลาสิ้นสุด

---

### 3. **ConfirmModal** (existing)
📁 `src/components/ConfirmModal.js`

**วัตถุประสงค์:** ยืนยันการกระทำที่สำคัญ

**Props:**
- `isOpen` (boolean)
- `title` (string)
- `message` (string)
- `onCancel` (function)
- `onConfirm` (function)

---

### 4. **ExpiryModal** (existing)
📁 `src/components/ExpiryModal.js`

**วัตถุประสงค์:** ตั้งวันหมดอายุของข่าวสาร

**Props:**
- `isOpen` (boolean)
- `initialValue` (string)
- `onClose` (function)
- `onSave` (function)
- `title` (string)

---

### 5. **AnnouncementModal** (existing)
📁 `src/components/AnnouncementModal.js`

**วัตถุประสงค์:** จัดการข่าวสาร (แก้ไข/สร้างใหม่)

**Props:**
- `isOpen` (boolean)
- `initialData` (object)
- `onClose` (function)
- `onSave` (function)

---

## 🔄 การใช้งานใน TeacherPage

### Import
```javascript
import StudentDetailModal from '../../modals/StudentDetailModal';
import ScheduleModal from '../../modals/ScheduleModal';
```

### Usage
```javascript
// Student Detail Modal
<StudentDetailModal
  isOpen={showStudentDetailModal}
  selectedStudentDetail={selectedStudentDetail}
  onClose={() => setShowStudentDetailModal(false)}
  calculateMainSubjectsScore={calculateMainSubjectsScore}
  calculateGPA={calculateGPA}
  getLetterGrade={getLetterGrade}
  initials={initials}
/>

// Schedule Modal
<ScheduleModal
  isOpen={showScheduleModal}
  editingAssignment={editingAssignment}
  selectedSubjectId={selectedSubjectId}
  setSelectedSubjectId={setSelectedSubjectId}
  scheduleDay={scheduleDay}
  setScheduleDay={setScheduleDay}
  selectedClassroomId={selectedClassroomId}
  setSelectedClassroomId={setSelectedClassroomId}
  scheduleStartTime={scheduleStartTime}
  setScheduleStartTime={setScheduleStartTime}
  scheduleEndTime={scheduleEndTime}
  setScheduleEndTime={setScheduleEndTime}
  teacherSubjects={teacherSubjects}
  scheduleSlots={scheduleSlots}
  classrooms={classrooms}
  getDayName={getDayName}
  onSubmit={editingAssignment ? updateSubjectSchedule : assignSubjectToSchedule}
  onCancel={cancelScheduleModal}
/>
```

---

## 📦 Folder Structure

```
src/components/
├── modals/
│   ├── StudentDetailModal.js
│   └── ScheduleModal.js
├── ConfirmModal.js
├── ExpiryModal.js
├── AnnouncementModal.js
└── js/
    └── pages/
        └── teacher/
            └── home.js
```

---

## 🎯 Benefits

✅ **Code Organization** - โค้ด modal แยกออกจาก main component
✅ **Reusability** - สามารถนำ modal ไปใช้ในที่อื่นได้
✅ **Maintainability** - ง่ายต่อการแก้ไขและบำรุงรักษา
✅ **Readability** - home.js มีขนาดเล็กลง อ่านเข้าใจง่ายขึ้น
✅ **Testing** - ทดสอบแต่ละ modal แยกกันได้

