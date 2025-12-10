-- Add classroom_id column to grades table
ALTER TABLE grades ADD COLUMN classroom_id INTEGER NULL;
-- Optional: add FK constraint if using DB that supports it
-- ALTER TABLE grades ADD CONSTRAINT fk_grades_classroom FOREIGN KEY (classroom_id) REFERENCES classrooms(id);
