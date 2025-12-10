# Tab Components Documentation

ไฟล์ที่เกี่ยวข้องกับแท็บสำหรับแต่ละหน้า:

## AdminTabs.js
**ตำแหน่ง:** `src/components/js/pages/admin/AdminTabs.js`

**Props:**
- `activeTab` (string): แท็บที่ใช้งาน
- `setActiveTab` (function): ตั้งค่าแท็บที่ใช้งาน
- `loadSubjects` (function): โหลดข้อมูลรายวิชา (เรียกเมื่อกดแท็บ 'schedules')

**แท็บ:**
1. `users` - จัดการผู้ใช้ (ครู/นักเรียน)
2. `classrooms` - จัดการชั้นเรียน
3. `promotions` - เลื่อนชั้นเรียน
4. `homeroom` - ครูประจำชั้น
5. `subjects` - จัดการรายวิชา
6. `announcements` - จัดการประกาศข่าว
7. `absences` - อนุมัติการลา
8. `schedule` - ตั้งค่าเวลาเปิด-ปิด
9. `schedules` - เพิ่มตารางเรียน

**ตัวอย่างการใช้:**
```jsx
<AdminTabs 
  activeTab={activeTab} 
  setActiveTab={setActiveTab}
  loadSubjects={loadSubjects}
/>
```

---

## TeacherTabs.js
**ตำแหน่ง:** `src/components/js/pages/teacher/TeacherTabs.js`

**Props:**
- `activeTab` (string): แท็บที่ใช้งาน
- `setActiveTab` (function): ตั้งค่าแท็บที่ใช้งาน

**แท็บ:**
1. `subjects` - รายวิชาของฉัน
2. `homeroom` - สรุปข้อมูลนักเรียนในชั้นที่ประจำ
3. `announcements` - ประกาศข่าว
4. `absences` - อนุมัติการลา
5. `schedule` - ตารางเรียน

**ตัวอย่างการใช้:**
```jsx
<TeacherTabs 
  activeTab={activeTab} 
  setActiveTab={setActiveTab}
/>
```

---

## StudentTabs.js
**ตำแหน่ง:** `src/components/js/pages/student/StudentTabs.js`

**Props:**
- `activeTab` (string): แท็บที่ใช้งาน
- `setActiveTab` (function): ตั้งค่าแท็บที่ใช้งาน

**แท็บ:**
1. `subjects` - รายวิชาที่ลงทะเบียน
2. `announcements` - ข่าวสาร
3. `schedule` - ตารางเรียน
4. `absences` - การลา
5. `transcript` - ผลการเรียน

**ตัวอย่างการใช้:**
```jsx
<StudentTabs 
  activeTab={activeTab} 
  setActiveTab={setActiveTab}
/>
```

---

## OwnerTabs.js
**ตำแหน่ง:** `src/components/js/pages/owner/OwnerTabs.js`

**Props:**
- `activeTab` (string): แท็บที่ใช้งาน
- `setActiveTab` (function): ตั้งค่าแท็บที่ใช้งาน

**แท็บ:**
1. `schools` - จัดการโรงเรียน
2. `activities` - กิจกรรมล่าสุด
3. `create_admin` - เพิ่มแอดมิน
4. `admin_requests` - คำขอสร้างแอดมิน
5. `password_reset_requests` - อนุมัติรีเซ็ตรหัสผ่าน

**ตัวอย่างการใช้:**
```jsx
<OwnerTabs 
  activeTab={activeTab} 
  setActiveTab={setActiveTab}
/>
```

---

## CSS Classes

แต่ละคอมโพเนนต์ใช้ CSS class ดังนี้:

### AdminTabs
- `.tabs-header` - container หลัก
- `.admin-tab-button` - ปุ่มแท็บ
- `.admin-tab-button.active` - ปุ่มแท็บที่ใช้งาน

### TeacherTabs
- `.tabs-container` - wrapper หลัก
- `.tabs-header` - container ปุ่ม
- `.teacher-tab-button` - ปุ่มแท็บ
- `.teacher-tab-button.active` - ปุ่มแท็บที่ใช้งาน

### StudentTabs
- `.tabs-header` - container หลัก
- `.student-tab-button` - ปุ่มแท็บ
- `.student-tab-button.active` - ปุ่มแท็บที่ใช้งาน

### OwnerTabs
- `.tabs-header` - container หลัก
- `.tab-button` - ปุ่มแท็บ
- `.tab-button.active` - ปุ่มแท็บที่ใช้งาน

---

## Integration Tips

1. **Import คอมโพเนนต์แท็บ:**
   ```jsx
   import AdminTabs from './AdminTabs';
   import TeacherTabs from './TeacherTabs';
   import StudentTabs from './StudentTabs';
   import OwnerTabs from './OwnerTabs';
   ```

2. **ใช้ในหน้า:**
   ```jsx
   <AdminTabs activeTab={activeTab} setActiveTab={setActiveTab} loadSubjects={loadSubjects} />
   <div className="tab-content">
     {activeTab === 'users' && <UsersSection />}
     {activeTab === 'classrooms' && <ClassroomsSection />}
     {/* ... other tabs ... */}
   </div>
   ```

3. **CSS Styling:**
   - CSS สำหรับแท็บอยู่ใน `src/css/pages/admin/admin-home.css`
   - CSS สำหรับแท็บอยู่ใน `src/css/pages/teacher/teacher-home.css`
   - CSS สำหรับแท็บอยู่ใน `src/css/pages/student/student-home.css`
   - CSS สำหรับแท็บอยู่ใน `src/css/pages/owner/owner-home.css`
