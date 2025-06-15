export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      assignments: {
        Row: {
          created_at: string
          created_by: string
          description: string
          due_date: string
          id: string
          max_points: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description: string
          due_date: string
          id?: string
          max_points?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string
          id?: string
          max_points?: number
          status?: string
          title?: string
          updated_at?: string
        }
      }
      attendance: {
        Row: {
          created_at: string
          date: string
          id: string
          notes: string | null
          recorded_by: string
          status: string
          student_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          recorded_by: string
          status: string
          student_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          recorded_by?: string
          status?: string
          student_id?: string
        }
      }
      grades: {
        Row: {
          assignment_id: string | null
          feedback: string | null
          graded_at: string
          graded_by: string
          id: string
          quiz_attempt_id: string | null
          student_id: string
        }
        Insert: {
          assignment_id?: string | null
          feedback?: string | null
          graded_at?: string
          graded_by: string
          id?: string
          quiz_attempt_id?: string | null
          student_id: string
        }
        Update: {
          assignment_id?: string | null
          feedback?: string | null
          graded_at?: string
          graded_by?: string
          id?: string
          quiz_attempt_id?: string | null
          student_id?: string
        }
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          role: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: string
          updated_at?: string
        }
      }
      questions: {
        Row: {
          correct_answer: string
          created_at: string
          id: string
          options: Json | null
          order_index: number
          points: number
          question_text: string
          question_type: string
          quiz_id: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          id?: string
          options?: Json | null
          order_index: number
          points?: number
          question_text: string
          question_type: string
          quiz_id: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          id?: string
          options?: Json | null
          order_index?: number
          points?: number
          question_text?: string
          question_type?: string
          quiz_id?: string
        }
      }
      quiz_attempts: {
        Row: {
          answers: Json
          completed_at: string
          id: string
          max_score: number
          quiz_id: string
          score: number
          student_id: string
          time_spent: number
        }
        Insert: {
          answers?: Json
          completed_at?: string
          id?: string
          max_score?: number
          quiz_id: string
          score?: number
          student_id: string
          time_spent?: number
        }
        Update: {
          answers?: Json
          completed_at?: string
          id?: string
          max_score?: number
          quiz_id?: string
          score?: number
          student_id?: string
          time_spent?: number
        }
      }
      quizzes: {
        Row: {
          attempts_allowed: number
          created_at: string
          created_by: string
          description: string | null
          due_date: string
          id: string
          status: string
          time_limit: number | null
          title: string
          updated_at: string
        }
        Insert: {
          attempts_allowed?: number
          created_at?: string
          created_by: string
          description?: string | null
          due_date: string
          id?: string
          status?: string
          time_limit?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          attempts_allowed?: number
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string
          id?: string
          status?: string
          time_limit?: number | null
          title?: string
          updated_at?: string
        }
      }
      submissions: {
        Row: {
          assignment_id: string
          attachments: Json
          content: string
          id: string
          status: string
          student_id: string
          submitted_at: string
          updated_at: string
          grade: number | null // grade given by teacher
          max_points: number // added
          points: number // added
          feedback: string | null // feedback from teacher
        }
        Insert: {
          assignment_id: string
          attachments?: Json
          content: string
          id?: string
          status?: string
          student_id: string
          submitted_at?: string
          updated_at?: string
          grade?: number | null
          max_points: number // added
          points: number // added
          feedback?: string | null
        }
        Update: {
          assignment_id?: string
          attachments?: Json
          content?: string
          id?: string
          status?: string
          student_id?: string
          submitted_at?: string
          updated_at?: string
          grade?: number | null
          max_points?: number // added
          points?: number // added
          feedback?: string | null
        }
      }
      meet_links: {
        Row: {
          id: string
          link: string
        }
        Insert: {
          id: string
          link: string
        }
        Update: {
          id?: string
          link?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}