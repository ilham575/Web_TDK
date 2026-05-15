-- Migration: Create break_schedules table
-- Purpose: Store school-wide break entries per academic year and semester in the schedule assignment flow

CREATE TABLE break_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER NOT NULL,
    academic_year VARCHAR(10) NOT NULL,
    semester INTEGER NOT NULL,
    day_of_week VARCHAR(10) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    note VARCHAR(255),
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);