import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, ShieldAlert, CheckCircle, RotateCcw, Check, Shield } from 'lucide-react';
import { Department } from '../../types';

interface DepartmentManagerProps {
  businessId: string;
  isManagerOrOwner: boolean;
  onUpdate?: () => void;
}

export const DepartmentManager: React.FC<DepartmentManagerProps> = ({ businessId, isManagerOrOwner, onUpdate }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingDesc, setEditingDesc] = useState('');

  const localKey = `apex_ledger_departments_${businessId}`;

  const loadDepartments = () => {
    const data = localStorage.getItem(localKey);
    if (data) {
      try {
        setDepartments(JSON.parse(data));
      } catch (e) {
        console.error('Error loading departments', e);
        setDepartments([]);
      }
    } else {
      setDepartments([]);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, [businessId]);

  const saveDepartmentsToStorage = (updatedList: Department[]) => {
    localStorage.setItem(localKey, JSON.stringify(updatedList));
    setDepartments(updatedList);
    if (onUpdate) onUpdate();
  };

  const handleAddDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isManagerOrOwner) {
      alert("Permission Denied: Only Business Owner and Manager can create department entities.");
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) return;

    // Check duplicate
    if (departments.some(d => d.name.toLowerCase() === trimmedName.toLowerCase())) {
      alert("This department name already exists.");
      return;
    }

    const newDep: Department = {
      id: `dep_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      businessId,
      name: trimmedName,
      description: description.trim()
    };

    const updated = [...departments, newDep];
    saveDepartmentsToStorage(updated);
    setName('');
    setDescription('');
  };

  const handleSaveEdit = (id: string) => {
    if (!isManagerOrOwner) {
      alert("Permission Denied: Only Business Owner and Manager can modify department entities.");
      return;
    }

    const trimmedName = editingName.trim();
    if (!trimmedName) return;

    // Check duplicate for other departments
    if (departments.some(d => d.id !== id && d.name.toLowerCase() === trimmedName.toLowerCase())) {
      alert("Another department already has this name.");
      return;
    }

    const updated = departments.map(d => {
      if (d.id === id) {
        return { ...d, name: trimmedName, description: editingDesc.trim() };
      }
      return d;
    });

    saveDepartmentsToStorage(updated);
    setEditingId(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (!isManagerOrOwner) {
      alert("Permission Denied: Only Business Owner and Manager can delete department entities.");
      return;
    }

    if (confirm(`Are you sure you want to permanently delete the department "${name}"?`)) {
      const updated = departments.filter(d => d.id !== id);
      saveDepartmentsToStorage(updated);
    }
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-brand-border/60 pb-3 gap-2">
        <div>
          <h4 className="text-sm font-bold text-gray-200 font-sans">Business Departments Administration</h4>
          <p className="text-[10px] text-gray-500 font-sans">Establish organizational departments to bucket budget allocations, tracking codes, and expense logs.</p>
        </div>
        {!isManagerOrOwner && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-950/40 border border-amber-900/40 text-amber-400 rounded-lg text-[9px] font-sans">
            <Shield className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span>VIEW ONLY MODE</span>
          </div>
        )}
      </div>

      {isManagerOrOwner ? (
        <form onSubmit={handleAddDepartment} className="space-y-3 p-3.5 bg-gray-950/40 border border-brand-border/50 rounded-xl">
          <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider font-sans">Register New Department Entity</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-gray-500 block mb-1">Department Name *</label>
              <input
                type="text"
                placeholder="e.g. Operations"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-gray-950/60 border border-brand-border rounded-lg px-3 py-2 text-gray-200 outline-none focus:border-cyan-500/30"
              />
            </div>
            <div>
              <label className="text-gray-500 block mb-1">Functional Description</label>
              <input
                type="text"
                placeholder="e.g. Logistics, fuel expense oversight, and vehicle maintenance budget logs"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-gray-950/60 border border-brand-border rounded-lg px-3 py-2 text-gray-200 outline-none focus:border-cyan-500/30"
              />
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-4 py-2 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-400 font-sans font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Register Department</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="p-3 bg-gray-950/10 border border-dashed border-brand-border/30 rounded-xl text-center text-gray-500 font-sans">
          Only Business Owners and Managers have permission to register new department structures.
        </div>
      )}

      {/* List of departments */}
      <div className="space-y-2.5">
        <h5 className="font-bold text-cyan-400 font-sans flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
          <CheckCircle className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span>Active Organization Departments ({departments.length})</span>
        </h5>
        <div className="bg-gray-950/40 border border-brand-border rounded-xl divide-y divide-brand-border/40 max-h-[300px] overflow-y-auto">
          {departments.length === 0 ? (
            <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center">
              <ShieldAlert className="w-7 h-7 text-rose-500/80 mb-2 animate-bounce" />
              <p className="font-sans font-bold text-gray-400">No departments available. Please create one first.</p>
              <p className="text-[10px] text-gray-500 mt-1 max-w-xs font-sans">
                You must define at least one department before logging expenses or configuring budget monitors.
              </p>
            </div>
          ) : (
            departments.map((dep) => (
              <div key={dep.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-900/10 transition">
                {editingId === dep.id ? (
                  <div className="flex flex-col gap-2 w-full">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="bg-gray-950 border border-cyan-500/40 rounded px-2.5 py-1 text-gray-200 outline-none"
                      />
                      <input
                        type="text"
                        value={editingDesc}
                        onChange={(e) => setEditingDesc(e.target.value)}
                        className="bg-gray-950 border border-cyan-500/40 rounded px-2.5 py-1 text-gray-200 outline-none"
                      />
                    </div>
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-2.5 py-1 bg-gray-900 text-gray-400 hover:text-gray-200 border border-brand-border rounded transition font-sans"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(dep.id)}
                        className="px-2.5 py-1 bg-green-950 text-green-400 border border-green-500/20 rounded hover:bg-green-900 transition flex items-center gap-1 font-sans font-bold"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-0.5">
                      <div className="text-gray-200 font-sans font-bold text-xs flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                        <span>{dep.name}</span>
                      </div>
                      {dep.description && (
                        <p className="text-[10px] text-gray-500 font-sans pl-3">{dep.description}</p>
                      )}
                    </div>
                    {isManagerOrOwner && (
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(dep.id);
                            setEditingName(dep.name);
                            setEditingDesc(dep.description || '');
                          }}
                          className="p-1.5 bg-gray-900 hover:bg-gray-800 border border-brand-border text-gray-400 hover:text-cyan-400 rounded transition"
                          title="Edit Department"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(dep.id, dep.name)}
                          className="p-1.5 bg-gray-900 hover:bg-gray-800 border border-brand-border text-gray-400 hover:text-rose-400 rounded transition"
                          title="Delete Department"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
