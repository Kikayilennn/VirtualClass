import { supabase } from '../lib/supabase';
import { Quiz, Question, QuizAttempt } from '../types';
import { Database } from '../lib/database.types';

// Types for Supabase payloads
export type QuizInsert = Database['public']['Tables']['quizzes']['Insert'];
export type QuestionInsert = Database['public']['Tables']['questions']['Insert'];

export const quizService = {
  // Get all quizzes (teachers) or published quizzes (students)
  async getQuizzes() {
    const { data, error } = await supabase
      .from('quizzes')
      .select(`
        *,
        questions (*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get a single quiz with questions
  async getQuiz(id: string) {
    const { data, error } = await supabase
      .from('quizzes')
      .select(`
        *,
        questions (*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Create a new quiz
  async createQuiz(quiz: QuizInsert) {
    const { data, error } = await supabase
      .from('quizzes')
      .insert(quiz)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update a quiz
  async updateQuiz(id: string, quiz: Partial<Quiz>) {
    const { data, error } = await supabase
      .from('quizzes')
      .update(quiz)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete a quiz
  async deleteQuiz(id: string) {
    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Add questions to a quiz
  async addQuestions(quizId: string, questions: QuestionInsert[]) {
    // Ensure each question is associated with the correct quiz
    const questionsWithQuizId = questions.map(q => ({ ...q, quiz_id: quizId }));
    const { data, error } = await supabase
      .from('questions')
      .insert(questionsWithQuizId)
      .select();

    if (error) throw error;
    return data;
  },

  // Update a question
  async updateQuestion(id: string, updates: Partial<Question>) {
    const { data, error } = await supabase
      .from('questions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete a question
  async deleteQuestion(id: string) {
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Delete all questions for a quiz
  async deleteQuestionsByQuizId(quizId: string) {
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('quiz_id', quizId);
    if (error) throw error;
  },

  // Submit a quiz attempt
async submitQuizAttempt(attemptData: any) {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .insert(attemptData)
    .select()
    .single();

  if (error) throw error;
  return data;
},


  // Update a quiz attempt
  async updateQuizAttempt(id: string, attempt: Partial<QuizAttempt>) {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .update(attempt)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get all attempts for a quiz (teachers)
  async getQuizAttempts(quizId: string) {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', quizId)
      .order('completed_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get student's attempts for a quiz
  async getStudentAttempts(quizId: string) {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', quizId)
      .order('completed_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get all attempts by a student (for dashboard filtering)
  async getAllStudentAttempts(studentId: string) {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('student_id', studentId);
    if (error) throw error;
    return data;
  }
};