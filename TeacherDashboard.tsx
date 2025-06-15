import React, { useState, useEffect } from 'react';
import {
  FileText,
  Users,
  BookOpen,
  CheckCircle,

} from 'lucide-react';
import QuizCreator from './QuizCreator';
import AssignmentCreator from './AssignmentCreator';
import GradesManager from './GradesManager';
import AttendanceManager from './AttendanceManager';
import { formatDate } from '../../utils/storage';
import { useAuth } from '../../context/AuthContext';
import { assignmentService } from '../../services/assignmentService';
import { quizService } from '../../services/quizService';
import { gradeService } from '../../services/gradeService';
import { meetService } from '../../services/meetService';

const TeacherDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { user } = useAuth();

  // Real data states
  const [students, setStudents] = useState<any[]>([]);
  const [publishedQuizzes, setPublishedQuizzes] = useState<any[]>([]);
  const [publishedAssignments, setPublishedAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meetLink, setMeetLink] = useState<string | null>(null);
  const [creatingMeet, setCreatingMeet] = useState(false);
  // Add state for assignment submissions
  const [assignmentSubmissions, setAssignmentSubmissions] = useState<any[]>([]);
  // Add state for grading modal
  const [gradingSubmission, setGradingSubmission] = useState<any | null>(null);
  const [gradeValue, setGradeValue] = useState('');
  const [feedbackValue, setFeedbackValue] = useState('');
  const [gradingLoading, setGradingLoading] = useState(false);
  const [gradingError, setGradingError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Quizzes
        const quizzes = await quizService.getQuizzes();
        setPublishedQuizzes((quizzes || []).filter((q: any) => q.status === 'published' && q.created_by === user?.id));
        // Assignments
        const assignments = await assignmentService.getAssignments();
        setPublishedAssignments((assignments || []).filter((a: any) => a.status === 'published' && a.created_by === user?.id));
        // Students: extract from grades
        // Fix: Only select the correct relationship for profiles in your Supabase query
        // (Assuming you control gradeService.getAllGrades)
        // If not, fallback to just using student_id and skip profiles
        let grades = await gradeService.getAllGrades();
        // Use the new 'student' join from gradeService
        let uniqueStudents;
        if (grades.length > 0 && grades[0].student) {
          uniqueStudents = Array.from(
            new Map(grades.map((g: any) => [g.student_id, { id: g.student_id, name: g.student?.name || 'Unknown', email: g.student?.email || '' }])).values()
          );
        } else {
          uniqueStudents = Array.from(
            new Map(grades.map((g: any) => [g.student_id, { id: g.student_id, name: 'Unknown', email: '' }])).values()
          );
        }
        setStudents(uniqueStudents);
      } catch (err: any) {
        console.error('Dashboard fetch error:', err);
        setError('Failed to load dashboard data: ' + (err?.message || JSON.stringify(err)));
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchData();
  }, [user?.id]);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        // For all published assignments, fetch submissions
        const allSubmissions = [];
        for (const assignment of publishedAssignments) {
          const submissions = await assignmentService.getAssignmentSubmissions(assignment.id);
          allSubmissions.push(...(submissions || []).map((s: any) => ({ ...s, assignment })));
        }
        setAssignmentSubmissions(allSubmissions);
      } catch (err) {
        setAssignmentSubmissions([]);
      }
    };
    if (activeTab === 'assignments') fetchSubmissions();
  }, [activeTab, publishedAssignments]);

  const handleCreateMeet = async () => {
    setCreatingMeet(true);
    try {
      const newLink = await meetService.createMeetLink();
      setMeetLink(newLink);
      alert('Meeting created! Share this link with your students: ' + newLink);
    } catch (err) {
      alert('Failed to create meeting');
    } finally {
      setCreatingMeet(false);
    }
  };

  // Grading handler
  const handleGradeSubmission = async () => {
  if (!gradingSubmission) return;
  setGradingLoading(true);
  setGradingError(null);
  try {
    // ✅ 1. Grade the submission directly (handles setting points, max_points, and status)
    await assignmentService.gradeSubmission(
      gradingSubmission.id,
      Number(gradeValue)
    );

    // ✅ 2. Upsert grade record (just metadata)
    await gradeService.upsertGrade({
      student_id: gradingSubmission.student_id,
      assignment_id: gradingSubmission.assignment.id,
      feedback: feedbackValue,
      graded_by: user?.id || ''
    });

    // ✅ 3. Update UI state
    setAssignmentSubmissions((subs) =>
      subs.map((s) =>
        s.id === gradingSubmission.id
          ? {
              ...s,
              status: 'graded',
              points: Number(gradeValue),
              feedback: feedbackValue
            }
          : s
      )
    );
    setGradingSubmission(null);
    setGradeValue('');
    setFeedbackValue('');
  } catch (err: any) {
    setGradingError('Failed to grade submission: ' + (err?.message || ''));
  } finally {
    setGradingLoading(false);
  }
};


  // --- Dashboard Overview Data ---
  // Show: Total Students, Active Quizzes, Active Assignments, Recent Quizzes, Recent Assignments, and a Quick Actions section

  const renderContent = () => {
    switch (activeTab) {
      case 'quizzes':
        return <QuizCreator />;
      case 'assignmentManagement':
        return <AssignmentCreator />;
      case 'assignments':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Submitted Assignments</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {publishedAssignments.map((assignment: any) => {
                const submissions = assignmentSubmissions.filter((s: any) => s.assignment_id === assignment.id);
                return (
                  <div key={assignment.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{assignment.title}</h3>
                    <p className="text-gray-600 mb-2">Due: {assignment.due_date ? formatDate(new Date(assignment.due_date)) : 'N/A'}</p>
                    <p className="text-gray-600 mb-2">Max Points: {assignment.max_points}</p>
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2">Submissions</h4>
                      {submissions.length === 0 && <div className="text-gray-500">No submissions yet.</div>}
                      {submissions.map((submission: any) => (
                        <div key={submission.id} className="bg-gray-50 p-3 rounded mb-2">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-medium">{submission.profiles?.name || 'Unknown'}</span>
                              <span className="ml-2 text-xs text-gray-500">{submission.profiles?.email || ''}</span>
                              <span className="ml-2 text-xs text-gray-500">Submitted: {formatDate(new Date(submission.submitted_at))}</span>
                            </div>
                            <button
                              className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700"
                              onClick={() => {
                                setGradingSubmission(submission);
                                setGradeValue('');
                                setFeedbackValue('');
                              }}
                            >Grade</button>
                          </div>
                          <div className="text-xs text-gray-600 mt-1">Status: {submission.status}</div>
                          <div className="text-xs text-gray-600">Points: {submission.points ?? 'Not graded'} / {assignment.max_points}</div>
                          {submission.feedback && <div className="text-xs text-blue-600 italic">Feedback: {submission.feedback}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Grading Modal */}
            {gradingSubmission && (
              <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
                <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
                  <h3 className="text-lg font-semibold mb-2">Grade Submission</h3>
                  <p className="mb-2">Assignment: <b>{gradingSubmission.assignment.title}</b></p>
                  <p className="mb-2">Student: {gradingSubmission.profiles?.name || 'Unknown'}</p>
                  <label className="block mb-2">
                    Points:
                    <input
                      type="number"
                      className="border px-2 py-1 rounded w-full mt-1"
                      value={gradeValue}
                      min={0}
                      max={gradingSubmission.assignment.max_points}
                      onChange={e => setGradeValue(e.target.value)}
                    />
                  </label>
                  <label className="block mb-2">
                    Feedback:
                    <textarea
                      className="border px-2 py-1 rounded w-full mt-1"
                      value={feedbackValue}
                      onChange={e => setFeedbackValue(e.target.value)}
                    />
                  </label>
                  {gradingError && <div className="text-red-600 mb-2">{gradingError}</div>}
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                      onClick={() => setGradingSubmission(null)}
                      disabled={gradingLoading}
                    >Cancel</button>
                    <button
                      className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                      onClick={handleGradeSubmission}
                      disabled={gradingLoading || !gradeValue}
                    >{gradingLoading ? 'Grading...' : 'Submit Grade'}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'grades':
        return <GradesManager />;
      case 'attendance':
        return <AttendanceManager />;
      default:
        return (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900">{students.length}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Quizzes</p>
                  <p className="text-2xl font-bold text-gray-900">{publishedQuizzes.length}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <BookOpen className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Assignments</p>
                  <p className="text-2xl font-bold text-gray-900">{publishedAssignments.length}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Reviews</p>
                  <p className="text-2xl font-bold text-gray-900">-</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="flex flex-wrap gap-4">
                <button onClick={() => setActiveTab('quizzes')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create Quiz</button>
                <button onClick={() => setActiveTab('assignments')} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Create Assignment</button>
                <button onClick={() => setActiveTab('grades')} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">View Grades</button>
                <button onClick={() => setActiveTab('attendance')} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">Take Attendance</button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Quizzes</h3>
                <div className="space-y-3">
                  {publishedQuizzes.slice(0, 3).map((quiz: any) => (
                    <div key={quiz.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{quiz.title}</p>
                        <p className="text-sm text-gray-600">Due: {quiz.due_date ? formatDate(new Date(quiz.due_date)) : 'N/A'}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {quiz.questions?.length || 0} questions
                        </span>
                      </div>
                    </div>
                  ))}
                  {publishedQuizzes.length === 0 && <p className="text-gray-500">No quizzes found.</p>}
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Assignments</h3>
                <div className="space-y-3">
                  {publishedAssignments.slice(0, 3).map((assignment: any) => (
                    <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{assignment.title}</p>
                        <p className="text-sm text-gray-600">Due: {assignment.due_date ? formatDate(new Date(assignment.due_date)) : 'N/A'}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          {assignment.max_points} pts
                        </span>
                      </div>
                    </div>
                  ))}
                  {publishedAssignments.length === 0 && <p className="text-gray-500">No assignments found.</p>}
                </div>
              </div>
            </div>

            {/* Google Meet Section */}
            <div className="my-4 p-4 border rounded bg-gray-50">
              <h2 className="font-semibold mb-4">Google Meet</h2>
              <div className="space-y-4">
                <button
                  className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                  onClick={handleCreateMeet}
                  disabled={creatingMeet}
                >
                  {creatingMeet ? 'Creating Meeting...' : 'Create New Meeting'}
                </button>

                {meetLink && (
                  <div className="bg-white p-4 rounded border">
                    <p className="text-sm text-gray-600 mb-2">Current Meeting Link:</p>
                    <div className="flex items-center gap-2">
                      <a
                        href={meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex-1 truncate"
                      >
                        {meetLink}
                      </a>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(meetLink);
                          alert('Link copied to clipboard!');
                        }}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: CheckCircle },
    { id: 'quizzes', label: 'Quizzes', icon: FileText },
    { id: 'assignmentManagement', label: 'Assignment Management', icon: BookOpen },
    { id: 'assignments', label: 'Submitted Assignments', icon: CheckCircle },
    { id: 'grades', label: 'Grades', icon: CheckCircle },
    { id: 'attendance', label: 'Attendance', icon: Users }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-4 border-blue-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded-lg">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
          <p className="mt-2 text-gray-600"></p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab: any) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        {renderContent()}
      </div>
    </div>
  );
};

export default TeacherDashboard;