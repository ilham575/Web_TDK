-- Migration: เพิ่มคอลัมน์ student_number (เลขที่) ในตาราง classroom_students
-- เลขที่นักเรียนในห้องเรียน สามารถเปลี่ยนได้ตามห้อง/ปีการศึกษา

ALTER TABLE classroom_students ADD COLUMN student_number INT NULL AFTER student_id;
