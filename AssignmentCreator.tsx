import React, { useState, useEffect } from 'react';
import { Plus, Save, Eye, Calendar, FileText } from 'lucide-react';
import { Assignment } from '../../types';
import { formatDate } from '../../utils/storage';
import { assignmentService } from '../../services/assignmentService';
import { useAuth } from '../../hooks/useAuth';

const AssignmentCreator: React.FC = () => {
  const { user } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showViewMode, setShowViewMode] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentAssignment, setCurrentAssignment] = useState<Partial<Assignment>>({
    title: '',
    description: '',
    due_date: new Date().toISOString(),
    max_points: 100,
    status: 'draft',
  });

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await assignmentService.getAssignments();
      setAssignments(data || []);
    } catch (err: any) {
      setError('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const saveAssignment = async () => {
    if (!currentAssignment.title || !currentAssignment.due_date || !user?.id) return;
    try {
      await assignmentService.createAssignment({
        title: currentAssignment.title,
        description: currentAssignment.description || '',
        due_date: currentAssignment.due_date,
        max_points: currentAssignment.max_points || 100,
        status: 'published',
        created_by: user.id,
      });
      setShowCreateForm(false);
      setCurrentAssignment({
        title: '',
        description: '',
        due_date: new Date().toISOString(),
        max_points: 100,
        status: 'draft',
      });
      fetchAssignments();
    } catch (err: any) {
      setError('Failed to create assignment');
    }
  };

  // CRUD: View Assignment
  const handleViewAssignment = async (assignmentId: string) => {
    try {
      const assignment = await assignmentService.getAssignment(assignmentId);
      setCurrentAssignment(assignment);
      setShowViewMode(true);
    } catch (err) {
      setError('Failed to load assignment details');
    }
  };

  // CRUD: Edit Assignment
  const [isEditing, setIsEditing] = useState(false);
  const handleEditAssignment = async (assignmentId: string) => {
    try {
      const assignment = await assignmentService.getAssignment(assignmentId);
      setCurrentAssignment(assignment);
      setShowCreateForm(true);
      setIsEditing(true);
    } catch (err) {
      setError('Failed to load assignment for editing');
    }
  };

  // CRUD: Update Assignment
  const updateAssignment = async () => {
    if (!currentAssignment.id || !currentAssignment.title || !currentAssignment.due_date || !user?.id) return;
    try {
      await assignmentService.updateAssignment(currentAssignment.id, {
        title: currentAssignment.title,
        description: currentAssignment.description || '',
        due_date: currentAssignment.due_date,
        max_points: currentAssignment.max_points || 100,
        status: currentAssignment.status || 'published',
        created_by: user.id,
      });
      setShowCreateForm(false);
      setCurrentAssignment({
        title: '',
        description: '',
        due_date: new Date().toISOString(),
        max_points: 100,
        status: 'draft',
      });
      setIsEditing(false);
      fetchAssignments();
    } catch (err) {
      setError('Failed to update assignment');
    }
  };

  // CRUD: Delete Assignment
  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) return;
    try {
      await assignmentService.deleteAssignment(assignmentId);
      fetchAssignments();
    } catch (err) {
      setError('Failed to delete assignment');
    }
  };

  if (showViewMode) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Assignment Details</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setShowViewMode(false);
                setCurrentAssignment({
                  title: '',
                  description: '',
                  due_date: new Date().toISOString(),
                  max_points: 100,
                  status: 'draft',
                });
                fetchAssignments();
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{currentAssignment.title}</h3>
            <p className="text-gray-600 mt-1">{currentAssignment.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-500">Due Date</span>
              <p className="font-medium">{formatDate(new Date(currentAssignment.due_date!))}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Maximum Points</span>
              <p className="font-medium">{currentAssignment.max_points}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Status</span>
              <p className="font-medium capitalize">{currentAssignment.status}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showCreateForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">{isEditing ? 'Edit Assignment' : 'Create New Assignment'}</h2>
          <button
            onClick={() => setShowCreateForm(false)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Title</label>
              <input
                type="text"
                value={currentAssignment.title}
                onChange={(e) => setCurrentAssignment({ ...currentAssignment, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter assignment title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
              <input
                type="date"
                value={currentAssignment.due_date ? currentAssignment.due_date.split('T')[0] : ''}
                onChange={(e) => setCurrentAssignment({ ...currentAssignment, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description & Instructions</label>
            <textarea
              value={currentAssignment.description}
              onChange={(e) => setCurrentAssignment({ ...currentAssignment, description: e.target.value })}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Provide detailed instructions for the assignment..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Points</label>
            <input
              type="number"
              value={currentAssignment.max_points}
              onChange={(e) => setCurrentAssignment({ ...currentAssignment, max_points: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-4">
            <button
              onClick={() => setCurrentAssignment({ ...currentAssignment, status: 'draft' })}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Save as Draft
            </button>
            {isEditing ? (
              <button
                onClick={updateAssignment}
                className="flex items-center space-x-2 px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>Update Assignment</span>
              </button>
            ) : (
              <button
                onClick={saveAssignment}
                className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>Publish Assignment</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Assignment Management</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Create Assignment</span>
        </button>
      </div>

      {error && <div className="text-red-600">{error}</div>}
      {loading ? (
        <div>Loading assignments...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 pr-4">{assignment.title}</h3>
                <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${assignment.status === 'published'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
                  }`}>
                  {assignment.status}
                </span>
              </div>

              <p className="text-gray-600 text-sm mb-4 line-clamp-3">{assignment.description}</p>

              <div className="space-y-2 text-sm mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-500">Due Date:</span>
                  </div>
                  <span className="font-medium">{formatDate(new Date(assignment.due_date))}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-500">Points:</span>
                  </div>
                  <span className="font-medium">{assignment.max_points}</span>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                  onClick={() => handleViewAssignment(assignment.id)}
                >
                  <Eye className="h-4 w-4" />
                  <span>View</span>
                </button>
                <button
                  className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  onClick={() => handleEditAssignment(assignment.id)}
                >
                  <span>Edit</span>
                </button>
                <button
                  className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  onClick={() => handleDeleteAssignment(assignment.id)}
                >
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

export default AssignmentCreator;