-- Migration: Create school_access_control table for granular access control per year/semester
-- This table stores whether students and teachers can access grades for each year/semester combination

CREATE TABLE IF NOT EXISTS school_access_control (
    id INT PRIMARY KEY AUTO_INCREMENT,
    school_id INT NOT NULL,
    academic_year VARCHAR(10) NOT NULL COMMENT 'e.g., 2569',
    semester INT NOT NULL COMMENT '1 or 2',
    allow_teacher_view_summary BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Can homeroom teachers view student summary/ranking',
    allow_student_view_grades BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Can students view grade transcript',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_school_year_semester (school_id, academic_year, semester),
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    INDEX idx_school_id (school_id),
    INDEX idx_year_semester (academic_year, semester)
);
