-- Create teachers table
CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: Only allow teachers to access their own row
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers can manage own teacher row" ON teachers
  FOR ALL USING (auth.uid() = id);

-- Allow admin/owner to manage all rows (optional, for admin tools)
CREATE POLICY "Admin can manage all teachers" ON teachers
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
