import React, { useEffect, useState } from 'react';
import { ArrowLeft, Upload, FileText, Calendar, Award, Send } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/storage';
import { assignmentService } from '../../services/assignmentService';
import { gradeService } from '../../services/gradeService';

interface AssignmentViewerProps {
  assignmentId: string;
  onBack: () => void;
}

const AssignmentViewer: React.FC<AssignmentViewerProps> = ({ assignmentId, onBack }) => {
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<any | null>(null);
  const [existingSubmission, setExistingSubmission] = useState<any | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [grade, setGrade] = useState<any | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const a = await assignmentService.getAssignment(assignmentId);
        setAssignment(a);
        if (user?.id) {
          const sub = await assignmentService.getSubmission(assignmentId, user.id);
          setExistingSubmission(sub);
          setSubmissionText(sub?.content || '');
          setIsSubmitted(!!sub);
          const grades = await gradeService.getStudentGrades(user.id);
          const assignmentGrade = grades.find((g: any) => g.assignment_id === assignmentId);
          setGrade(assignmentGrade || null);
        }
      } catch (err) {
        setAssignment(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [assignmentId, user?.id]);

  if (loading) return <div className="text-center py-12">Loading...</div>;
  if (!assignment) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Assignment not found.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">
          Go Back
        </button>
      </div>
    );
  }

  const daysUntilDue = Math.ceil((new Date(assignment.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysUntilDue < 0;

  const handleSubmit = async () => {
    if (!submissionText.trim() || !user?.id) return;
    setIsSubmitting(true);
    try {
      await assignmentService.submitAssignment({
        assignment_id: assignmentId,
        student_id: user.id,
        content: submissionText,
        status: 'pending', // must match allowed values in submissions_status_check
        attachments: [],
      });
      setIsSubmitted(true);
      setExistingSubmission({
        assignment_id: assignmentId,
        student_id: user.id,
        content: submissionText,
        status: 'pending',
        submitted_at: new Date().toISOString(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors mb-4"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{assignment.title}</h1>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>Due: {assignment.due_date ? formatDate(new Date(assignment.due_date)) : 'N/A'}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Award className="h-4 w-4" />
                <span>{assignment.max_points} points</span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${isOverdue
                ? 'bg-red-100 text-red-800'
                : daysUntilDue <= 3
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-green-100 text-green-800'
              }`}>
              {isOverdue ? `${Math.abs(daysUntilDue)} days overdue` : `${daysUntilDue} days left`}
            </div>
            {isSubmitted && (
              <div className="mt-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                Submitted
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assignment Details */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Assignment Instructions</h2>
        <div className="prose max-w-none">
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{assignment.description}</p>
        </div>
      </div>

      {/* Existing Submission (if any) */}
      {existingSubmission && (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Your Submission</h2>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>Submitted: {existingSubmission.submitted_at && !isNaN(new Date(existingSubmission.submitted_at).getTime()) ? formatDate(new Date(existingSubmission.submitted_at)) : 'N/A'}</span>
              {grade ? (
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                  Grade: {grade.points}/{grade.max_points}
                </span>
              ) : (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                  Pending Grade
                </span>
              )}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <p className="text-gray-800 whitespace-pre-wrap">{existingSubmission.content}</p>
          </div>

          {existingSubmission.feedback && (
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-medium text-gray-900 mb-2">Teacher Feedback</h3>
              <p className="text-gray-700 italic">{existingSubmission.feedback}</p>
            </div>
          )}
        </div>
      )}

      {/* Submission Form */}
      {!isSubmitted && (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Submit Your Assignment</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Response
              </label>
              <textarea
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                rows={12}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Type your assignment response here..."
              />
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Drag and drop files here, or click to browse</p>
              <p className="text-sm text-gray-500">Supported formats: PDF, DOC, DOCX, TXT (Max 10MB)</p>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt"
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <FileText className="h-4 w-4 mr-2" />
                Choose Files
              </label>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Make sure to review your work before submitting. You can edit until the due date.
              </p>

              <button
                onClick={handleSubmit}
                disabled={!submissionText.trim() || isSubmitting}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-4 w-4" />
                <span>{isSubmitting ? 'Submitting...' : 'Submit Assignment'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {isSubmitted && !existingSubmission && (
        <div className="bg-green-50 border border-green-200 p-6 rounded-xl">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
              <Send className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium text-green-900">Assignment Submitted Successfully!</h3>
              <p className="text-sm text-green-700 mt-1">
                Your assignment has been submitted and is now available for your teacher to review.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentViewer;