import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { quizService } from '../../services/quizService';
import { gradeService } from '../../services/gradeService';
import { Quiz } from '../../types';

interface QuizTakerProps {
  quizId: string;
  onBack: () => void;
}

const QuizTaker: React.FC<QuizTakerProps> = ({ quizId, onBack }) => {
  const { user } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [questionId: string]: string | number }>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);

  const calculateScore = () => {
    if (!quiz?.questions) return { score: 0, maxScore: 0 };
    let totalScore = 0;
    let maxScore = 0;

    quiz.questions.forEach(question => {
      const userAnswer = answers[question.id];
      let isCorrect = false;

      if (question.question_type === 'multiple-choice') {
        const correctAnswer = String(question.correct_answer).trim();
        const userAnswerStr = String(userAnswer).trim();
        isCorrect = userAnswerStr === correctAnswer;
      } else if (question.question_type === 'true-false') {
        const correct = question.correct_answer === '1';
        const userAnswerStr = String(userAnswer).toLowerCase();
        const isTrue = userAnswerStr === '1' || userAnswerStr === 'true';
        const isFalse = userAnswerStr === '0' || userAnswerStr === 'false';
        isCorrect = (correct && isTrue) || (!correct && isFalse);
      }

      if (isCorrect) {
        totalScore += question.points;
      }
      maxScore += question.points;
    });

    return { score: totalScore, maxScore };
  };

  const submitQuiz = async () => {
    if (!quiz || !user?.id) return;

    try {
      setIsSubmitted(true);
      const { score, maxScore } = calculateScore();
      const timeSpent = (quiz.time_limit || 0) * 60 - timeLeft;

      const existingAttempts = await quizService.getStudentAttempts(quizId);
      const hasAttempted = existingAttempts.some(a => a.student_id === user.id);

      if (hasAttempted) {
        setError('You have already taken this quiz.');
        return;
      }

      const attemptData = {
        quiz_id: quizId,
        student_id: user.id,
        answers,
        score,
        max_score: maxScore,
        time_spent: timeSpent,
        status: 'pending'
      };

      const newAttempt = await quizService.submitQuizAttempt(attemptData);

      await gradeService.upsertGrade({
        student_id: user.id,
        quiz_attempt_id: newAttempt.id,
        graded_by: user.id
      });

      setScore(score);
      setTimeSpent(timeSpent);
    } catch (err) {
      setError('Failed to submit quiz. Please try again.');
      console.error('Error submitting quiz:', err);
    }
  };

  useEffect(() => {
    const fetchQuizData = async () => {
      try {
        const quizData = await quizService.getQuiz(quizId);
        const attempts = await quizService.getStudentAttempts(quizId);
        const studentAttempts = attempts.filter(attempt => attempt.student_id === user?.id);

        if (studentAttempts.length > 0) {
          const lastAttempt = studentAttempts[0];
          setScore(lastAttempt.score);
          setTimeSpent(lastAttempt.time_spent);
          setAnswers(lastAttempt.answers);
          setIsSubmitted(true);
          setQuiz(quizData);
          setLoading(false);
          return;
        }

        setQuiz(quizData);
        if (quizData.time_limit) {
          setTimeLeft(quizData.time_limit * 60);
        }
      } catch (err) {
        setError('Failed to load quiz. Please try again.');
        console.error('Error loading quiz:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchQuizData();
    }
  }, [quizId, user?.id]);

  useEffect(() => {
    if (timeLeft > 0 && !isSubmitted) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !isSubmitted) {
      submitQuiz();
    }
  }, [timeLeft, isSubmitted]);

  const currentQuestion = quiz?.questions?.[currentQuestionIndex];
  const totalQuestions = quiz?.questions?.length || 0;

  const handleAnswerChange = (value: string | number) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion?.id || '']: value
    }));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-600">Loading quiz...</div>;
  }

  if (error || !quiz) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error || 'Quiz not found.'}</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">
          Go Back
        </button>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Quiz Results</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Your Score:</span>
              <span className="text-2xl font-bold text-blue-600">{score}/{quiz.questions?.reduce((sum, q) => sum + q.points, 0) || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Time Spent:</span>
              <span className="text-gray-900">{timeSpent} minutes</span>
            </div>
          </div>
          <button
            onClick={onBack}
            className="mt-6 w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{quiz.title}</h2>
            <p className="text-gray-600">{quiz.description}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Time Remaining</div>
            <div className="text-xl font-bold text-blue-600">{formatTime(timeLeft)}</div>
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div
            className="bg-blue-600 h-2 rounded-full"
            style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>

        {currentQuestion && (
          <div className="space-y-6">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
              <span>{currentQuestion.points} points</span>
            </div>
            <p className="text-lg font-medium text-gray-900">{currentQuestion.question_text}</p>

            {currentQuestion.question_type === 'multiple-choice' && currentQuestion.options && (
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => (
                  <label
                    key={index}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={option}
                      checked={answers[currentQuestion.id] === option}
                      onChange={() => handleAnswerChange(option)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="text-gray-900">{option}</span>
                  </label>
                ))}
              </div>
            )}

            {currentQuestion.question_type === 'true-false' && (
              <div className="space-y-3">
                {['True', 'False'].map((option) => (
                  <label
                    key={option}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={option}
                      checked={answers[currentQuestion.id] === option}
                      onChange={() => handleAnswerChange(option)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="text-gray-900">{option}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between mt-8">
          <button
            onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
            disabled={currentQuestionIndex === 0}
            className={`px-4 py-2 rounded-lg ${currentQuestionIndex === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Previous
          </button>

          {currentQuestionIndex === totalQuestions - 1 ? (
            <button
              onClick={submitQuiz}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Submit Quiz
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizTaker;
