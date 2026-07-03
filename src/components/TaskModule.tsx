import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { ClipboardList, Plus, Trash2, CheckCircle, Clock, CheckSquare, X, Edit, AlertCircle } from 'lucide-react';

export const TaskModule: React.FC = () => {
  const { 
    tasks, 
    profiles, 
    activeUser, 
    addTask, 
    updateTaskStatus,
    updateTask,
    deleteTask
  } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDueDate, setFormDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignedUserId, setAssignedUserId] = useState('');

  // Edit and Delete state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<any | null>(null);

  // Edit fields
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editAssignedUserId, setEditAssignedUserId] = useState('');

  const handleOpenEditTask = (t: any) => {
    setEditingTask(t);
    setEditTitle(t.title);
    setEditDescription(t.description);
    setEditDueDate(t.dueDate);
    setEditAssignedUserId(t.assignedToId || '');
    setShowEditModal(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTitle || !editDescription || !editAssignedUserId) return;

    const userObj = profiles.find(p => p.id === editAssignedUserId);
    if (!userObj) return;

    updateTask(editingTask.id, {
      title: editTitle,
      description: editDescription,
      dueDate: editDueDate,
      assignedToName: userObj.name,
      assignedToId: userObj.id
    });

    setShowEditModal(false);
    setEditingTask(null);
  };

  const handleDeleteTask = (t: any) => {
    setTaskToDelete(t);
    setShowDeleteModal(true);
  };

  const confirmDeleteTask = () => {
    if (!taskToDelete) return;
    deleteTask(taskToDelete.id);
    setShowDeleteModal(false);
    setTaskToDelete(null);
  };

  const isEmployee = activeUser.role === UserRole.EMPLOYEE;

  // Filter tasks: Employees can only see their own assigned tasks. Managers/Admins see all.
  const visibleTasks = isEmployee 
    ? tasks.filter(t => t.assignedToId === activeUser.id) 
    : tasks;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formDescription || !assignedUserId) return;

    const userObj = profiles.find(p => p.id === assignedUserId);
    if (!userObj) return;

    addTask({
      title: formTitle,
      description: formDescription,
      dueDate: formDueDate,
      assignedToName: userObj.name,
      assignedToId: userObj.id
    });

    setShowAddModal(false);
    setFormTitle('');
    setFormDescription('');
    setAssignedUserId('');
  };

  const handleStatusCycle = (taskId: string, currentStatus: string) => {
    let nextStatus: 'Pending' | 'In Progress' | 'Completed' = 'Pending';
    if (currentStatus === 'Pending') nextStatus = 'In Progress';
    else if (currentStatus === 'In Progress') nextStatus = 'Completed';
    else nextStatus = 'Pending';

    updateTaskStatus(taskId, nextStatus);
  };

  return (
    <div className="space-y-4">
      
      {/* Header controls */}
      <div className="glass-panel p-4 rounded-xl flex items-center justify-between border border-brand-border">
        <div>
          <h3 className="text-sm font-bold text-gray-200">Shared Task Manager</h3>
          <p className="text-xs text-gray-500">
            {isEmployee ? 'Review and update your assigned tasks' : 'Create tasks and track employee progress'}
          </p>
        </div>
        {!isEmployee && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 bg-cyan-950 text-cyan-400 hover:bg-cyan-900 border border-cyan-500/30 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Assign Task</span>
          </button>
        )}
      </div>

      {/* Grid of Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleTasks.length === 0 ? (
          <div className="col-span-full glass-panel p-8 text-center text-gray-500">
            No active assignments logged for this scope.
          </div>
        ) : (
          visibleTasks.map((t) => (
            <div key={t.id} className="glass-panel p-5 rounded-xl border border-brand-border flex flex-col justify-between h-48 relative group">
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold ${
                    t.status === 'Completed' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20' :
                    t.status === 'In Progress' ? 'bg-amber-950/40 text-amber-400 border border-amber-500/20' :
                    'bg-gray-950/40 text-gray-400 border border-gray-700'
                  }`}>
                    {t.status}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 font-mono">Due: {t.dueDate}</span>
                    {!isEmployee && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditTask(t)}
                          className="p-1 bg-gray-950 border border-brand-border/60 hover:text-cyan-400 hover:border-cyan-500/20 rounded transition cursor-pointer"
                          title="Edit Task Details"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(t)}
                          className="p-1 bg-gray-950 border border-brand-border/60 hover:text-rose-400 hover:border-rose-500/20 rounded transition cursor-pointer"
                          title="Delete Task"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <h4 className="text-sm font-bold text-gray-200 truncate">{t.title}</h4>
                <p className="text-xs text-gray-400 line-clamp-2">{t.description}</p>
              </div>

              <div className="border-t border-brand-border/60 pt-3 flex items-center justify-between">
                <div className="text-xs text-gray-400">
                  <span className="text-[10px] text-gray-500 block">ASSIGNEE</span>
                  <span className="font-semibold capitalize text-cyan-400 font-mono">{t.assignedToName}</span>
                </div>

                {/* Employees can toggle, Managers/Admins can toggle to monitor */}
                <button
                  onClick={() => handleStatusCycle(t.id, t.status)}
                  className="px-2.5 py-1.5 rounded-lg border border-cyan-500/20 bg-cyan-950/20 text-[10px] font-mono font-bold text-cyan-400 hover:bg-cyan-950 hover:text-cyan-300 transition"
                >
                  Change Status
                </button>
              </div>

            </div>
          ))
        )}
      </div>

      {/* Assign Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md shadow-2xl relative border border-brand-border animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-cyan-400" />
              <span>Assign Corporate Task</span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-gray-400 block mb-1">Task Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Conduct monthly stock take"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 font-sans"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Task Details</label>
                <textarea
                  required
                  placeholder="Provide precise scope and guidelines for this task..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 h-24 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Assign to Employee</label>
                  <select
                    value={assignedUserId}
                    onChange={(e) => setAssignedUserId(e.target.value)}
                    required
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-300 outline-none focus:border-cyan-500/30 font-sans"
                  >
                    <option value="">Choose User...</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.role.split(' ')[0]})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold font-sans rounded-xl text-center shadow-lg transition"
              >
                Assign & Transmit
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditModal && editingTask && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans animate-fade-in">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md shadow-2xl relative border border-brand-border animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => {
                setShowEditModal(false);
                setEditingTask(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-cyan-400" />
              <span>Modify Assigned Task Details</span>
            </h3>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-gray-400 block mb-1">Task Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Conduct monthly stock take"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 font-sans font-bold"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Task Details</label>
                <textarea
                  required
                  placeholder="Provide precise scope and guidelines..."
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 h-24 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Assign to Employee</label>
                  <select
                    value={editAssignedUserId}
                    onChange={(e) => setEditAssignedUserId(e.target.value)}
                    required
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-300 outline-none focus:border-cyan-500/30 font-sans"
                  >
                    <option value="">Choose User...</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.role.split(' ')[0]})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold font-sans rounded-xl text-center shadow-lg transition cursor-pointer"
              >
                Update & Dispatch Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Task Modal */}
      {showDeleteModal && taskToDelete && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans animate-fade-in">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md shadow-2xl relative border border-rose-500/30 animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => {
                setShowDeleteModal(false);
                setTaskToDelete(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Trash2 className="w-5 h-5" />
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-gray-200">
                  Delete Corporate Assignment?
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed font-sans">
                  Are you sure you want to permanently delete this task from the corporate registry? It will remove tracking metrics and offload the employee assignee.
                </p>
                <div className="bg-gray-950/50 p-3 rounded-xl border border-brand-border/60 text-left space-y-1.5 mt-2 font-mono">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">TASK SUBJECT:</span>
                    <span className="text-gray-300 font-medium">{taskToDelete.title}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">ASSIGNEE:</span>
                    <span className="text-cyan-400 font-medium capitalize">{taskToDelete.assignedToName}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">CURRENT STATUS:</span>
                    <span className="text-amber-400 font-bold">{taskToDelete.status}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">DUE BY DATE:</span>
                    <span className="text-gray-400">{taskToDelete.dueDate}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setTaskToDelete(null);
                  }}
                  className="flex-1 py-2 bg-gray-900 hover:bg-gray-800 border border-brand-border text-gray-300 font-medium rounded-xl text-xs transition cursor-pointer font-sans"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteTask}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-xl text-xs transition shadow-lg shadow-rose-950/30 cursor-pointer font-sans"
                >
                  Delete Corporate Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
