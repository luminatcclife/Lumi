import React, { useState } from 'react';
import { 
  X, 
  Box, 
  QrCode as QrIcon, 
  Plus, 
  Trash2, 
  FolderPlus, 
  ExternalLink,
  ChevronRight,
  Layers,
  MapPin,
  Tag
} from 'lucide-react';
import { useStorage } from '../context/StorageContext';
import { StorageContainer, Furniture, Room, SIZE_CONFIG, FREQUENCY_CONFIG } from '../types/storage';

interface StorageExplorerModalProps {
  furnitureId: string | null;
  onClose: () => void;
  onOpenQr: (title: string, payload: string, category?: string) => void;
  onAddNewItemInContainer: (containerId: string) => void;
  onLocateItem: (itemId: string) => void;
}

export const StorageExplorerModal: React.FC<StorageExplorerModalProps> = ({
  furnitureId,
  onClose,
  onOpenQr,
  onAddNewItemInContainer,
  onLocateItem,
}) => {
  const { 
    findFurniture, 
    items, 
    deleteItem, 
    addContainer, 
    deleteContainer 
  } = useStorage();

  const [activeContainerId, setActiveContainerId] = useState<string | null>(null);
  const [showAddContainerForm, setShowAddContainerForm] = useState(false);
  const [newContainerName, setNewContainerName] = useState('');
  const [newContainerType, setNewContainerType] = useState<StorageContainer['type']>('box');

  if (!furnitureId) return null;

  const found = findFurniture(furnitureId);
  if (!found) return null;

  const { furniture, room } = found;

  const currentActiveContainer = activeContainerId
    ? furniture.containers.find((c) => c.id === activeContainerId) || furniture.containers[0]
    : furniture.containers[0];

  const containerItems = currentActiveContainer
    ? items.filter((itm) => itm.containerId === currentActiveContainer.id)
    : [];

  const handleCreateContainer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContainerName.trim()) return;

    const created = addContainer(room.id, furniture.id, {
      name: newContainerName.trim(),
      type: newContainerType,
      furnitureId: furniture.id,
      levelIndex: furniture.containers.length + 1,
    });

    setNewContainerName('');
    setShowAddContainerForm(false);
    setActiveContainerId(created.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs font-bold text-lg"
              style={{ backgroundColor: room.color || '#6366f1' }}
            >
              <Box className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {room.name}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-medium text-slate-400">Inspección de Mueble</span>
              </div>
              <h2 className="font-bold text-slate-900 text-lg leading-tight mt-0.5">
                {furniture.name}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content with 2-panel layout: Left containers list, Right items inside */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {/* Left panel: Shelves / Drawers / Boxes list */}
          <div className="md:col-span-5 p-4 overflow-y-auto bg-slate-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Baldas, Cajones y Cajas ({furniture.containers.length})
                </span>
                <button
                  onClick={() => setShowAddContainerForm(!showAddContainerForm)}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-indigo-50 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir</span>
                </button>
              </div>

              {/* Add container form toggle */}
              {showAddContainerForm && (
                <form
                  onSubmit={handleCreateContainer}
                  className="p-3 bg-white rounded-xl border border-indigo-200 shadow-2xs mb-3 space-y-2 animate-in fade-in zoom-in-95 duration-150"
                >
                  <h4 className="text-xs font-bold text-slate-800">Nuevo Contenedor o Balda</h4>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Balda 4, Caja Herramientas, Cajón 2..."
                    value={newContainerName}
                    onChange={(e) => setNewContainerName(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                  <div className="flex gap-2 text-xs">
                    <select
                      value={newContainerType}
                      onChange={(e) => setNewContainerType(e.target.value as StorageContainer['type'])}
                      className="flex-1 text-xs px-2 py-1 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="shelf_level">Balda / Estante</option>
                      <option value="drawer">Cajón</option>
                      <option value="box">Caja de Almacenaje</option>
                      <option value="bin">Organizador / Bote</option>
                      <option value="organizer_tray">Bandeja Vaciabolsillos</option>
                    </select>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-indigo-600 text-white rounded-lg font-medium text-xs hover:bg-indigo-700"
                    >
                      Guardar
                    </button>
                  </div>
                </form>
              )}

              {/* Containers list */}
              <div className="space-y-1.5">
                {furniture.containers.map((c) => {
                  const isSelected = currentActiveContainer?.id === c.id;
                  const count = items.filter((itm) => itm.containerId === c.id).length;

                  return (
                    <div
                      key={c.id}
                      onClick={() => setActiveContainerId(c.id)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? 'border-indigo-600 bg-white shadow-xs ring-1 ring-indigo-600'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <Layers className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <p className="font-semibold text-xs text-slate-800 truncate">{c.name}</p>
                          <p className="text-[10px] text-slate-400 capitalize">
                            {c.type.replace('_', ' ')} • {count} {count === 1 ? 'artículo' : 'artículos'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          title="Imprimir código QR"
                          onClick={() => onOpenQr(c.name, c.qrCode, 'Contenedor')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        >
                          <QrIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right panel: Items inside selected container */}
          <div className="md:col-span-7 p-6 overflow-y-auto flex flex-col justify-between">
            {currentActiveContainer ? (
              <div className="space-y-4">
                {/* Active container bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      Contenedor Seleccionado
                    </span>
                    <h3 className="font-bold text-slate-900 text-base mt-1">
                      {currentActiveContainer.name}
                    </h3>
                    {currentActiveContainer.notes && (
                      <p className="text-xs text-slate-500 mt-0.5">{currentActiveContainer.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenQr(currentActiveContainer.name, currentActiveContainer.qrCode, 'Contenedor')}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5 transition shadow-2xs"
                    >
                      <QrIcon className="w-3.5 h-3.5 text-slate-500" />
                      <span>Ver QR</span>
                    </button>
                    <button
                      onClick={() => onAddNewItemInContainer(currentActiveContainer.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Guardar aquí</span>
                    </button>
                  </div>
                </div>

                {/* Items in this container */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Artículos dentro ({containerItems.length})
                  </h4>

                  {containerItems.length === 0 ? (
                    <div className="text-center py-8 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <Box className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs text-slate-600 font-medium">Este espacio está libre.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Puedes añadir un artículo nuevo o mover uno existente aquí.
                      </p>
                      <button
                        onClick={() => onAddNewItemInContainer(currentActiveContainer.id)}
                        className="mt-3 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-semibold text-xs transition"
                      >
                        + Añadir primer artículo
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {containerItems.map((item) => {
                        const sz = SIZE_CONFIG[item.size];
                        const fq = FREQUENCY_CONFIG[item.frequency];
                        return (
                          <div
                            key={item.id}
                            className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-3.5 shadow-2xs transition flex items-center justify-between gap-3 group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-2xl p-2 bg-slate-50 rounded-xl border border-slate-100 shrink-0">
                                {item.photoEmoji || '📦'}
                              </span>
                              <div className="min-w-0">
                                <h5 className="font-semibold text-slate-900 text-xs truncate">
                                  {item.name}
                                </h5>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                  <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                    {item.category}
                                  </span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${sz.color}`}>
                                    {sz.badge}
                                  </span>
                                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${fq.color}`}>
                                    {fq.icon} {fq.short}
                                  </span>
                                  {item.quantity > 1 && (
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      x{item.quantity}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Actions on item */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                title="Imprimir QR de este objeto"
                                onClick={() => onOpenQr(item.name, item.qrCode, item.category)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                              >
                                <QrIcon className="w-4 h-4" />
                              </button>
                              <button
                                title="Eliminar del inventario"
                                onClick={() => {
                                  if (confirm(`¿Eliminar "${item.name}"?`)) {
                                    deleteItem(item.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                Selecciona una balda o cajón a la izquierda para inspeccionar.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>{room.name} ➔ {furniture.name}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 font-medium text-slate-700 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
