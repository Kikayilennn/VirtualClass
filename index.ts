export interface Profile {
  id: string;
  name: string;
  email: string;
  role: 'teacher' | 'student';
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  created_by: string;
  created_at: string;
  due_date: string;
  time_limit?: number;
  attempts_allowed: number;
  status: 'draft' | 'published' | 'closed';
  updated_at: string;
  questions?: Question[];
}

export interface Question {
  id: string;
  quiz_id: string;
  question_type: 'multiple-choice' | 'true-false' | 'short-answer';
  question_text: string;
  options?: string[];
  correct_answer: string;
  points: number;
  order_index: number;
  created_at: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  created_by: string;
  created_at: string;
  due_date: string;
  max_points: number;
  status: 'draft' | 'published' | 'closed';
  updated_at: string;
}

export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string;
  attachments?: string[];
  submitted_at: string;
  status: 'pending' | 'graded' | 'late'; // updated to match DB and logic
  updated_at: string;
  points?: number; // added for assignment grading
  max_points?: number; // added for assignment grading
  feedback?: string; // added for assignment grading
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  answers: Record<string, string | number>;
  score: number;
  max_score: number;
  completed_at: string;
  time_spent: number;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  notes?: string;
  recorded_by: string;
  created_at: string;
}

export interface Grade {
  id: string;
  student_id: string;
  assignment_id?: string; // for assignment grades, references submission
  quiz_attempt_id?: string; // for quiz grades, references quiz attempt
  feedback?: string;
  graded_by: string;
  graded_at: string;
}

// Legacy types for compatibility
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'teacher' | 'student';
  avatar?: string;
}

export interface OnlineClass {
  id: string;
  title: string;
  course_id: string;
  teacher_id: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  meeting_link: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  title: string;
  code: string;
  description: string;
  teacher_id: string;
  schedule: {
    day: string;
    start_time: string;
    end_time: string;
  }[];
  students: string[];
  status: 'active' | 'inactive' | 'archived';
  created_at: string;
  updated_at: string;
}