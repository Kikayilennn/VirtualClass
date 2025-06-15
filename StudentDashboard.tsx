import React, { useState, useEffect } from "react";
import {
  BookOpen,
  FileText,
  Clock,
  Award,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Video,
  Users,
} from "lucide-react";
import QuizTaker from "./QuizTaker";
import AssignmentViewer from "./AssignmentViewer";
import { useAuth } from "../../context/AuthContext";
import { formatDate, calculateGrade } from "../../utils/storage";
import { quizService } from "../../services/quizService";
import { assignmentService } from "../../services/assignmentService";
import { gradeService } from "../../services/gradeService";
import { meetService } from "../../services/meetService";
import { attendanceService } from "../../services/attendanceService";
import { onlineClassService } from "../../services/onlineClassService";

const StudentDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(
    null
  );
  const { user, profile } = useAuth();

  // State for live data
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<any[]>([]);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meetLink, setMeetLink] = useState<string | null>(null);
  const [meetLoading, setMeetLoading] = useState(true);
  const [meetError, setMeetError] = useState<string | null>(null);
  const [refreshingMeet, setRefreshingMeet] = useState(false);
  const [userAttendance, setUserAttendance] = useState<any[]>([]);
  const [ongoingClass, setOngoingClass] = useState<any | null>(null);
  const [upcomingClasses, setUpcomingClasses] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      setLoading(true);
      setError(null);
      try {
        const [
          quizData,
          assignmentData,
          gradeData,
          attemptData,
          submissionData,
        ] = await Promise.all([
          quizService.getQuizzes(),
          assignmentService.getAssignments(),
          gradeService.getStudentGrades(user.id),
          quizService.getAllStudentAttempts(user.id), // FIX: fetch all attempts for this student
          assignmentService.getStudentSubmissions(user.id),
        ]);
        setQuizzes(
          (quizData || []).filter((q: any) => q.status === "published")
        );
        setAssignments(
          (assignmentData || []).filter((a: any) => a.status === "published")
        );
        setGrades(gradeData || []);
        setQuizAttempts(attemptData || []);
        setAssignmentSubmissions(submissionData || []);
      } catch (err: any) {
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  useEffect(() => {
    const fetchMeet = async () => {
      setMeetLoading(true);
      setMeetError(null);
      try {
        const meet = await meetService.getMeetLink();
        setMeetLink(meet);
      } catch (err) {
        setMeetError("Failed to load meeting link");
      } finally {
        setMeetLoading(false);
      }
    };
    fetchMeet();
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const fetchStudentData = async () => {
      try {
        const attendance = await attendanceService.getStudentAttendance(
          user.id
        );
        setUserAttendance(attendance || []);
        const ongoing = await onlineClassService.getOngoingClass();
        setOngoingClass(ongoing || null);
        const upcoming = await onlineClassService.getUpcomingClasses();
        setUpcomingClasses(upcoming || []);
      } catch (err) {
        // Optionally handle error
      }
    };
    fetchStudentData();
  }, [user?.id]);

  // Auto-refresh dashboard data every 5 seconds
  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(() => {
      const fetchData = async () => {
        try {
          const [
            quizData,
            assignmentData,
            gradeData,
            attemptData,
            submissionData,
          ] = await Promise.all([
            quizService.getQuizzes(),
            assignmentService.getAssignments(),
            gradeService.getStudentGrades(user.id),
            quizService.getAllStudentAttempts(user.id),
            assignmentService.getStudentSubmissions(user.id),
          ]);
          setQuizzes(
            (quizData || []).filter((q: any) => q.status === "published")
          );
          setAssignments(
            (assignmentData || []).filter((a: any) => a.status === "published")
          );
          setGrades(gradeData || []);
          setQuizAttempts(attemptData || []);
          setAssignmentSubmissions(submissionData || []);
        } catch (err: any) {
          // Optionally handle error
        }
      };
      fetchData();
    }, 5000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // Helper functions
  const userGrades = grades;
  const userQuizAttempts = quizAttempts;
  const publishedQuizzes = quizzes;
  const publishedAssignments = assignments;
  const calculateOverallGrade = () => {
    if (grades.length === 0) return 0;
    const totalPoints = grades.reduce(
      (sum: number, grade: any) => sum + (grade.points || 0),
      0
    );
    const totalMaxPoints = grades.reduce(
      (sum: number, grade: any) => sum + (grade.max_points || 0),
      0
    );
    return totalMaxPoints > 0 ? (totalPoints / totalMaxPoints) * 100 : 0;
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: TrendingUp },
    { id: "quizzes", label: "Quizzes", icon: FileText },
    { id: "assignments", label: "Assignments", icon: BookOpen },
    { id: "submitted", label: "Submitted", icon: CheckCircle },
    { id: "grades", label: "My Grades", icon: Award },
    { id: "attendance", label: "Attendance", icon: Users },
  ];

  const getStatusColor = (status: "present" | "absent" | "late") => {
    switch (status) {
      case "present":
        return "text-green-600";
      case "absent":
        return "text-red-600";
      case "late":
        return "text-yellow-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusIcon = (status: "present" | "absent" | "late") => {
    switch (status) {
      case "present":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "absent":
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case "late":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return null;
    }
  };

  const refreshMeetLink = async () => {
    setRefreshingMeet(true);
    setMeetError(null);
    try {
      const meet = await meetService.getMeetLink();
      setMeetLink(meet);
    } catch (err: any) {
      setMeetError("Failed to load meeting link");
    } finally {
      setRefreshingMeet(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="text-center py-12 text-gray-600">
          Loading dashboard...
        </div>
      );
    }
    if (error) {
      return <div className="text-center py-12 text-red-600">{error}</div>;
    }
    if (selectedQuiz) {
      return (
        <QuizTaker quizId={selectedQuiz} onBack={() => setSelectedQuiz(null)} />
      );
    }
    if (selectedAssignment) {
      return (
        <AssignmentViewer
          assignmentId={selectedAssignment}
          onBack={() => setSelectedAssignment(null)}
        />
      );
    }

    switch (activeTab) {
      case "attendance":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Attendance Record
            </h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Recent Attendance
                </h3>
              </div>
              <div className="divide-y divide-gray-200">
                {userAttendance.map((record) => (
                  <div
                    key={record.id}
                    className="px-6 py-4 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(record.status)}
                      <div>
                        <p className="font-medium text-gray-900">
                          {formatDate(new Date(record.date))}
                        </p>
                        {record.notes && (
                          <p className="text-sm text-gray-600">
                            {record.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <span
                      className={`font-medium ${getStatusColor(record.status)}`}
                    >
                      {record.status.charAt(0).toUpperCase() +
                        record.status.slice(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "quizzes":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Available Quizzes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publishedQuizzes
                .filter(
                  (quiz) =>
                    !userQuizAttempts.find((a: any) => a.quiz_id === quiz.id)
                )
                .map((quiz) => {
                  const attempt = userQuizAttempts.find(
                    (a: any) => a.quiz_id === quiz.id
                  );
                  const isCompleted = !!attempt;
                  const daysUntilDue = Math.ceil(
                    (new Date(quiz.due_date).getTime() - new Date().getTime()) /
                      (1000 * 60 * 60 * 24)
                  );
                  return (
                    <div
                      key={`quiz-${quiz.id}`}
                      className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {quiz.title}
                        </h3>
                        {isCompleted ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : daysUntilDue <= 3 ? (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-500" />
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mb-4">
                        {quiz.description}
                      </p>
                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Questions:</span>
                          <span className="font-medium">
                            {quiz.questions?.length || 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Time Limit:</span>
                          <span className="font-medium">
                            {quiz.time_limit} min
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Due Date:</span>
                          <span className="font-medium">
                            {formatDate(new Date(quiz.due_date))}
                          </span>
                        </div>
                        {isCompleted && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Score:</span>
                            <span className="font-medium text-green-600">
                              {attempt?.score}/
                              {quiz.questions?.reduce(
                                (sum: number, q: any) => sum + (q.points || 0),
                                0
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                      {isCompleted ? (
                        <div className="w-full py-2 px-4 bg-green-50 text-green-700 rounded-lg text-center font-semibold border border-green-200">
                          Score: {attempt?.score}/
                          {quiz.questions?.reduce(
                            (sum: number, q: any) => sum + (q.points || 0),
                            0
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedQuiz(quiz.id)}
                          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Take Quiz
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        );

      case "assignments":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Assignments</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {publishedAssignments.map((assignment) => {
                const submission = assignmentSubmissions.find(
                  (s: any) => s.assignment_id === assignment.id
                );
                const daysUntilDue = Math.ceil(
                  (new Date(assignment.due_date).getTime() -
                    new Date().getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                return (
                  <div
                    key={`assignment-${assignment.id}`}
                    className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {assignment.title}
                      </h3>
                      {daysUntilDue <= 3 ? (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <Clock className="h-5 w-5 text-blue-500" />
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {assignment.description}
                    </p>
                    <div className="space-y-2 text-sm mb-6">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Due Date:</span>
                        <span className="font-medium">
                          {formatDate(new Date(assignment.due_date))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Points:</span>
                        <span className="font-medium">
                          {assignment.max_points}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Days Left:</span>
                        <span
                          className={`font-medium ${
                            daysUntilDue <= 3 ? "text-red-600" : "text-gray-900"
                          }`}
                        >
                          {daysUntilDue} days
                        </span>
                      </div>
                      {submission && (
                        <div className="flex flex-col mt-2 p-2 bg-gray-50 rounded">
                          <span className="text-green-700 font-semibold">
                            Submitted
                          </span>
                          <span className="text-gray-500 text-xs">
                            Submitted At:{" "}
                            {formatDate(new Date(submission.submitted_at))}
                          </span>
                          <span className="text-gray-500 text-xs">
                            Status: {submission.status}
                          </span>
                          <span className="text-gray-500 text-xs">
                            Recorded Points: {submission.points ?? "Not graded"}{" "}
                            / {assignment.max_points}
                          </span>
                          {submission.feedback && (
                            <span className="text-blue-600 text-xs italic">
                              Feedback: {submission.feedback}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {!submission && (
                      <button
                        onClick={() => setSelectedAssignment(assignment.id)}
                        className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        View Assignment
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );

      case "submitted":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Submitted Work</h2>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Quizzes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {publishedQuizzes
                  .filter((quiz) =>
                    userQuizAttempts.find((a: any) => a.quiz_id === quiz.id)
                  )
                  .map((quiz) => {
                    const attempt = userQuizAttempts.find(
                      (a: any) => a.quiz_id === quiz.id
                    );
                    return (
                      <div
                        key={`quiz-${quiz.id}`}
                        className="bg-white p-6 rounded-xl shadow-sm border border-green-200"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {quiz.title}
                          </h3>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                        <p className="text-gray-600 text-sm mb-4">
                          {quiz.description}
                        </p>
                        <div className="space-y-2 text-sm mb-4">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Score:</span>
                            <span className="font-medium text-green-600">
                              {attempt?.score}/
                              {quiz.questions?.reduce(
                                (sum: number, q: any) => sum + (q.points || 0),
                                0
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Time Taken:</span>
                            <span className="font-medium">
                              {attempt?.time_spent} min
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Assignments
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {publishedAssignments
                  .filter((assignment) =>
                    assignmentSubmissions.find(
                      (s: any) => s.assignment_id === assignment.id
                    )
                  )
                  .map((assignment) => {
                    const submission = assignmentSubmissions.find(
                      (s: any) => s.assignment_id === assignment.id
                    );
                    return (
                      <div
                        key={`assignment-${assignment.id}`}
                        className="bg-white p-6 rounded-xl shadow-sm border border-green-200"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {assignment.title}
                          </h3>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                          {assignment.description}
                        </p>
                        <div className="space-y-2 text-sm mb-4">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Submitted At:</span>
                            <span className="font-medium">
                              {formatDate(new Date(submission?.submitted_at))}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Points:</span>
                            <span className="font-medium">
                              {assignment.max_points}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">
                              Recorded Points:
                            </span>
                            <span className="font-medium text-blue-600">
                              {(() => {
                                // Find grade for this assignment and student
                                const grade = grades.find(
                                  (g: any) => g.assignment_id === assignment.id
                                );
                                return grade
                                  ? `${grade.points} / ${assignment.max_points}`
                                  : "Not graded yet";
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        );

      case "grades":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">My Grades</h2>
            {/* Overall Grade */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Overall Grade
                  </h3>
                  <p className="text-gray-600">Current class average</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-blue-600">
                    {calculateOverallGrade().toFixed(1)}%
                  </div>
                  <div className="text-lg font-medium text-gray-900">
                    {calculateGrade(calculateOverallGrade(), 100)}
                  </div>
                </div>
              </div>
            </div>

            {/* Grades List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Recent Grades
                </h3>
              </div>
              <div className="divide-y divide-gray-200">
                {userGrades.map((grade) => {
                  const assignment = publishedAssignments.find(
                    (a) => a.id === grade.assignment_id
                  );
                  let quiz = null;
                  if (grade.quiz_id) {
                    quiz = publishedQuizzes.find((q) => q.id === grade.quiz_id);
                  } else if (grade.quiz_attempt_id) {
                    const attempt = quizAttempts.find(
                      (a) => a.id === grade.quiz_attempt_id
                    );
                    if (attempt) {
                      quiz = publishedQuizzes.find(
                        (q) => q.id === attempt.quiz_id
                      );
                    }
                  }

                  const itemTitle =
                    assignment?.title || quiz?.title || "Unknown";
                  const percentage = (grade.points / grade.max_points) * 100;

                  return (
                    <div
                      key={grade.id}
                      className="px-6 py-4 flex items-center justify-between"
                    >
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {itemTitle}
                        </h4>
                        <p className="text-sm text-gray-600">
                          Graded on {formatDate(new Date(grade.graded_at))}
                        </p>
                        {grade.feedback && (
                          <p className="text-sm text-gray-600 mt-1 italic">
                            "{grade.feedback}"
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          {grade.points}/{grade.max_points}
                        </div>
                        <div
                          className={`text-sm font-medium ${
                            percentage >= 90
                              ? "text-green-600"
                              : percentage >= 80
                              ? "text-blue-600"
                              : percentage >= 70
                              ? "text-yellow-600"
                              : percentage >= 60
                              ? "text-orange-600"
                              : "text-red-600"
                          }`}
                        >
                          {percentage.toFixed(1)}% (
                          {calculateGrade(percentage, 100)})
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            {/* Online Class Section */}
            {ongoingClass && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Video className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Live Class in Progress
                      </h3>
                      <p className="text-sm text-gray-600">
                        {ongoingClass.title}
                      </p>
                    </div>
                  </div>
                  <a
                    href={ongoingClass.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Join Now
                  </a>
                </div>
                <p className="text-sm text-gray-600">
                  {ongoingClass.description}
                </p>
              </div>
            )}

            {/* Upcoming Classes */}
            {upcomingClasses.length > 0 && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Upcoming Classes
                </h3>
                <div className="space-y-4">
                  {upcomingClasses.map((class_) => (
                    <div
                      key={class_.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <Video className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {class_.title}
                          </p>
                          <p className="text-sm text-gray-600">
                            Starts at {formatDate(new Date(class_.start_time))}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          window.open(class_.meeting_link, "_blank")
                        }
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Join
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BookOpen className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Active Courses
                    </p>
                    <p className="text-2xl font-bold text-gray-900">1</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Completed Quizzes
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {userQuizAttempts.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Award className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Overall Grade
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {calculateGrade(calculateOverallGrade(), 100)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Clock className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Pending Tasks
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {publishedQuizzes.length -
                        userQuizAttempts.length +
                        publishedAssignments.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming Deadlines */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Upcoming Deadlines
              </h3>
              <div className="space-y-3">
                {[...publishedQuizzes, ...publishedAssignments]
                  .sort(
                    (a, b) =>
                      new Date(a.due_date).getTime() -
                      new Date(b.due_date).getTime()
                  )
                  .slice(0, 5)
                  .map((item) => {
                    const isQuiz = "questions" in item;
                    const daysUntilDue = Math.ceil(
                      (new Date(item.due_date).getTime() -
                        new Date().getTime()) /
                        (1000 * 60 * 60 * 24)
                    );

                    return (
                      <div
                        key={`${isQuiz ? "quiz" : "assignment"}-${item.id}`}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          {isQuiz ? (
                            <FileText className="h-5 w-5 text-blue-600" />
                          ) : (
                            <BookOpen className="h-5 w-5 text-green-600" />
                          )}
                          <div>
                            <p className="font-medium text-gray-900">
                              {item.title}
                            </p>
                            <p className="text-sm text-gray-600">
                              {isQuiz ? "Quiz" : "Assignment"} • Due{" "}
                              {formatDate(new Date(item.due_date))}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            daysUntilDue <= 1
                              ? "bg-red-100 text-red-800"
                              : daysUntilDue <= 3
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {daysUntilDue} days left
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Live Google Meet Link */}
            <div className="my-4 p-4 border rounded bg-green-50">
              <h2 className="font-semibold mb-4 flex items-center">
                <span className="mr-2">
                  <Video size={20} />
                </span>
                Live Google Meet
              </h2>
              {meetLoading ? (
                <div className="text-gray-600">Loading meeting link...</div>
              ) : meetLink ? (
                <div className="space-y-2">
                  <a
                    href={meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Join Meeting
                  </a>
                  <p className="text-sm text-gray-600">
                    Click the button above to join the live class
                  </p>
                </div>
              ) : (
                <div className="text-gray-500">
                  No live class available at the moment.
                </div>
              )}
              {meetError && (
                <div className="text-red-600 mt-2">{meetError}</div>
              )}
            </div>
          </div>
        );
    }
  };

  console.log("userQuizAttempts:", userQuizAttempts);
  console.log(
    "publishedQuizzes:",
    publishedQuizzes.map((q) => q.id)
  );
  console.log("quizAttempts:", quizAttempts);
  console.log(
    "publishedQuizzes:",
    publishedQuizzes.map((q) => q.id)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Student Dashboard
          </h1>
          <p className="mt-2 text-gray-600">
            Welcome back, {profile?.name || ""}! Here's what's happening in your
            classes.
          </p>
        </div>

        {/* Tab Navigation */}
        {!selectedQuiz && !selectedAssignment && (
          <div className="border-b border-gray-200 mb-8">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        )}

        {/* Content */}
        {renderContent()}
      </div>
    </div>
  );
};

export default StudentDashboard;
