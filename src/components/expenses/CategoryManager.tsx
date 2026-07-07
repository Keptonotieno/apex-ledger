import React, { useState, useEffect } from 'react';
import { Plus, Trash2, FolderPlus, Archive, CheckCircle, RotateCcw, Edit2, ShieldAlert, Check } from 'lucide-react';

export interface CategoryItem {
  id: string;
  name: string;
  archived: boolean;
  deleted: boolean;
}

const DEFAULT_CATEGORIES_LIST = [
  'Utilities', 'Marketing', 'Rent', 'Payroll', 'Supplies',
  'Inventory', 'Transport', 'Maintenance', 'Software',
  'Insurance', 'Taxes', 'Travel', 'Miscellaneous'
];

interface CategoryManagerProps {
  businessId: string;
  onClose?: () => void;
  onUpdate?: () => void;
}

export const loadCategories = (businessId: string): CategoryItem[] => {
  const localKey = `apex_ledger_categories_${businessId}`;
  const data = localStorage.getItem(localKey);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Error loading categories', e);
    }
  }
  // Initialize with defaults
  const initial: CategoryItem[] = DEFAULT_CATEGORIES_LIST.map((name, i) => ({
    id: `cat_${Date.now()}_${i}`,
    name,
    archived: false,
    deleted: false,
  }));
  localStorage.setItem(localKey, JSON.stringify(initial));
  return initial;
};

