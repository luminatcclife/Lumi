import React, { useState, useEffect } from 'react';
import { useMascot, MascotExpression } from '../../context/MascotContext';
import { LumiCharacter } from './LumiCharacter';
import { 
  X, 
  Sparkles, 
  Volume2, 
  Shuffle, 
  ChevronDown,
  Search,
  CheckCircle2,
  HardHat,
  HelpCircle,
  Activity,
  Smile
} from 'lucide-react';
import { getRandomMascotDialogue } from '../../constants/mascotCopy';
import { useStorage } from '../../context/StorageContext';

export const FloatingMascotCompanion: React.FC = () => {
  const { 
    mascot, 
    dialogues, 
    expression, 
    setExpression, 
    speakMascot, 
    stopSpeaking, 
    isSpeaking, 
    activeMascotId, 
    setActiveMascotId,
    triggerCelebration,
    triggerSuccess 
  } = useMascot();

  const { activeTab } = useStorage();

  const [isOpen, setIsOpen] = useState(false);
  const [currentTip, setCurrentTip] = useState<string>(() => {
    return getRandomMascotDialogue(dialogues.randomTips);
  });

  // Expression labels and styles
  const expressionMeta: Record<MascotExpression, { label: string; badgeColor: string; auraColor: string; soundEffectQuote: string }> = {
    idle: {
      label: 'En calma',
      badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      auraColor: 'from-indigo-400/30 to-purple-400/20',
      soundEffectQuote: 'Todo en calma. Mi disco duro biológico está listo para lo que necesites.',
    },
    thinking: {
      label: 'Pensando...',
      badgeColor: 'bg-purple-100 text-purple-700 border-purple-200',
      auraColor: 'from-purple-500/40 to-indigo-500/30',
      soundEffectQuote: 'Procesando neuronas espaciales... Analizando el mejor hueco para tus cosas.',
    },
    searching: {
      label: 'Buscando con lupa',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      auraColor: 'from-amber-400/40 to-indigo-400/30',
      soundEffectQuote: 'He activado mi linterna y lupa al revés. ¡Rastreando cada rincón del plano!',
    },
    success: {
      label: '¡Éxito total!',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      auraColor: 'from-emerald-400/50 to-amber-400/40',
      soundEffectQuote: '¡BINGO! Objeto guardado y bajo control. ¡Choquemos esos cinco digitales!',
    },
    offline: {
      label: 'Búnker Offline',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
      auraColor: 'from-amber-500/50 to-orange-500/40',
      soundEffectQuote: '¡Sin internet no nos paramos! Guardando tus cosas en nuestro búnker local IndexedDB.',
    },
    listening: {
      label: 'Escuchando tu voz',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
      auraColor: 'from-rose-400/40 to-purple-400/30',
      soundEffectQuote: 'Soy todo orejas y nubes. Dime qué objeto estás buscando.',
    },
    speaking: {
      label: 'Hablando...',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      auraColor: 'from-blue-400/40 to-indigo-400/30',
      soundEffectQuote: '¡Las tengo bajo control! Te describo exactamente la ubicación.',
    },
    scanning: {
      label: 'Visor Láser QR',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      auraColor: 'from-emerald-400/40 to-cyan-400/30',
      soundEffectQuote: 'Visor y binoculares sincronizados con la cámara para radiografiar tu caja.',
    },
    wink: {
      label: '¡Guiño cómplice!',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      auraColor: 'from-amber-400/50 to-emerald-400/40',
      soundEffectQuote: '¡Wink! ¡Código detectado y archivado a la primera!',
    },
    celebrating: {
      label: '¡Celebrando!',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      auraColor: 'from-emerald-400/50 to-amber-400/40',
      soundEffectQuote: '¡Fiesta de orden! Cada cosa en su lugar y tu mente despejada.',
    },
  };

  const currentMeta = expressionMeta[expression] || expressionMeta.idle;

  const getContextualDialogue = () => {
    if (expression === 'searching') {
      return 'He encendido mi linterna mágica y tengo la lupa al revés buscando por las baldas.';
    }
    if (expression === 'success' || expression === 'celebrating') {
      return '¡Qué gozada de orden! Todo ubicado y registrado a la perfección.';
    }
    if (expression === 'offline') {
      return '¡Sin internet no nos paramos! Guardando tus cosas en nuestro búnker local IndexedDB.';
    }
    if (expression === 'thinking') {
      return 'Mmm... mis neuronas esponjosas están calculando la mejor balda ergonómica para esto.';
    }

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

  const handleSwitchExpression = (newExp: MascotExpression) => {
    setExpression(newExp);
    const quote = expressionMeta[newExp]?.soundEffectQuote;
    if (quote) {
      speakMascot(quote);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end pointer-events-auto">
      {/* Expanded Speech & Expression Control Card */}
      {isOpen && (
        <div className="mb-3 w-80 sm:w-96 bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 shadow-2xl p-4 animate-in fade-in slide-in-from-bottom-3 duration-300 flex flex-col gap-3">
          {/* Card Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-base">{activeMascotId === 'lumi' ? '☁️' : '🐿️'}</span>
              <div>
                <h4 className="font-extrabold text-xs text-slate-900 leading-tight">
                  {mascot.name} • {mascot.title}
                </h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors duration-300 ${currentMeta.badgeColor}`}>
                    {currentMeta.label}
                  </span>
                </div>
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

          {/* Fluid Mascot Preview in Card */}
          <div className="relative py-2 flex flex-col items-center justify-center bg-gradient-to-b from-indigo-50/50 to-white rounded-2xl border border-indigo-100/60 overflow-hidden">
            {/* Dynamic ambient backdrop transition */}
            <div
              className={`absolute inset-0 bg-gradient-to-tr ${currentMeta.auraColor} opacity-50 blur-xl transition-all duration-700 ease-in-out`}
            />

            <div className="relative z-10 transition-transform duration-500 ease-out transform hover:scale-105">
              <LumiCharacter
                expression={expression}
                size="md"
                showSign={expression === 'speaking'}
                signText="¡Las tengo bajo control!"
                isFloating
              />
            </div>
          </div>

          {/* Dialogue bubble */}
          <div className="bg-gradient-to-r from-indigo-50/90 to-purple-50/70 p-3.5 rounded-2xl border border-indigo-100 text-xs text-slate-800 leading-relaxed shadow-2xs relative transition-all duration-300">
            <p className="italic">
              "{getContextualDialogue()}"
            </p>
          </div>

          {/* Expression Quick Switcher (Fluid Testing & Contextual control) */}
          <div className="space-y-1 pt-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block px-1">
              Expresiones reactivas de Lumi:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {(['idle', 'thinking', 'searching', 'success', 'offline'] as MascotExpression[]).map((exp) => (
                <button
                  key={exp}
                  onClick={() => handleSwitchExpression(exp)}
                  className={`px-2 py-1 rounded-xl text-[10px] font-bold border transition-all duration-300 transform active:scale-95 ${
                    expression === exp
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs scale-105'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  {exp === 'idle' && '☁️ Calma'}
                  {exp === 'thinking' && '🤔 Pensar'}
                  {exp === 'searching' && '🔍 Buscar'}
                  {exp === 'success' && '🎉 Éxito'}
                  {exp === 'offline' && '⛏️ Búnker'}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions Footer */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <button
              onClick={handleNextTip}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-semibold text-[11px] flex items-center gap-1.5 transition"
            >
              <Shuffle className="w-3 h-3" />
              <span>Chiste o truco</span>
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
                  triggerSuccess();
                }}
                className="p-1.5 rounded-xl text-amber-500 hover:bg-amber-50 transition"
                title="Celebrar"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Mascot Button with Dynamic Ambient Glow & Fluid Morphing */}
      <div className="relative group">
        {/* Fluid Dynamic Ambient Glow Halo that smoothly morphs with expression */}
        <div
          className={`absolute -inset-2 rounded-full blur-md bg-gradient-to-r ${currentMeta.auraColor} opacity-70 transition-all duration-700 ease-in-out ${
            expression === 'success' || expression === 'celebrating'
              ? 'scale-125 animate-ping opacity-90'
              : expression === 'searching'
              ? 'scale-115 animate-pulse'
              : 'scale-100'
          }`}
        />

        <button
          onClick={() => {
            if (!isOpen) {
              setIsOpen(true);
              triggerSuccess();
            } else {
              setIsOpen(false);
            }
          }}
          className="relative flex items-center justify-center p-1.5 rounded-full bg-white/95 backdrop-blur-md shadow-xl border-2 border-indigo-200/90 hover:border-indigo-400 hover:scale-105 transition-all duration-300 ease-out cursor-pointer group"
          title={`Hablar con ${mascot.name} (${currentMeta.label})`}
        >
          {/* Realtime Expression Rendering in Floating Trigger with Fluid Spring Transition */}
          <div className="w-13 h-13 sm:w-15 sm:h-15 flex items-center justify-center transition-transform duration-500 ease-out">
            <LumiCharacter
              expression={expression}
              size="sm"
              isFloating={false}
            />
          </div>

          {/* Expression status badge pill */}
          <span
            className={`absolute -bottom-1 px-1.5 py-0.2 rounded-full text-[8px] font-black uppercase tracking-wider shadow-xs border border-white transition-all duration-300 ${
              expression === 'success'
                ? 'bg-emerald-600 text-white'
                : expression === 'offline'
                ? 'bg-amber-600 text-white'
                : expression === 'searching'
                ? 'bg-indigo-600 text-white'
                : expression === 'thinking'
                ? 'bg-purple-600 text-white'
                : 'bg-indigo-600 text-white'
            }`}
          >
            {expression === 'success' ? 'Éxito' : expression === 'offline' ? 'Offline' : expression === 'searching' ? 'Lupa' : expression === 'thinking' ? 'Pensando' : mascot.name}
          </span>

          {/* Attention indicator bubble */}
          {!isOpen && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-xs animate-bounce">
              💬
            </span>
          )}
        </button>

        {/* Hover Hint */}
        {!isOpen && (
          <div className="absolute right-full mr-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900/90 text-white text-[11px] font-semibold rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-md flex items-center gap-1.5">
            <span>{currentMeta.label}</span>
          </div>
        )}
      </div>
    </div>
  );
};
