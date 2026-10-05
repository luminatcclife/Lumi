import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Save, 
  MapPin, 
  Plus, 
  Tag as TagIcon,
  Smile,
  Layers
} from 'lucide-react';
import { useStorage } from '../context/StorageContext';
import { 
  StorageItem, 
  ItemSize, 
  UsageFrequency, 
  CATEGORIES, 
  SIZE_CONFIG, 
  FREQUENCY_CONFIG 
} from '../types/storage';

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem?: StorageItem | null;
  initialContainerId?: string;
  initialPrefillData?: {
    name: string;
    size: ItemSize;
    frequency: UsageFrequency;
    category: string;
    notes?: string;
  };
  onOpenAdvisor: () => void;
}

const COMMON_EMOJIS = [
  '📦', '🔑', '🛂', '🔌', '💾', '💎', '🛠️', '🔩', 
  '🧳', '🎄', '🩹', '🛏️', '🎮', '👕', '👟', '📚', 
  '☕', '📷', '🎨', '🚲', '🔋', '✂️', '💊', '🕶️'
];

export const ItemFormModal: React.FC<ItemFormModalProps> = ({
  isOpen,
  onClose,
  editingItem,
  initialContainerId,
  initialPrefillData,
  onOpenAdvisor,
}) => {
  const { addItem, updateItem, allContainersWithLocation } = useStorage();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [size, setSize] = useState<ItemSize>('S');
  const [frequency, setFrequency] = useState<UsageFrequency>('weekly');
  const [containerId, setContainerId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  const [photoEmoji, setPhotoEmoji] = useState<string>('📦');
  const [tagInput, setTagInput] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setCategory(editingItem.category);
      setSize(editingItem.size);
      setFrequency(editingItem.frequency);
      setContainerId(editingItem.containerId);
      setQuantity(editingItem.quantity || 1);
      setNotes(editingItem.notes || '');
      setPhotoEmoji(editingItem.photoEmoji || '📦');
      setTags(editingItem.tags || []);
    } else if (initialPrefillData) {
      setName(initialPrefillData.name || '');
      setCategory(initialPrefillData.category || CATEGORIES[0]);
      setSize(initialPrefillData.size || 'S');
      setFrequency(initialPrefillData.frequency || 'weekly');
      setNotes(initialPrefillData.notes || '');
      if (initialContainerId) {
        setContainerId(initialContainerId);
      } else if (allContainersWithLocation[0]) {
        setContainerId(allContainersWithLocation[0].id);
      }
      setTags(['#nuevo']);
    } else {
      setName('');
      setCategory(CATEGORIES[0]);
      setSize('S');
      setFrequency('weekly');
      setQuantity(1);
      setNotes('');
      setPhotoEmoji('📦');
      setTags([]);
      if (initialContainerId) {
        setContainerId(initialContainerId);
      } else if (allContainersWithLocation[0]) {
        setContainerId(allContainersWithLocation[0].id);
      }
    }
  }, [editingItem, initialContainerId, initialPrefillData, allContainersWithLocation, isOpen]);

  if (!isOpen) return null;

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const clean = tagInput.trim().replace(/^#*/, '#');
      if (clean.length > 1 && !tags.includes(clean)) {
        setTags([...tags, clean]);
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const chosenContainer = containerId || allContainersWithLocation[0]?.id;
    if (!chosenContainer) {
      alert('Por favor crea al menos un contenedor o balda primero.');
      return;
    }

    if (editingItem) {
      updateItem({
        ...editingItem,
        name: name.trim(),
        category,
        size,
        frequency,
        containerId: chosenContainer,
        quantity: Math.max(1, Number(quantity) || 1),
        notes: notes.trim(),
        photoEmoji,
        tags,
      });
    } else {
      addItem({
        name: name.trim(),
        category,
        size,
        frequency,
        containerId: chosenContainer,
        quantity: Math.max(1, Number(quantity) || 1),
        notes: notes.trim(),
        photoEmoji,
        tags,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-100 overflow-hidden flex flex-col my-8 max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h2 className="font-bold text-slate-800 text-base">
              {editingItem ? 'Editar Artículo' : 'Registrar Nuevo Artículo'}
            </h2>
            <p className="text-xs text-slate-500">
              Guarda la ubicación física exacta de cualquier objeto
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {/* Name & Emoji Picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Nombre del Objeto *
            </label>
            <div className="flex gap-2">
              {/* Emoji quick pick button */}
              <div className="relative group">
                <button
                  type="button"
                  className="w-12 h-11 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-2xl flex items-center justify-center transition"
                  title="Cambiar icono / emoji"
                >
                  {photoEmoji}
                </button>
                {/* Popover of emojis */}
                <div className="hidden group-hover:grid grid-cols-6 gap-1 absolute top-full left-0 mt-1 p-2 bg-white rounded-xl shadow-xl border border-slate-200 z-30 w-52">
                  {COMMON_EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setPhotoEmoji(em)}
                      className="text-xl p-1 rounded-lg hover:bg-slate-100 transition text-center"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Pasaportes, Cables USB, Llaves de repuesto, Taladro..."
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>

          {/* Category & Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Categoría
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Cantidad
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
              />
            </div>
          </div>

          {/* Size Radio Pills */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Tamaño Físico
              </label>
              <span className="text-[11px] text-slate-400">
                {SIZE_CONFIG[size].example}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {(Object.keys(SIZE_CONFIG) as ItemSize[]).map((sz) => {
                const cfg = SIZE_CONFIG[sz];
                const isSelected = size === sz;
                return (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setSize(sz)}
                    className={`py-2 px-1 rounded-xl border text-center transition ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold shadow-2xs ring-1 ring-indigo-600'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs block">{cfg.badge}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Usage Frequency */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Frecuencia de Uso
              </label>
              <span className="text-[11px] text-indigo-600 font-medium">
                {FREQUENCY_CONFIG[frequency].zone}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(Object.keys(FREQUENCY_CONFIG) as UsageFrequency[]).map((fq) => {
                const cfg = FREQUENCY_CONFIG[fq];
                const isSelected = frequency === fq;
                return (
                  <button
                    key={fq}
                    type="button"
                    onClick={() => setFrequency(fq)}
                    className={`p-2 rounded-xl border text-center text-xs transition flex flex-col items-center gap-0.5 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 font-bold ring-1 ring-indigo-600'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-sm">{cfg.icon}</span>
                    <span className="text-[11px]">{cfg.short}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Location / Container Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Lugar de Almacenaje Físico *
              </label>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAdvisor();
                }}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Pedir sugerencia al Asesor</span>
              </button>
            </div>
            <div className="relative">
              <select
                required
                value={containerId}
                onChange={(e) => setContainerId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              >
                {allContainersWithLocation.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.roomName} ➔ {c.furnitureName} ➔ {c.name} ({c.currentItemsCount} items)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Etiquetas (Pulsa Enter para añadir)
            </label>
            <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl border border-slate-300 bg-white min-h-[42px]">
              {tags.map((t) => (
                <span
                  key={t}
                  className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md text-xs font-medium flex items-center gap-1 border border-indigo-200"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-rose-600 text-indigo-400 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Añadir #etiqueta..."
                className="text-xs outline-hidden flex-1 min-w-[120px]"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Notas adicionales o descripción
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles sobre dónde está dentro de la caja, fecha de caducidad, precauciones..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-xs transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition shadow-sm flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{editingItem ? 'Guardar Cambios' : 'Registrar en UbicaYa'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