export const CategoryManager: React.FC<CategoryManagerProps> = ({ businessId, onClose, onUpdate }) => {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    setCategories(loadCategories(businessId));
  }, [businessId]);

  const saveCategoriesToStorage = (updatedList: CategoryItem[]) => {
    localStorage.setItem(`apex_ledger_categories_${businessId}`, JSON.stringify(updatedList));
    setCategories(updatedList);
    if (onUpdate) onUpdate();
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;

    // Check duplicates
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase() && !c.deleted)) {
      alert('This category already exists.');
      return;
    }

    const updated = [
      ...categories,
      {
        id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        name: trimmed,
        archived: false,
        deleted: false,
      },
    ];
    saveCategoriesToStorage(updated);
    setNewCatName('');
  };

  const handleRename = (id: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;

    const updated = categories.map((c) => {
      if (c.id === id) {
        return { ...c, name: trimmed };
      }
      return c;
    });
    saveCategoriesToStorage(updated);
    setEditingId(null);
  };

  const handleArchive = (id: string, archiveState: boolean) => {
    const updated = categories.map((c) => {
      if (c.id === id) {
        return { ...c, archived: archiveState };
      }
      return c;
    });
    saveCategoriesToStorage(updated);
  };

  const handleSoftDelete = (id: string) => {
    const updated = categories.map((c) => {
      if (c.id === id) {
        return { ...c, deleted: true };
      }
      return c;
    });
    saveCategoriesToStorage(updated);
  };

  const handleRestoreDeleted = (id: string) => {
    const updated = categories.map((c) => {
      if (c.id === id) {
        return { ...c, deleted: false, archived: false };
      }
      return c;
    });
    saveCategoriesToStorage(updated);
  };

  const activeCategories = categories.filter((c) => !c.deleted && !c.archived);
  const archivedCategories = categories.filter((c) => !c.deleted && c.archived);
  const deletedCategories = categories.filter((c) => c.deleted);

  return (
    <div className="space-y-6 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
        <div>
          <h4 className="text-sm font-bold text-gray-200 font-sans">Expense Categories Administration</h4>
          <p className="text-[10px] text-gray-500 font-sans">Create, rename, archive, or soft-delete business expenditure categories.</p>
        </div>
      </div>

      {/* Add Category Form */}
      <form onSubmit={handleAddCategory} className="flex gap-2">
        <input
          type="text"
          placeholder="New Category Name (e.g. Licensing)"
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          className="flex-1 bg-gray-950/60 border border-brand-border rounded-lg px-3 py-2 text-gray-200 outline-none focus:border-cyan-500/30"
        />
        <button
          type="submit"
          className="px-3.5 py-2 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-400 font-sans font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </form>

      {/* Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active categories */}
        <div className="space-y-2">
          <h5 className="font-bold text-cyan-400 font-sans flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
            <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>Active Categories ({activeCategories.length})</span>
          </h5>
          <div className="bg-gray-950/40 border border-brand-border rounded-xl divide-y divide-brand-border/40 max-h-60 overflow-y-auto">
            {activeCategories.length === 0 ? (
              <p className="p-4 text-center text-gray-500">No active categories.</p>
            ) : (
              activeCategories.map((cat) => (
                <div key={cat.id} className="p-2.5 flex items-center justify-between hover:bg-gray-900/10 transition">
                  {editingId === cat.id ? (
                    <div className="flex items-center gap-1.5 w-full">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 bg-gray-950 border border-cyan-500/40 rounded px-2 py-0.5 text-gray-200 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRename(cat.id)}
                        className="p-1 bg-green-950 text-green-400 border border-green-500/20 rounded hover:bg-green-900 transition"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-gray-300 font-sans font-medium">{cat.name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(cat.id);
                            setEditingName(cat.name);
                          }}
                          className="p-1 bg-gray-900 hover:bg-gray-800 border border-brand-border text-gray-400 hover:text-cyan-400 rounded transition"
                          title="Rename Category"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleArchive(cat.id, true)}
                          className="p-1 bg-gray-900 hover:bg-gray-800 border border-brand-border text-gray-400 hover:text-amber-400 rounded transition"
                          title="Archive Category"
                        >
                          <Archive className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSoftDelete(cat.id)}
                          className="p-1 bg-gray-900 hover:bg-gray-800 border border-brand-border text-gray-400 hover:text-rose-400 rounded transition"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Archived and Soft Deleted categories */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h5 className="font-bold text-amber-500 font-sans flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
              <Archive className="w-3.5 h-3.5 text-amber-500" />
              <span>Archived ({archivedCategories.length})</span>
            </h5>
            <div className="bg-gray-950/40 border border-brand-border rounded-xl divide-y divide-brand-border/40 max-h-28 overflow-y-auto">
              {archivedCategories.length === 0 ? (
                <p className="p-3 text-center text-gray-600">No archived categories.</p>
              ) : (
                archivedCategories.map((cat) => (
                  <div key={cat.id} className="p-2 flex items-center justify-between text-gray-400 hover:bg-gray-900/10 transition">
                    <span className="font-sans italic line-through">{cat.name}</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleArchive(cat.id, false)}
                        className="p-1 bg-gray-900 hover:bg-gray-800 border border-brand-border text-gray-400 hover:text-cyan-400 rounded transition"
                        title="Restore Category"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSoftDelete(cat.id)}
                        className="p-1 bg-gray-900 hover:bg-gray-800 border border-brand-border text-gray-400 hover:text-rose-400 rounded transition"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h5 className="font-bold text-rose-500 font-sans flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              <span>Trash Bin / Soft Deleted ({deletedCategories.length})</span>
            </h5>
            <div className="bg-gray-950/40 border border-brand-border rounded-xl divide-y divide-brand-border/40 max-h-28 overflow-y-auto">
              {deletedCategories.length === 0 ? (
                <p className="p-3 text-center text-gray-600">Trash is empty.</p>
              ) : (
                deletedCategories.map((cat) => (
                  <div key={cat.id} className="p-2 flex items-center justify-between text-gray-500 hover:bg-gray-900/10 transition">
                    <span className="font-sans line-through">{cat.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRestoreDeleted(cat.id)}
                      className="p-1 bg-gray-900 hover:bg-gray-800 border border-brand-border text-cyan-400 hover:text-cyan-300 rounded transition"
                      title="Restore and Undelete"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
