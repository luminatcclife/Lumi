import React, { useState } from 'react';
import { X, Plus, Layers, Box } from 'lucide-react';
import { useStorage } from '../context/StorageContext';
import { FurnitureType } from '../types/storage';

interface ContainerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'room' | 'furniture';
  initialRoomId?: string;
}

const ROOM_COLORS = [
  '#10b981', // emerald
  '#f59e0b', // amber
  '#0ea5e9', // sky
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#64748b', // slate
  '#14b8a6', // teal
  '#f97316', // orange
];

export const ContainerFormModal: React.FC<ContainerFormModalProps> = ({
  isOpen,
  onClose,
  type,
  initialRoomId,
}) => {
  const { spaces, activeSpaceId, addRoom, addFurniture } = useStorage();

  const activeSpace = spaces.find((s) => s.id === activeSpaceId) || spaces[0];

  // Room state
  const [roomName, setRoomName] = useState('');
  const [roomColor, setRoomColor] = useState(ROOM_COLORS[0]);

  // Furniture state
  const [furnName, setFurnName] = useState('');
  const [furnType, setFurnType] = useState<FurnitureType>('shelf');
  const [targetRoomId, setTargetRoomId] = useState(initialRoomId || activeSpace.rooms[0]?.id || '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (type === 'room') {
      if (!roomName.trim()) return;
      // Position new room sensibly
      const nextX = (activeSpace.rooms.length % 2) * 48 + 4;
      const nextY = Math.floor(activeSpace.rooms.length / 2) * 48 + 4;

      addRoom(activeSpace.id, {
        name: roomName.trim(),
        color: roomColor,
        x: nextX,
        y: nextY,
        width: 44,
        height: 44,
      });
    } else {
      if (!furnName.trim() || !targetRoomId) return;
      const selectedRoom = activeSpace.rooms.find((r) => r.id === targetRoomId);
      const furnCount = selectedRoom ? selectedRoom.furniture.length : 0;
      const nextX = 10 + (furnCount % 2) * 45;
      const nextY = 15 + Math.floor(furnCount / 2) * 40;

      addFurniture(targetRoomId, {
        name: furnName.trim(),
        type: furnType,
        roomId: targetRoomId,
        x: Math.min(nextX, 55),
        y: Math.min(nextY, 50),
        width: 40,
        height: 40,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              {type === 'room' ? <Layers className="w-4 h-4" /> : <Box className="w-4 h-4" />}
            </div>
            <h2 className="font-bold text-slate-800 text-base">
              {type === 'room' ? 'Nueva Habitación / Zona' : 'Nuevo Mueble o Estantería'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {type === 'room' ? (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Nombre de la Habitación / Espacio *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Cocina, Terraza, Buhardilla, Sótano..."
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Color Identificativo
                </label>
                <div className="flex items-center gap-2">
                  {ROOM_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setRoomColor(col)}
                      className={`w-7 h-7 rounded-full transition transform ${
                        roomColor === col ? 'scale-125 ring-2 ring-slate-900' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  ¿En qué habitación se encuentra?
                </label>
                <select
                  value={targetRoomId}
                  onChange={(e) => setTargetRoomId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                >
                  {activeSpace.rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Nombre del Mueble *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Estantería Billy, Armario Empotrado, Cajonera..."
                  value={furnName}
                  onChange={(e) => setFurnName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Tipo de Mueble
                </label>
                <select
                  value={furnType}
                  onChange={(e) => setFurnType(e.target.value as FurnitureType)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="shelf">Estantería con baldas</option>
                  <option value="wardrobe">Armario ropero</option>
                  <option value="desk">Escritorio o mesa de trabajo</option>
                  <option value="drawers">Cómoda o cajonera</option>
                  <option value="cabinet">Mueble de almacenaje / aparador</option>
                  <option value="rack">Estantería de carga metálica</option>
                  <option value="trunk">Baúl o espacio diáfano</option>
                  <option value="custom">Otro mueble personalizado</option>
                </select>
              </div>
            </>
          )}

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
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-semibold text-xs transition shadow-sm"
            >
              {type === 'room' ? 'Crear Habitación' : 'Añadir al Plano'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
