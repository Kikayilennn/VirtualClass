import { supabase } from '../lib/supabase';
import { Assignment, Submission } from '../types';

export const assignmentService = {
  // Get all assignments
  async getAssignments() {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get a single assignment
  async getAssignment(id: string) {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Create a new assignment
  async createAssignment(assignment: Omit<Assignment, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('assignments')
      .insert(assignment)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update an assignment
  async updateAssignment(id: string, updates: Partial<Assignment>) {
    const { data, error } = await supabase
      .from('assignments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete an assignment
  async deleteAssignment(id: string) {
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Submit assignment
  async submitAssignment(submission: Omit<Submission, 'id' | 'submitted_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('submissions')
      .upsert({ ...submission, status: 'pending' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get student's submission for an assignment
  async getSubmission(assignmentId: string, studentId: string) {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('assignment_id', assignmentId)
      .eq('student_id', studentId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Get all submissions for an assignment (teachers)
  async getAssignmentSubmissions(assignmentId: string) {
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        *,
        profiles (name, email)
      `)
      .eq('assignment_id', assignmentId);

    if (error) throw error;
    return data;
  },

  // Get all submissions by a student
  async getStudentSubmissions(studentId: string) {
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        *,
        assignments (title, max_points, due_date)
      `)
      .eq('student_id', studentId);

    if (error) throw error;
    return data;
  },

  // Update a submission (for grading or other edits)
  async updateSubmission(submissionId: string, updates: Partial<Submission>) {
    const { data, error } = await supabase
      .from('submissions')
      .update(updates)
      .eq('id', submissionId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Grade a submission
  async gradeSubmission(submissionId: string, points: number) {
    const { data: submission, error: subError } = await supabase
      .from('submissions')
      .select('assignment_id')
      .eq('id', submissionId)
      .single();

    if (subError || !submission) throw subError;

    const { data: assignment, error: assgnError } = await supabase
      .from('assignments')
      .select('max_points')
      .eq('id', submission.assignment_id)
      .single();

    if (assgnError || !assignment) throw assgnError;

    const update = {
      points,
      max_points: assignment.max_points,
      status: 'graded'
    };

    const { data, error } = await supabase
      .from('submissions')
      .update(update)
      .eq('id', submissionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
