import React, { useState } from 'react';
import { useMascot } from '../../context/MascotContext';
import { LumiAvatar } from './LumiAvatar';
import { 
  Sparkles, 
  Map, 
  Camera, 
  Mic, 
  CheckCircle, 
  ArrowRight, 
  Volume2, 
  VolumeX,
  X 
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface MascotOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToMap: () => void;
  onGoToSave: () => void;
}

export const MascotOnboardingModal: React.FC<MascotOnboardingModalProps> = ({
  isOpen,
  onClose,
  onGoToMap,
  onGoToSave,
}) => {
  const { 
    mascot, 
    dialogues, 
    activeMascotId, 
    setActiveMascotId, 
    speakMascot, 
    voiceEnabled, 
    setVoiceEnabled,
    triggerCelebration 
  } = useMascot();

  const [step, setStep] = useState<number>(0);

  if (!isOpen) return null;

  const handleStart = () => {
    try {
      localStorage.setItem('ubicaya_onboarding_shown', 'true');
    } catch (e) {}
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 },
    });
    triggerCelebration();
    onClose();
  };

  const currentDialogue = dialogues.onboarding[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header background with gentle gradient */}
        <div className="px-6 pt-8 pb-4 bg-gradient-to-b from-indigo-100/70 via-purple-50/50 to-white flex flex-col items-center text-center relative">
          <button
            onClick={handleStart}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white/80 transition"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Big Avatar */}
          <div className="mb-3">
            <LumiAvatar size="xl" customMood="celebrating" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Memoria Externa Oficial</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            ¡Hola humano! Soy {mascot.name}
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            {mascot.tagline}
          </p>
        </div>

        {/* Mascot Speech Bubble */}
        <div className="px-6 py-2">
          <div className="bg-indigo-50/80 border border-indigo-200/90 rounded-2xl p-4 text-xs sm:text-sm text-slate-800 leading-relaxed relative">
            <div className="flex items-center justify-between gap-2 mb-2 pb-1 border-b border-indigo-100">
              <span className="font-bold text-indigo-900 text-xs flex items-center gap-1">
                <span>💬 Mensaje de {mascot.name}</span>
              </span>
              <button
                onClick={() => speakMascot(currentDialogue)}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-white/80 px-2 py-0.5 rounded-lg border border-indigo-100"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Escuchar</span>
              </button>
            </div>
            <p className="italic">
              "{currentDialogue}"
            </p>
          </div>
        </div>

        {/* 3 Core Superpowers */}
        <div className="px-6 py-4 space-y-2.5">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Map className="w-4 h-4" />
            </div>
            <div className="text-left min-w-0">
              <h4 className="font-bold text-xs text-slate-900">1. Plano Visual, Cero Tablas Aburridas</h4>
              <p className="text-[11px] text-slate-500 leading-tight">
                Ves tus habitaciones y muebles reales con balizas luminosas para ir al grano.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Camera className="w-4 h-4" />
            </div>
            <div className="text-left min-w-0">
              <h4 className="font-bold text-xs text-slate-900">2. Escaneo QR para no revolver cajas</h4>
              <p className="text-[11px] text-slate-500 leading-tight">
                Pegas un código QR en una caja del trastero y sabes qué hay dentro con solo apuntar la cámara.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <Mic className="w-4 h-4" />
            </div>
            <div className="text-left min-w-0">
              <h4 className="font-bold text-xs text-slate-900">3. Búsqueda y Registro por Voz</h4>
              <p className="text-[11px] text-slate-500 leading-tight">
                Pregúntame en voz alta "¿Dónde está el pasaporte?" y te diré exactamente dónde está.
              </p>
            </div>
          </div>
        </div>

        {/* Mascot Selector (Lumi vs Glis) */}
        <div className="px-6 py-2 border-t border-slate-100 flex items-center justify-between text-xs bg-slate-50/50">
          <span className="font-medium text-slate-600">Elige tu compañero:</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveMascotId('lumi')}
              className={`px-2.5 py-1 rounded-xl font-bold text-xs transition border ${
                activeMascotId === 'lumi'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              ☁️ Lumi
            </button>
            <button
              onClick={() => setActiveMascotId('glis')}
              className={`px-2.5 py-1 rounded-xl font-bold text-xs transition border ${
                activeMascotId === 'glis'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              🐿️ Glis
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={() => {
              handleStart();
              onGoToMap();
            }}
            className="flex-1 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition transform hover:-translate-y-0.5 cursor-pointer"
          >
            <span>Ver Mi Plano Espacial</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              handleStart();
              onGoToSave();
            }}
            className="py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
          >
            <span>Guardar mi Primer Objeto</span>
          </button>
        </div>
      </div>
    </div>
  );
};
