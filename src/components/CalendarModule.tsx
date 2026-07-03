import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { Calendar, Plus, Trash2, Clock, MapPin, X } from 'lucide-react';

export const CalendarModule: React.FC = () => {
  const { 
    events, 
    activeUser, 
    addEvent, 
    deleteEvent 
  } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<'Meeting' | 'Deadline' | 'Announcement' | 'Business Event'>('Meeting');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDescription, setFormDescription] = useState('');

  const isEmployee = activeUser.role === UserRole.EMPLOYEE;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formDescription) return;

    addEvent({
      title: formTitle,
      type: formType,
      date: formDate,
      description: formDescription
    });

    setShowAddModal(false);
    setFormTitle('');
    setFormDescription('');
  };

  const handleDelete = (id: string) => {
    if (isEmployee) return;
    if (confirm('Delete this event from the shared corporate calendar?')) {
      deleteEvent(id);
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Header Controls */}
      <div className="glass-panel p-4 rounded-xl flex items-center justify-between border border-brand-border">
        <div>
          <h3 className="text-sm font-bold text-gray-200">Shared Workspace Calendar</h3>
          <p className="text-xs text-gray-500">Corporate meetings, delivery deadlines, and announcements</p>
        </div>
        {!isEmployee && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 bg-cyan-950 text-cyan-400 hover:bg-cyan-900 border border-cyan-500/30 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Event</span>
          </button>
        )}
      </div>

      {/* Events Timeline List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.length === 0 ? (
          <div className="col-span-full glass-panel p-8 text-center text-gray-500">
            No company events scheduled for this branch yet.
          </div>
        ) : (
          events.map((evt) => (
            <div key={evt.id} className="glass-panel p-5 rounded-xl border border-brand-border flex flex-col justify-between h-44 relative overflow-hidden group">
              <span className={`absolute top-0 right-0 w-20 text-[9px] font-mono text-center py-1 rounded-bl-lg font-bold ${
                evt.type === 'Meeting' ? 'bg-cyan-950/40 text-cyan-400' :
                evt.type === 'Deadline' ? 'bg-rose-950/40 text-rose-400' :
                evt.type === 'Announcement' ? 'bg-amber-950/40 text-amber-400' : 'bg-emerald-950/40 text-emerald-400'
              }`}>
                {evt.type}
              </span>

              <div className="space-y-1.5 pr-12">
                <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-[10px]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{evt.date}</span>
                </div>
                <h4 className="text-sm font-bold text-gray-200">{evt.title}</h4>
                <p className="text-xs text-gray-400 line-clamp-3">{evt.description}</p>
              </div>

              <div className="flex items-center justify-between border-t border-brand-border/60 pt-2.5 text-[10px] text-gray-500 font-mono">
                <span>Created by: <span className="text-gray-400 capitalize">{evt.createdBy}</span></span>
                {!isEmployee && (
                  <button 
                    onClick={() => handleDelete(evt.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-rose-400 transition"
                    title="Remove event"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Schedule Event Modal */}
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
              <Calendar className="w-5 h-5 text-cyan-400" />
              <span>Schedule Company Event</span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-gray-400 block mb-1">Event Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q2 Performance Audit Session"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Event Class</label>
                  <select
                    value={formType}
                    onChange={(e: any) => setFormType(e.target.value)}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-300 outline-none focus:border-cyan-500/30"
                  >
                    <option value="Meeting">Meeting</option>
                    <option value="Deadline">Deadline</option>
                    <option value="Announcement">Announcement</option>
                    <option value="Business Event">Business Event</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Execution Date</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Event Guidelines / Notes</label>
                <textarea
                  required
                  placeholder="Share details, agendas, or dial-in parameters..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 h-24 font-sans"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold font-sans rounded-xl text-center shadow-lg transition"
              >
                Schedule & Broadcast
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
