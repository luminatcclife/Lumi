import React, { useState } from 'react';
import { useMascot } from '../../context/MascotContext';
import { LumiAvatar } from './LumiAvatar';
import { 
  X, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Shuffle, 
  HelpCircle, 
  Lightbulb, 
  Heart,
  MessageCircle,
  ChevronDown
} from 'lucide-react';
import { getRandomMascotDialogue } from '../../constants/mascotCopy';
import { useStorage } from '../../context/StorageContext';

export const FloatingMascotCompanion: React.FC = () => {
  const { 
    mascot, 
    dialogues, 
    speakMascot, 
    stopSpeaking, 
    isSpeaking, 
    activeMascotId, 
    setActiveMascotId,
    triggerCelebration,
    setIsOnboardingOpen 
  } = useMascot();

  const { activeTab } = useStorage();

  const [isOpen, setIsOpen] = useState(false);
  const [currentTip, setCurrentTip] = useState<string>(() => {
    return getRandomMascotDialogue(dialogues.randomTips);
  });

  const getContextualDialogue = () => {
    switch (activeTab) {
      case 'map':
        return '¡Me encanta el plano 2D! Ver tu casa desde arriba activa tus mapas cognitivos. Toca cualquier mueble para ver qué baldas tienen espacio.';
      case 'search':
        return '¿Buscas algo? Puedes hablarme directamente con el micrófono o decir "¿Dónde guardé el pasaporte?". ¡Soy tu memoria de confianza!';
      case 'save':
        return '¡Hora de guardar! Recuerda: lo que usas cada día va a la Zona de Oro (a mano). El árbol de Navidad... directo a la Zona Fría del altillo.';
      case 'inventory':
        return '¡Mira qué inventario más limpio! Cada objeto tiene su etiqueta QR lista para imprimir y pegar en tu caja física.';
      default:
        return currentTip;
    }
  };

  const handleNextTip = () => {
    const next = getRandomMascotDialogue(dialogues.randomTips);
    setCurrentTip(next);
    speakMascot(next);
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end pointer-events-auto">
      {/* Expanded Speech Card */}
      {isOpen && (
        <div className="mb-3 w-80 sm:w-96 bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 shadow-2xl p-4 animate-in fade-in slide-in-from-bottom-3 duration-200 flex flex-col gap-3">
          {/* Card Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-base">{activeMascotId === 'lumi' ? '☁️' : '🐿️'}</span>
              <div>
                <h4 className="font-extrabold text-xs text-slate-900 leading-tight">
                  {mascot.name} • {mascot.title}
                </h4>
                <p className="text-[10px] text-slate-500">Memoria externa y compañero zen</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const nextId = activeMascotId === 'lumi' ? 'glis' : 'lumi';
                  setActiveMascotId(nextId);
                }}
                className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                title="Cambiar mascota"
              >
                {activeMascotId === 'lumi' ? 'Probar a Glis' : 'Probar a Lumi'}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Dialogue bubble */}
          <div className="bg-gradient-to-r from-indigo-50/80 to-purple-50/60 p-3.5 rounded-2xl border border-indigo-100 text-xs text-slate-800 leading-relaxed shadow-2xs relative">
            <p className="italic">
              "{getContextualDialogue()}"
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center justify-between text-xs pt-1">
            <button
              onClick={handleNextTip}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-semibold text-[11px] flex items-center gap-1.5 transition"
            >
              <Shuffle className="w-3 h-3" />
              <span>Otro consejo o chiste</span>
            </button>

            <div className="flex items-center gap-1">
              <button
                onClick={() => speakMascot(getContextualDialogue())}
                className={`p-1.5 rounded-xl transition ${
                  isSpeaking ? 'bg-amber-500 text-white animate-pulse' : 'text-slate-500 hover:bg-slate-100'
                }`}
                title="Escuchar locución"
              >
                <Volume2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  triggerCelebration();
                }}
                className="p-1.5 rounded-xl text-amber-500 hover:bg-amber-50 transition"
                title="Chocar los cinco"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Mascot Button */}
      <div className="relative group">
        <button
          onClick={() => {
            if (!isOpen) {
              setIsOpen(true);
              triggerCelebration();
            } else {
              setIsOpen(false);
            }
          }}
          className="relative flex items-center justify-center p-1 rounded-full bg-white shadow-xl border-2 border-indigo-300 hover:border-indigo-500 hover:scale-105 transition transform cursor-pointer group"
          title={`Hablar con ${mascot.name}`}
        >
          <LumiAvatar size="md" interactive={false} />

          {/* Unread / Attention Indicator */}
          {!isOpen && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-xs animate-bounce">
              💬
            </span>
          )}
        </button>

        {/* Hover hint */}
        {!isOpen && (
          <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900/90 text-white text-[11px] font-semibold rounded-xl opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap shadow-md">
            ¡Pregúntale a {mascot.name}!
          </div>
        )}
      </div>
    </div>
  );
};
