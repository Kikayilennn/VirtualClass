import { supabase } from '../lib/supabase';
import { AttendanceRecord } from '../types';

export const attendanceService = {
  // Get attendance for a specific date
  async getAttendanceByDate(date: string) {
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        *,
        profiles (name, email)
      `)
      .eq('date', date);

    if (error) throw error;
    return data;
  },

  // Get attendance for a student
  async getStudentAttendance(studentId: string) {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', studentId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Record attendance
  async recordAttendance(attendance: Omit<AttendanceRecord, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('attendance')
      .upsert(attendance)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Bulk record attendance
  async recordBulkAttendance(attendanceRecords: Omit<AttendanceRecord, 'id' | 'created_at'>[]) {
    const { data, error } = await supabase
      .from('attendance')
      .upsert(attendanceRecords)
      .select();

    if (error) throw error;
    return data;
  },

  // Get all students for attendance
  async getStudents() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .order('name');

    if (error) throw error;
    return data;
  }
};