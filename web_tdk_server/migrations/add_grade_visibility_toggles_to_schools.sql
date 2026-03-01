-- Migration: เพิ่มคอลัมน์ toggle สำหรับครูและนักเรียนในตาราง schools
-- can_teacher_view_summary: ควบคุมว่าครูประจำชั้นเห็นอันดับ/สรุปคะแนนหรือไม่
-- is_grade_announced: ควบคุมว่านักเรียนเห็นคะแนนรายวิชาและใบเกรดหรือไม่ (Override manual)

ALTER TABLE schools ADD COLUMN can_teacher_view_summary BOOLEAN DEFAULT FALSE;
ALTER TABLE schools ADD COLUMN is_grade_announced BOOLEAN DEFAULT FALSE;
