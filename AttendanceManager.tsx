import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, Save } from 'lucide-react';
import { attendanceService } from '../../services/attendanceService';
import { formatDate } from '../../utils/storage';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

const AttendanceManager: React.FC = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<{ [studentId: string]: 'present' | 'absent' | 'late' }>({});
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calendarDates, setCalendarDates] = useState<{ [date: string]: number }>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchStudents();
    fetchAttendanceHistory();
  }, []);

  useEffect(() => {
    fetchAttendanceForDate(selectedDate);
  }, [selectedDate]);

  const fetchAttendanceHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('date, status')
        .order('date', { ascending: false });

      if (error) throw error;

      // Count attendance records per date
      const dateCounts: { [date: string]: number } = {};
      data?.forEach(record => {
        const date = record.date;
        dateCounts[date] = (dateCounts[date] || 0) + 1;
      });

      setCalendarDates(dateCounts);
    } catch (err: any) {
      console.error('Error fetching attendance history:', err);
    }
  };

  // Helper to get local date string in YYYY-MM-DD
  const getLocalDateString = (dateObj: Date) => {
    return dateObj.getFullYear() + '-' +
      String(dateObj.getMonth() + 1).padStart(2, '0') + '-' +
      String(dateObj.getDate()).padStart(2, '0');
  };

  const fetchAttendanceForDate = async (date: string) => {
    try {
      const dateObj = new Date(date);
      dateObj.setHours(0, 0, 0, 0);
      const formattedDate = getLocalDateString(dateObj);

      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', formattedDate);

      if (error) throw error;

      const attendanceMap: { [studentId: string]: 'present' | 'absent' | 'late' } = {};
      data?.forEach(record => {
        attendanceMap[record.student_id] = record.status;
      });

      setAttendance(attendanceMap);
    } catch (err: any) {
      console.error('Error fetching attendance for date:', err);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const studentsData = await attendanceService.getStudents();
      setStudents(studentsData || []);
    } catch (err: any) {
      setError('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceForDate = (studentId: string, date: string) => {
    return attendance[studentId] || 'present';
  };

  const setStudentAttendance = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const saveAttendance = async () => {
    try {
      const selectedDateObj = new Date(selectedDate);
      selectedDateObj.setHours(0, 0, 0, 0);
      const formattedDate = getLocalDateString(selectedDateObj);

      // Always include all students, defaulting to 'present' if not set
      const attendanceRecords = students.map(student => ({
        student_id: student.id,
        date: formattedDate,
        status: attendance[student.id] || 'present',
        recorded_by: user?.id
      }));

      console.log('Saving attendance:', attendanceRecords);
      const { error } = await supabase
        .from('attendance')
        .upsert(attendanceRecords, { onConflict: 'student_id,date' });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      fetchAttendanceHistory();
      setSuccessMessage('Attendance saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError('Failed to save attendance');
      setSuccessMessage(null);
      console.error('Error saving attendance:', err);
    }
  };

  const getAttendanceStats = () => {
    const total = students.length;
    const present = students.filter(student =>
      getAttendanceForDate(student.id, selectedDate) === 'present'
    ).length;
    const absent = students.filter(student =>
      getAttendanceForDate(student.id, selectedDate) === 'absent'
    ).length;
    const late = students.filter(student =>
      getAttendanceForDate(student.id, selectedDate) === 'late'
    ).length;

    return { total, present, absent, late };
  };

  const stats = getAttendanceStats();

  const handleDateSelect = (date: string) => {
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);
    setSelectedDate(getLocalDateString(dateObj));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Attendance Management</h2>
        <button
          onClick={saveAttendance}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Save className="h-4 w-4" />
          <span>Save Attendance</span>
        </button>
      </div>
      {successMessage && <div className="text-green-600 bg-green-50 border border-green-200 rounded-lg px-4 py-2 mb-2">{successMessage}</div>}
      {error && <div className="text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-2">{error}</div>}
      {loading ? (
        <div>Loading students...</div>
      ) : (
        <div>
          {/* Calendar and Date Selector */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
            <div className="flex items-center space-x-4 mb-4">
              <Calendar className="h-5 w-5 text-gray-400" />
              <label className="block text-sm font-medium text-gray-700">Select Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateSelect(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-500">
                  {day}
                </div>
              ))}
              {Array.from({ length: 35 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - 17 + i);
                date.setHours(0, 0, 0, 0);
                const dateStr = getLocalDateString(date);
                const hasAttendance = calendarDates[dateStr] > 0;
                const isSelected = dateStr === selectedDate;

                return (
                  <button
                    key={dateStr}
                    onClick={() => handleDateSelect(dateStr)}
                    className={`p-2 text-center rounded-lg ${isSelected
                      ? 'bg-blue-600 text-white'
                      : hasAttendance
                        ? 'bg-green-100 text-green-800'
                        : 'hover:bg-gray-100'
                      }`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Attendance Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Present</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.present}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Absent</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.absent}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Late</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.late}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Attendance List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Attendance for {formatDate(new Date(selectedDate))}
              </h3>
            </div>

            <div className="divide-y divide-gray-200">
              {students.map((student) => {
                const currentStatus = getAttendanceForDate(student.id, selectedDate);

                return (
                  <div key={student.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {student.name.split(' ').map((n: string) => n[0]).join('')}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{student.name}</div>
                        <div className="text-sm text-gray-500">{student.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setStudentAttendance(student.id, 'present')}
                        className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentStatus === 'present'
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-600'
                          }`}
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Present</span>
                      </button>

                      <button
                        onClick={() => setStudentAttendance(student.id, 'late')}
                        className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentStatus === 'late'
                          ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-yellow-50 hover:text-yellow-600'
                          }`}
                      >
                        <Clock className="h-4 w-4" />
                        <span>Late</span>
                      </button>

                      <button
                        onClick={() => setStudentAttendance(student.id, 'absent')}
                        className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentStatus === 'absent'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'
                          }`}
                      >
                        <XCircle className="h-4 w-4" />
                        <span>Absent</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceManager;