import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Eye, Edit2 } from 'lucide-react';
import { Quiz, Question } from '../../types';
import { formatDate } from '../../utils/storage';
import { quizService, QuizInsert, QuestionInsert } from '../../services/quizService';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

interface QuizViewerProps {
  quiz: Quiz;
  onClose: () => void;
  onEdit: () => void;
}

const QuizAttemptsViewer: React.FC<{ quizId: string }> = ({ quizId }) => {
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAttempts = async () => {
      try {
        const { data, error } = await supabase
          .from('quiz_attempts')
          .select(`
            *,
            profiles (name, email)
          `)
          .eq('quiz_id', quizId)
          .order('completed_at', { ascending: false });

        if (error) throw error;
        setAttempts(data || []);
      } catch (err: any) {
        setError('Failed to load quiz attempts');
      } finally {
        setLoading(false);
      }
    };

    fetchAttempts();
  }, [quizId]);

  if (loading) return <div className="text-center py-4">Loading attempts...</div>;
  if (error) return <div className="text-center py-4 text-red-600">{error}</div>;

  return (
    <div className="mt-6">
      <h4 className="text-lg font-semibold text-gray-900 mb-4">Quiz Attempts ({attempts.length})</h4>
      <div className="space-y-4">
        {attempts.map((attempt) => (
          <div key={attempt.id} className="p-4 border border-gray-200 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-900">{attempt.profiles?.name}</p>
                <p className="text-sm text-gray-600">{attempt.profiles?.email}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-blue-600">{attempt.score}/{attempt.max_score}</p>
                <p className="text-sm text-gray-600">Time: {attempt.time_spent} minutes</p>
                <p className="text-sm text-gray-600">{formatDate(new Date(attempt.completed_at))}</p>
              </div>
            </div>
          </div>
        ))}
        {attempts.length === 0 && (
          <p className="text-center text-gray-500">No attempts yet</p>
        )}
      </div>
    </div>
  );
};

const QuizViewer: React.FC<QuizViewerProps> = ({ quiz, onClose, onEdit }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Quiz Details</h2>
        <div className="flex space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{quiz.title}</h3>
          <p className="text-gray-600 mt-1">{quiz.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-500">Due Date</span>
            <p className="font-medium">{formatDate(new Date(quiz.due_date))}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Time Limit</span>
            <p className="font-medium">{quiz.time_limit} minutes</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Attempts Allowed</span>
            <p className="font-medium">{quiz.attempts_allowed}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Status</span>
            <p className="font-medium capitalize">{quiz.status}</p>
          </div>
        </div>

        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Questions ({quiz.questions?.length || 0})</h4>
          <div className="space-y-4">
            {quiz.questions?.map((question, index) => (
              <div key={question.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h5 className="font-medium text-gray-900">Question {index + 1}</h5>
                  <span className="text-sm text-gray-500">{question.points} points</span>
                </div>
                <p className="text-gray-700 mb-3">{question.question_text}</p>
                {question.question_type === 'multiple-choice' && question.options && (
                  <div className="space-y-2">
                    {question.options.map((option, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded ${option === question.correct_answer
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-gray-50 text-gray-700'
                          }`}
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                )}
                {question.question_type === 'true-false' && (
                  <div className="p-2 rounded bg-green-50 text-green-700 border border-green-200">
                    Correct Answer: {question.correct_answer === '1' ? 'True' : 'False'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Add QuizAttemptsViewer */}
        <QuizAttemptsViewer quizId={quiz.id} />
      </div>
    </div>
  );
};

const QuizCreator: React.FC = () => {
  const { user } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<Partial<Quiz>>({
    title: '',
    description: '',
    questions: [],
    time_limit: 30,
    attempts_allowed: 1,
    due_date: new Date().toISOString(),
    status: 'draft'
  });

  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question>>({
    question_type: 'multiple-choice',
    question_text: '',
    options: ['', '', '', ''],
    correct_answer: '0',
    points: 10
  });

  const [durationHours, setDurationHours] = useState<number>(0);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await quizService.getQuizzes();
      setQuizzes(data || []);
    } catch (err: any) {
      setError('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    if (currentQuestion.question_text) {
      const newQuestion: Question = {
        id: Date.now().toString(),
        quiz_id: '', // Will be set when saving to DB
        order_index: (currentQuiz.questions?.length || 0),
        created_at: new Date().toISOString(),
        question_type: currentQuestion.question_type as Question['question_type'],
        question_text: currentQuestion.question_text ?? '',
        options: currentQuestion.question_type === 'multiple-choice' ? currentQuestion.options : undefined,
        correct_answer: currentQuestion.correct_answer!,
        points: currentQuestion.points || 10
      };

      setCurrentQuiz({
        ...currentQuiz,
        questions: [...(currentQuiz.questions || []), newQuestion]
      });

      setCurrentQuestion({
        question_type: 'multiple-choice',
        question_text: '',
        options: ['', '', '', ''],
        correct_answer: '0',
        points: 10
      });
    }
  };

  const removeQuestion = (index: number) => {
    const updatedQuestions = currentQuiz.questions?.filter((_, i) => i !== index);
    setCurrentQuiz({ ...currentQuiz, questions: updatedQuestions });
  };

  const startEditingQuestion = (index: number) => {
    const question = currentQuiz.questions?.[index];
    if (question) {
      setCurrentQuestion({
        question_type: question.question_type,
        question_text: question.question_text || '',
        options: question.options || ['', '', '', ''],
        correct_answer: question.correct_answer || '0',
        points: question.points || 10
      });
      setEditingQuestionIndex(index);
    }
  };

  const saveQuestionEdit = () => {
    if (editingQuestionIndex === null || !currentQuiz.questions) return;

    const updatedQuestions = [...currentQuiz.questions];
    updatedQuestions[editingQuestionIndex] = {
      ...updatedQuestions[editingQuestionIndex],
      question_type: currentQuestion.question_type as Question['question_type'],
      question_text: currentQuestion.question_text || '',
      options: currentQuestion.question_type === 'multiple-choice' ? currentQuestion.options : undefined,
      correct_answer: currentQuestion.correct_answer || '',
      points: currentQuestion.points || 0
    };

    setCurrentQuiz({
      ...currentQuiz,
      questions: updatedQuestions
    });

    // Reset editing state
    setCurrentQuestion({
      question_type: 'multiple-choice',
      question_text: '',
      options: ['', '', '', ''],
      correct_answer: '0',
      points: 10
    });
    setEditingQuestionIndex(null);
  };

  const cancelQuestionEdit = () => {
    setCurrentQuestion({
      question_type: 'multiple-choice',
      question_text: '',
      options: ['', '', '', ''],
      correct_answer: '0',
      points: 10
    });
    setEditingQuestionIndex(null);
  };

  const saveQuiz = async () => {
    if (!currentQuiz.title || !currentQuiz.due_date || !user?.id || !currentQuiz.questions?.length) {
      setError('Please fill all required fields and add at least one question.');
      return;
    }
    setError(null);
    try {
      if (isEditing && currentQuiz.id) {
        // Update existing quiz
        const quizPayload: Partial<Quiz> = {
          title: currentQuiz.title!,
          description: currentQuiz.description || '',
          due_date: currentQuiz.due_date,
          time_limit: (durationHours * 60) + (currentQuiz.time_limit || 0),
          attempts_allowed: currentQuiz.attempts_allowed || 1,
          status: currentQuiz.status || 'published',
          updated_at: new Date().toISOString(),
        };
        await quizService.updateQuiz(currentQuiz.id, quizPayload);
        // Remove all old questions and add new ones (simple approach)
        await quizService.deleteQuestionsByQuizId(currentQuiz.id);
        const questionsPayload: QuestionInsert[] = (currentQuiz.questions || []).map((q: any, idx: number) => ({
          quiz_id: currentQuiz.id as string,
          question_type: q.question_type,
          question_text: q.question_text,
          options: q.question_type === 'multiple-choice' ? q.options : null,
          correct_answer: q.correct_answer?.toString() ?? '',
          points: q.points || 10,
          order_index: idx,
          created_at: new Date().toISOString(),
        }));
        await quizService.addQuestions(currentQuiz.id, questionsPayload);
      } else {
        // Create new quiz
        const quizPayload: QuizInsert = {
          title: currentQuiz.title!,
          description: currentQuiz.description || '',
          created_by: user.id,
          due_date: currentQuiz.due_date,
          time_limit: (durationHours * 60) + (currentQuiz.time_limit || 0),
          attempts_allowed: currentQuiz.attempts_allowed || 1,
          status: 'published',
          updated_at: new Date().toISOString(),
        };
        const quiz = await quizService.createQuiz(quizPayload);
        if (!quiz || !quiz.id) {
          throw new Error('Failed to create quiz. Please check the payload and try again.');
        }
        const questionsPayload: QuestionInsert[] = (currentQuiz.questions || []).map((q: any, idx: number) => ({
          quiz_id: quiz.id,
          question_type: q.question_type,
          question_text: q.question_text,
          options: q.question_type === 'multiple-choice' ? q.options : null,
          correct_answer: q.correct_answer?.toString() ?? '',
          points: q.points || 10,
          order_index: idx,
          created_at: new Date().toISOString(),
        }));
        await quizService.addQuestions(quiz.id, questionsPayload);
      }
      setShowCreateForm(false);
      setCurrentQuiz({
        title: '',
        description: '',
        questions: [],
        time_limit: 30,
        attempts_allowed: 1,
        due_date: new Date().toISOString(),
        status: 'draft',
      });
      setIsEditing(false);
      fetchQuizzes();
    } catch (err: any) {
      console.error('Error saving quiz:', err);
      setError(isEditing ? 'Failed to update quiz' : 'Failed to create quiz');
    }
  };

  const handleViewQuiz = async (quizId: string) => {
    try {
      const quizData = await quizService.getQuiz(quizId);
      setSelectedQuiz(quizData);
    } catch (err) {
      console.error('Error loading quiz:', err);
      setError('Failed to load quiz details');
    }
  };

  const handleEditQuiz = async (quizId: string) => {
    try {
      const quizData = await quizService.getQuiz(quizId);
      setCurrentQuiz(quizData);
      setIsEditing(true);
      setShowCreateForm(true);
    } catch (err) {
      console.error('Error loading quiz:', err);
      setError('Failed to load quiz for editing');
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!window.confirm('Are you sure you want to delete this quiz?')) return;
    try {
      await quizService.deleteQuiz(quizId);
      fetchQuizzes();
    } catch (err) {
      setError('Failed to delete quiz');
    }
  };

  if (selectedQuiz) {
    return (
      <QuizViewer
        quiz={selectedQuiz}
        onClose={() => setSelectedQuiz(null)}
        onEdit={() => handleEditQuiz(selectedQuiz.id)}
      />
    );
  }

  if (showCreateForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Create New Quiz</h2>
          <button
            onClick={() => setShowCreateForm(false)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
          {/* Quiz Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quiz Title</label>
              <input
                type="text"
                value={currentQuiz.title}
                onChange={(e) => setCurrentQuiz({ ...currentQuiz, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter quiz title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
              <input
                type="date"
                value={currentQuiz.due_date?.split('T')[0] || ''}
                onChange={(e) => setCurrentQuiz({ ...currentQuiz, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={currentQuiz.description}
              onChange={(e) => setCurrentQuiz({ ...currentQuiz, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter quiz description"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Limit (minutes)</label>
              <input
                type="number"
                min="1"
                max="120"
                value={currentQuiz.time_limit}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (value >= 1 && value <= 120) {
                    setCurrentQuiz({ ...currentQuiz, time_limit: value });
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Duration (hours)</label>
              <input
                type="number"
                min="0"
                max="24"
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">Set to 0 for no limit</p>
            </div>
          </div>
        </div>

        {/* Question Editor - Only show one form at a time */}
        {editingQuestionIndex !== null ? (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Edit Question</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Question Type</label>
                <select
                  value={currentQuestion.question_type}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, question_type: e.target.value as Question['question_type'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="multiple-choice">Multiple Choice</option>
                  <option value="true-false">True/False</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Points</label>
                <input
                  type="number"
                  value={currentQuestion.points}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Question</label>
              <textarea
                value={currentQuestion.question_text}
                onChange={(e) => setCurrentQuestion({ ...currentQuestion, question_text: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your question"
              />
            </div>

            {currentQuestion.question_type === 'multiple-choice' && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Answer Options</label>
                {currentQuestion.options?.map((option, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={currentQuestion.correct_answer === option}
                      onChange={() => setCurrentQuestion({ ...currentQuestion, correct_answer: option })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...(currentQuestion.options || [])];
                        newOptions[index] = e.target.value;
                        // If the correct answer was this option, update correct_answer to new value
                        let newCorrect = currentQuestion.correct_answer;
                        if (currentQuestion.correct_answer === option) {
                          newCorrect = e.target.value;
                        }
                        setCurrentQuestion({ ...currentQuestion, options: newOptions, correct_answer: newCorrect });
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`Option ${index + 1}`}
                    />
                  </div>
                ))}
              </div>
            )}

            {currentQuestion.question_type === 'true-false' && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Correct Answer</label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="trueFalse"
                      checked={currentQuestion.correct_answer === '1'}
                      onChange={() => setCurrentQuestion({ ...currentQuestion, correct_answer: '1' })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2">True</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="trueFalse"
                      checked={currentQuestion.correct_answer === '0'}
                      onChange={() => setCurrentQuestion({ ...currentQuestion, correct_answer: '0' })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2">False</span>
                  </label>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-4">
              <button
                onClick={cancelQuestionEdit}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveQuestionEdit}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Add Question</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Question Type</label>
                <select
                  value={currentQuestion.question_type}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, question_type: e.target.value as Question['question_type'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="multiple-choice">Multiple Choice</option>
                  <option value="true-false">True/False</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Points</label>
                <input
                  type="number"
                  value={currentQuestion.points}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Question</label>
              <textarea
                value={currentQuestion.question_text}
                onChange={(e) => setCurrentQuestion({ ...currentQuestion, question_text: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your question"
              />
            </div>

            {currentQuestion.question_type === 'multiple-choice' && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Answer Options</label>
                {currentQuestion.options?.map((option, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={currentQuestion.correct_answer === option}
                      onChange={() => setCurrentQuestion({ ...currentQuestion, correct_answer: option })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...(currentQuestion.options || [])];
                        newOptions[index] = e.target.value;
                        // If the correct answer was this option, update correct_answer to new value
                        let newCorrect = currentQuestion.correct_answer;
                        if (currentQuestion.correct_answer === option) {
                          newCorrect = e.target.value;
                        }
                        setCurrentQuestion({ ...currentQuestion, options: newOptions, correct_answer: newCorrect });
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`Option ${index + 1}`}
                    />
                  </div>
                ))}
              </div>
            )}

            {currentQuestion.question_type === 'true-false' && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Correct Answer</label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="trueFalse"
                      checked={currentQuestion.correct_answer === '1'}
                      onChange={() => setCurrentQuestion({ ...currentQuestion, correct_answer: '1' })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2">True</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="trueFalse"
                      checked={currentQuestion.correct_answer === '0'}
                      onChange={() => setCurrentQuestion({ ...currentQuestion, correct_answer: '0' })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2">False</span>
                  </label>
                </div>
              </div>
            )}

            <button
              onClick={addQuestion}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Question</span>
            </button>
          </div>
        )}

        {/* Questions List */}
        {currentQuiz.questions && currentQuiz.questions.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Questions ({currentQuiz.questions.length})</h3>
            <div className="space-y-4">
              {currentQuiz.questions.map((question, index) => (
                <div key={question.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{question.question_text}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Type: {question.question_type} • Points: {question.points}
                      </p>
                      {question.question_type === 'multiple-choice' && question.options && (
                        <div className="mt-2 space-y-1">
                          {question.options.map((option, idx) => (
                            <div
                              key={idx}
                              className={`text-sm ${option === question.correct_answer
                                ? 'text-green-600 font-medium'
                                : 'text-gray-600'
                                }`}
                            >
                              {option}
                              {option === question.correct_answer && ' ✓'}
                            </div>
                          ))}
                        </div>
                      )}
                      {question.question_type === 'true-false' && (
                        <div className="mt-2 text-sm text-green-600 font-medium">
                          Correct Answer: {question.correct_answer === '1' ? 'True' : 'False'}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => startEditingQuestion(index)}
                        className="text-blue-500 hover:text-blue-700 transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeQuestion(index)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <button
            onClick={() => setCurrentQuiz({ ...currentQuiz, status: 'draft' })}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Save as Draft
          </button>
          <button
            onClick={saveQuiz}
            className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>Publish Quiz</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Quiz Management</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Create Quiz</span>
        </button>
      </div>
      {error && <div className="text-red-600">{error}</div>}
      {loading ? (
        <div>Loading quizzes...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{quiz.title}</h3>
                <span className={`px-2 py-1 text-xs rounded-full ${quiz.status === 'published'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
                  }`}>
                  {quiz.status}
                </span>
              </div>
              <p className="text-gray-600 text-sm mb-4">{quiz.description}</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Questions:</span>
                  <span className="font-medium">{quiz.questions?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Due Date:</span>
                  <span className="font-medium">{formatDate(new Date(quiz.due_date))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Time Limit:</span>
                  <span className="font-medium">{quiz.time_limit} min</span>
                </div>
              </div>
              <div className="mt-6 flex space-x-2">
                <button
                  onClick={() => handleViewQuiz(quiz.id)}
                  className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  <span>View</span>
                </button>
                <button
                  onClick={() => handleEditQuiz(quiz.id)}
                  className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDeleteQuiz(quiz.id)}
                  className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuizCreator;
