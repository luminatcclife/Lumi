import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Lightbulb, 
  Hammer, 
  ShoppingBag, 
  MapPin, 
  CheckCircle, 
  ArrowRight, 
  Info,
  Clock,
  Layers,
  Check
} from 'lucide-react';
import { useStorage } from '../context/StorageContext';
import { useMascot } from '../context/MascotContext';
import { LumiAvatar } from './mascot/LumiAvatar';
import { MascotMessageBubble } from './mascot/MascotMessageBubble';
import { 
  ItemSize, 
  UsageFrequency, 
  CATEGORIES, 
  SIZE_CONFIG, 
  FREQUENCY_CONFIG, 
  StorageSuggestionResult 
} from '../types/storage';

interface AIAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectContainerForNewItem?: (containerId: string, initialItemData?: { name: string; size: ItemSize; frequency: UsageFrequency; category: string; notes?: string }) => void;
  initialItemName?: string;
}

export const AIAdvisorModal: React.FC<AIAdvisorModalProps> = ({
  isOpen,
  onClose,
  onSelectContainerForNewItem,
  initialItemName = '',
}) => {
  const { allContainersWithLocation } = useStorage();
  const { mascot, dialogues } = useMascot();

  const [itemName, setItemName] = useState(initialItemName || '');
  const [size, setSize] = useState<ItemSize>('S');
  const [frequency, setFrequency] = useState<UsageFrequency>('daily');
  const [category, setCategory] = useState<string>('Electrónica & Cables');
  const [notes, setNotes] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<StorageSuggestionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConsultAdvisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const payload = {
        itemName: itemName.trim(),
        size,
        frequency,
        category,
        notes: notes.trim(),
        existingSpots: allContainersWithLocation.map((c) => ({
          id: c.id,
          name: c.name,
          roomName: c.roomName,
          furnitureName: c.furnitureName,
          type: c.type,
          currentItemsCount: c.currentItemsCount,
        })),
      };

      const response = await fetch('/api/suggest-storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Error en el servidor (${response.status})`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err: unknown) {
      console.warn('Consult error:', err);
      setErrorMsg('No se pudo conectar con el servidor de sugerencias. Usando modo autónomo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyContainer = (containerId: string) => {
    if (onSelectContainerForNewItem) {
      onSelectContainerForNewItem(containerId, {
        name: itemName,
        size,
        frequency,
        category,
        notes,
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-100 overflow-hidden flex flex-col my-8 max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/70 via-purple-50/50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg">Asesor Inteligente de Almacenaje</h2>
              <p className="text-xs text-slate-500">
                Sugerencias óptimas por tamaño, frecuencia, lugares disponibles y proyectos DIY
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Mascot Ergonomic Advice */}
          <MascotMessageBubble
            dialoguePool={
              frequency === 'rare'
                ? dialogues.ergonomicZoneCold
                : frequency === 'daily'
                ? dialogues.ergonomicZoneGold
                : dialogues.ergonomicZoneNeutral
            }
            mood="thinking"
            title={`Regla de Oro de ${mascot.name}`}
            compact
          />

          {/* Input Form */}
          <form onSubmit={handleConsultAdvisor} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                ¿Qué objeto quieres guardar u organizar? *
              </label>
              <input
                type="text"
                required
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="Ej: Pasaportes, Cables sueltos, Taladro eléctrico, Abrigo de esquí, Joyas..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm placeholder:text-slate-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Categoría
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
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
                  Notas o Fragilidad (opcional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Es frágil, pesa mucho, huele a perfume..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
            </div>

            {/* Size Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Tamaño del objeto
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(Object.keys(SIZE_CONFIG) as ItemSize[]).map((sz) => {
                  const cfg = SIZE_CONFIG[sz];
                  const isSelected = size === sz;
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setSize(sz)}
                      className={`p-2.5 rounded-xl border text-left transition relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-600'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">{cfg.badge}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 leading-tight">
                        {cfg.example}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Frequency Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                ¿Con qué frecuencia lo usas?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                {(Object.keys(FREQUENCY_CONFIG) as UsageFrequency[]).map((fq) => {
                  const cfg = FREQUENCY_CONFIG[fq];
                  const isSelected = frequency === fq;
                  return (
                    <button
                      key={fq}
                      type="button"
                      onClick={() => setFrequency(fq)}
                      className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center gap-0.5 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/60 shadow-xs ring-1 ring-indigo-600'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-base">{cfg.icon}</span>
                      <span className="font-semibold text-xs text-slate-800">{cfg.short}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading || !itemName.trim()}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Analizando ergonomía y espacios disponibles...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Obtener Sugerencia Óptima & Ideas DIY</span>
                </>
              )}
            </button>
          </form>

          {errorMsg && (
            <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200">
              {errorMsg}
            </div>
          )}

          {/* Results section */}
          {result && (
            <div className="space-y-6 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* 1. Ergonomic rule card */}
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4.5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-indigo-950 text-sm">
                      Regla Ergonómica para "{result.itemName}"
                    </h3>
                    <p className="text-xs text-indigo-900/90 mt-1 leading-relaxed">
                      {result.ergonomicReasoning}
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Existing spots recommended */}
              {result.recommendedExistingSpots && result.recommendedExistingSpots.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm">
                      Tus Espacios Actuales Recomendados
                    </h3>
                  </div>

                  <div className="space-y-2.5">
                    {result.recommendedExistingSpots.map((spot, idx) => (
                      <div
                        key={spot.containerId || idx}
                        className="bg-white border border-slate-200 hover:border-emerald-300 rounded-xl p-3.5 shadow-2xs transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-200">
                            #{idx + 1}
                          </span>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">
                              {spot.locationName}
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">{spot.reason}</p>
                          </div>
                        </div>

                        {spot.containerId && (
                          <button
                            onClick={() => handleApplyContainer(spot.containerId)}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 shrink-0 transition shadow-2xs"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Guardar aquí
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. DIY Organization Ideas */}
              {result.diyIdeas && result.diyIdeas.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center">
                      <Hammer className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">
                        Ideas "Hazlo Tú Mismo" (DIY) con lo que tienes en casa
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {result.diyIdeas.map((diy, idx) => (
                      <div
                        key={idx}
                        className="bg-amber-50/40 border border-amber-200/80 rounded-xl p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-amber-950 text-sm flex items-center gap-1.5">
                            <Lightbulb className="w-4 h-4 text-amber-500" />
                            {diy.title}
                          </h4>
                          <span className="text-[11px] font-medium bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {diy.difficulty}
                          </span>
                        </div>

                        {diy.exampleQuote && (
                          <p className="text-xs italic text-amber-900 bg-amber-100/60 p-2.5 rounded-lg border-l-4 border-amber-500">
                            "{diy.exampleQuote}"
                          </p>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="font-bold text-slate-700 block mb-1">
                              Materiales caseros:
                            </span>
                            <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                              {diy.materials.map((mat, mIdx) => (
                                <li key={mIdx}>{mat}</li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <span className="font-bold text-slate-700 block mb-1">Pasos rápidos:</span>
                            <ol className="list-decimal list-inside text-slate-600 space-y-0.5">
                              {diy.steps.map((st, sIdx) => (
                                <li key={sIdx}>{st}</li>
                              ))}
                            </ol>
                          </div>
                        </div>

                        {diy.tags && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {diy.tags.map((t, tIdx) => (
                              <span
                                key={tIdx}
                                className="text-[10px] bg-white text-slate-600 border border-slate-200 px-2 py-0.5 rounded"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Commercial Purchase Options */}
              {result.purchaseIdeas && result.purchaseIdeas.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center">
                      <ShoppingBag className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm">
                      Sugerencias de Compra si prefieres un organizador comercial
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {result.purchaseIdeas.map((p, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-slate-200 rounded-xl p-3 text-xs shadow-2xs space-y-1.5"
                      >
                        <div className="flex items-start justify-between">
                          <h4 className="font-bold text-slate-900">{p.name}</h4>
                          <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-[11px] shrink-0 ml-2">
                            {p.approxPrice}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          {p.description}
                        </p>
                        <p className="text-slate-400 text-[10px]">
                          <strong className="text-slate-500">Dónde ponerlo:</strong> {p.whereToPlace}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Consejos organizativos adaptados al tamaño y frecuencia</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 font-medium transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
