import React, { useState, useEffect } from 'react';
import { useMascot, MascotMood } from '../../context/MascotContext';
import { LumiAvatar } from './LumiAvatar';
import { 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Sparkles, 
  X, 
  Check, 
  ArrowRight,
  HelpCircle,
  Shuffle
} from 'lucide-react';
import { getRandomMascotDialogue } from '../../constants/mascotCopy';

interface MascotMessageBubbleProps {
  dialoguePool?: string[];
  initialText?: string;
  mood?: MascotMood;
  title?: string;
  actionButton?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryButton?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
  className?: string;
  compact?: boolean;
  autoSpeak?: boolean;
}

export const MascotMessageBubble: React.FC<MascotMessageBubbleProps> = ({
  dialoguePool,
  initialText,
  mood = 'idle',
  title,
  actionButton,
  secondaryButton,
  onClose,
  className = '',
  compact = false,
  autoSpeak = false,
}) => {
  const { 
    mascot, 
    speakMascot, 
    stopSpeaking, 
    isSpeaking, 
    voiceEnabled, 
    setVoiceEnabled,
    activeMascotId,
    setActiveMascotId 
  } = useMascot();

  const [currentText, setCurrentText] = useState<string>(() => {
    if (initialText) return initialText;
    if (dialoguePool && dialoguePool.length > 0) {
      return getRandomMascotDialogue(dialoguePool);
    }
    return '';
  });

  // When initialText changes from parent
  useEffect(() => {
    if (initialText) {
      setCurrentText(initialText);
    }
  }, [initialText]);

  // Auto speak on mount if enabled
  useEffect(() => {
    if (autoSpeak && currentText && voiceEnabled) {
      speakMascot(currentText);
    }
  }, []);

  const handleShuffleDialogue = () => {
    if (dialoguePool && dialoguePool.length > 0) {
      const nextText = getRandomMascotDialogue(dialoguePool);
      setCurrentText(nextText);
      if (voiceEnabled) {
        speakMascot(nextText);
      }
    }
  };

  const handleToggleSpeak = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speakMascot(currentText);
    }
  };

  const handleSwitchMascot = () => {
    const nextId = activeMascotId === 'lumi' ? 'glis' : 'lumi';
    setActiveMascotId(nextId);
  };

  return (
    <div
      className={`relative rounded-3xl border shadow-sm p-4 sm:p-5 transition-all animate-in fade-in zoom-in-95 duration-200 ${
        activeMascotId === 'lumi'
          ? 'bg-gradient-to-r from-indigo-50/90 via-purple-50/80 to-indigo-50/90 border-indigo-200/90 text-indigo-950'
          : 'bg-gradient-to-r from-amber-50/90 via-orange-50/80 to-amber-50/90 border-amber-200/90 text-amber-950'
      } ${className}`}
    >
      <div className="flex items-start gap-3.5">
        {/* Animated Avatar */}
        <div className="shrink-0 flex flex-col items-center">
          <LumiAvatar
            size={compact ? 'md' : 'lg'}
            customMood={mood}
            showBadge
          />
          <button
            onClick={handleSwitchMascot}
            className="mt-2 text-[10px] text-slate-500 hover:text-indigo-600 underline font-medium"
            title="Cambiar entre Lumi y Glis"
          >
            Cambiar a {activeMascotId === 'lumi' ? 'Glis' : 'Lumi'}
          </button>
        </div>

        {/* Content & Speech Bubble */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-tight text-slate-900">
                {title || mascot.name}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/80 border border-slate-200 text-slate-600">
                {mascot.title}
              </span>
            </div>

            {/* Controls: Audio voice & shuffle */}
            <div className="flex items-center gap-1">
              {dialoguePool && dialoguePool.length > 1 && (
                <button
                  type="button"
                  onClick={handleShuffleDialogue}
                  className="p-1.5 rounded-xl hover:bg-white/80 text-slate-500 hover:text-indigo-600 transition"
                  title="Cambiar frase de la mascota"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={handleToggleSpeak}
                className={`p-1.5 rounded-xl transition ${
                  isSpeaking
                    ? 'bg-amber-500 text-white animate-pulse'
                    : 'hover:bg-white/80 text-slate-500 hover:text-indigo-600'
                }`}
                title={isSpeaking ? 'Detener voz' : `Escuchar a ${mascot.name} hablar`}
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-xl hover:bg-white/80 text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Dialogue Text */}
          <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal bg-white/70 backdrop-blur-2xs p-3 rounded-2xl border border-white/60 shadow-2xs">
            {currentText}
          </p>

          {/* Interactive Action Buttons */}
          {(actionButton || secondaryButton) && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {actionButton && (
                <button
                  type="button"
                  onClick={actionButton.onClick}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition transform hover:-translate-y-0.5 cursor-pointer"
                >
                  {actionButton.icon}
                  <span>{actionButton.label}</span>
                </button>
              )}

              {secondaryButton && (
                <button
                  type="button"
                  onClick={secondaryButton.onClick}
                  className="px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white text-slate-700 border border-slate-200 font-medium text-xs transition"
                >
                  {secondaryButton.label}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
