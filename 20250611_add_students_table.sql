-- Create students table for student-specific records
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  enrollment_date timestamptz DEFAULT now(),
  -- Add more student-specific fields as needed
  UNIQUE(user_id)
);

-- Policy: Students can read/update their own student record
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can read/update own student record" ON students
  FOR ALL USING (auth.uid() = user_id);

-- Policy: Teachers can read all students
CREATE POLICY "Teachers can read all students" ON students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher'
    )
  );
