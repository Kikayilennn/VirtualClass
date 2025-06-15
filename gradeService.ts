// gradeService.ts
import { supabase } from '../lib/supabase';
import { Grade } from '../types';

export const gradeService = {
  async getStudentGrades(studentId: string) {
    const { data: grades, error } = await supabase
      .from('grades')
      .select('*')
      .eq('student_id', studentId)
      .order('graded_at', { ascending: false });

    if (error) throw error;
    if (!grades) return [];

    const detailedGrades = await Promise.all(
      grades.map(async (grade: any) => {
        let points = null;
        let max_points = null;
        if (grade.quiz_attempt_id) {
          const { data: attempt } = await supabase
            .from('quiz_attempts')
            .select('score, max_score')
            .eq('id', grade.quiz_attempt_id)
            .single();
          if (attempt) {
            points = attempt.score;
            max_points = attempt.max_score;
          }
        } else if (grade.assignment_id) {
          const { data: submission } = await supabase
            .from('submissions')
            .select('points, assignments(max_points)')
            .eq('assignment_id', grade.assignment_id)
            .eq('student_id', studentId)
            .single();
          if (submission) {
            points = submission.points;
            max_points = submission.assignments?.max_points;
          }
        }
        return { ...grade, points, max_points };
      })
    );
    return detailedGrades;
  },

  async getAllGrades() {
    const { data, error } = await supabase
      .from('grades')
      .select('*')
      .order('graded_at', { ascending: false });

    if (error) {
      console.error('Error loading grades:', error);
      throw error;
    }

    const detailedGrades = await Promise.all(
      (data || []).map(async (grade: any) => {
        let points = null;
        let max_points = null;
        if (grade.quiz_attempt_id) {
          const { data: attempt } = await supabase
            .from('quiz_attempts')
            .select('score, max_score')
            .eq('id', grade.quiz_attempt_id)
            .single();
          if (attempt) {
            points = attempt.score;
            max_points = attempt.max_score;
          }
        } else if (grade.assignment_id) {
          const { data: submission } = await supabase
            .from('submissions')
            .select('points, assignments(max_points)')
            .eq('assignment_id', grade.assignment_id)
            .eq('student_id', grade.student_id)
            .single();
          if (submission) {
            points = submission.points;
            max_points = submission.assignments?.max_points;
          }
        }
        return { ...grade, points, max_points };
      })
    );

    return detailedGrades;
  },

  async upsertGrade(grade: Omit<Grade, 'id' | 'graded_at'>) {
    const { data, error } = await supabase
      .from('grades')
      .upsert(grade)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteGrade(id: string) {
    const { error } = await supabase
      .from('grades')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getAssignmentGrades(assignmentId: string) {
    const { data, error } = await supabase
      .from('grades')
      .select('*')
      .eq('assignment_id', assignmentId);

    if (error) throw error;
    return data;
  },

  async getQuizGrades(quizId: string) {
    const { data: attempts, error } = await supabase
      .from('quiz_attempts')
      .select('id')
      .eq('quiz_id', quizId);

    if (error) throw error;
    const attemptIds = attempts?.map(a => a.id) || [];

    const { data, error: gradeErr } = await supabase
      .from('grades')
      .select('*')
      .in('quiz_attempt_id', attemptIds);

    if (gradeErr) throw gradeErr;
    return data;
  }
};
