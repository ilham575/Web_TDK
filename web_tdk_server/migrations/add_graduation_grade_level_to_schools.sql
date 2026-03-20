-- Add graduation grade level setting for each school
ALTER TABLE schools
ADD COLUMN graduation_grade_level VARCHAR(50) NULL;
