// GradesManager.tsx
import React, { useState, useEffect } from 'react';
import { Search, Download } from 'lucide-react';
import { gradeService } from '../../services/gradeService';
import { supabase } from '../../lib/supabase';

const GradesManager: React.FC = () => {


  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        setLoading(true);
        const allGrades = await gradeService.getAllGrades();

        const studentIds = [...new Set(allGrades.map((g: any) => g.student_id))];
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', studentIds);

        if (profilesError) throw profilesError;

        const profileMap = new Map(profiles.map((p: any) => [p.id, p]));

        setStudents(
          studentIds.map(id => ({
            id,
            name: profileMap.get(id)?.name || 'Unknown',
            email: profileMap.get(id)?.email || ''
          }))
        );

        setGrades(allGrades);
      } catch (err: any) {
        console.error(err);
        setError('Failed to load grades');
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
  }, []);

  const filteredStudents = students.filter(student =>
    (student.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAllStudentGrades = (studentId: string) => {
    return grades.filter((g: any) => g.student_id === studentId);
  };

  const calculateStudentAverage = (studentId: string) => {
    const studentGrades = getAllStudentGrades(studentId);
    const totalPoints = studentGrades.reduce((sum, g: any) => sum + (g.points || 0), 0);
    const totalMaxPoints = studentGrades.reduce((sum, g: any) => sum + (g.max_points || 0), 0);
    return totalMaxPoints > 0 ? (totalPoints / totalMaxPoints) * 100 : 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Grade Management</h2>
        <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
          <Download className="h-4 w-4" />
          <span>Export Grades</span>
        </button>
      </div>
      {error && <div className="text-red-600">{error}</div>}
      {loading ? (
        <div>Loading grades...</div>
      ) : (
        <>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Student Grades</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Average</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grades</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.map(student => {
                    const studentGrades = getAllStudentGrades(student.id);
                    const avg = calculateStudentAverage(student.id);
                    return (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
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
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{avg.toFixed(1)}%</div>
                        </td>
                        <td className="px-6 py-4">
                          <ul className="list-disc ml-4 text-sm text-gray-700">
                            {studentGrades.map((g, idx) => (
                              <li key={idx}>
                                {g.assignment_id ? 'Assignment' : 'Quiz'} — {g.points}/{g.max_points}
                                {g.feedback && ` • ${g.feedback}`}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GradesManager;
