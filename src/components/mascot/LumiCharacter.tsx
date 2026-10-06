import React from 'react';
import { Sparkles, CheckCircle2, Search, HardHat, Headphones } from 'lucide-react';
import { useMascot } from '../../context/MascotContext';
import { MASCOT_PROFILES } from '../../constants/mascotCopy';

export type LumiExpression = 
  | 'idle'
  | 'listening'
  | 'speaking'
  | 'searching'
  | 'scanning'
  | 'wink'
  | 'offline'
  | 'celebrating'
  | 'success'
  | 'thinking';

interface LumiCharacterProps {
  expression?: LumiExpression;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  className?: string;
  showSign?: boolean;
  signText?: string;
  isFloating?: boolean;
  imageOverride?: string;
}

export const LumiCharacter: React.FC<LumiCharacterProps> = ({
  expression = 'idle',
  size = 'md',
  className = '',
  showSign = false,
  signText = '¡Las tengo bajo control!',
  isFloating = true,
  imageOverride,
}) => {
  // Try to read mascot from context, fallback gracefully if outside provider
  let mascotImage = '/src/assets/images/lumi_mascot_1791202027224.jpg';
  let mascotName = 'Lumi';
  let accentColor = '#6366f1';

  try {
    const mascotContext = useMascot();
    if (mascotContext && mascotContext.mascot) {
      mascotImage = mascotContext.mascot.image;
      mascotName = mascotContext.mascot.name;
      accentColor = mascotContext.mascot.accentColor;
    }
  } catch (e) {
    mascotImage = MASCOT_PROFILES.lumi.image;
    mascotName = MASCOT_PROFILES.lumi.name;
    accentColor = MASCOT_PROFILES.lumi.accentColor;
  }

  const finalImage = imageOverride || mascotImage;

  const sizeMap = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-28 h-28',
    xl: 'w-40 h-40',
    hero: 'w-52 h-52',
  };

  const ringSizeMap = {
    sm: 'p-0.5',
    md: 'p-1',
    lg: 'p-1.5',
    xl: 'p-2',
    hero: 'p-2.5',
  };

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-center select-none ${
        isFloating ? 'animate-float' : ''
      } ${className}`}
    >
      {/* 1. SOUND WAVES / LISTENING RIPPLES (Web Speech API listening) */}
      {expression === 'listening' && (
        <div className="absolute inset-0 -m-3 pointer-events-none flex items-center justify-center z-0">
          <span className="absolute w-full h-full rounded-full border-2 border-indigo-400 opacity-60 animate-ping" />
          <span className="absolute w-4/5 h-4/5 rounded-full border border-purple-400 opacity-70 animate-pulse" />
        </div>
      )}

      {/* 2. SCANNER LASER CONE (QR Viewfinder scanning) */}
      {expression === 'scanning' && (
        <div className="absolute -bottom-6 w-24 h-16 pointer-events-none overflow-hidden z-20 flex justify-center">
          <div className="w-0 h-0 border-l-[36px] border-l-transparent border-r-[36px] border-r-transparent border-t-[50px] border-t-emerald-400/40 blur-[1px] animate-pulse" />
        </div>
      )}

      {/* 3. FLASHLIGHT BEAM (Searching with flashlight) */}
      {expression === 'searching' && (
        <div className="absolute -right-8 bottom-0 w-28 h-20 pointer-events-none z-10 opacity-80">
          <div className="w-0 h-0 border-t-[20px] border-t-transparent border-b-[20px] border-b-transparent border-r-[70px] border-r-amber-300/50 blur-[2px] rotate-[-25deg]" />
        </div>
      )}

      {/* 4. THOUGHT BUBBLE (Thinking mode) */}
      {expression === 'thinking' && (
        <div className="absolute -top-6 -right-2 z-30 pointer-events-none animate-bounce">
          <div className="px-2 py-0.5 rounded-full bg-white text-indigo-700 font-extrabold text-[11px] shadow-md border border-indigo-200 flex items-center gap-1">
            <span>🤔</span>
            <span>?</span>
          </div>
        </div>
      )}

      {/* 5. CELEBRATION CONFETTI (Success / Celebrating) */}
      {(expression === 'celebrating' || expression === 'success') && (
        <div className="absolute -top-3 -right-3 z-30 pointer-events-none animate-spin-slow">
          <Sparkles className="w-5 h-5 text-amber-400 fill-amber-300 drop-shadow-md" />
        </div>
      )}

      {/* CORE AVATAR CONTAINER: THE ORIGINAL BELOVED LUMI ARTWORK IMAGE */}
      <div
        className={`relative ${sizeMap[size]} transition-all duration-300 transform group-hover:scale-105`}
      >
        {/* Dynamic Ambient Aura Ring */}
        <div
          className={`absolute inset-0 rounded-full blur-sm transition-all duration-500 ${
            expression === 'success' || expression === 'celebrating'
              ? 'bg-gradient-to-r from-emerald-400 to-amber-400 opacity-80 animate-pulse'
              : expression === 'offline'
              ? 'bg-amber-500 opacity-70'
              : expression === 'scanning'
              ? 'bg-emerald-400 opacity-70 animate-pulse'
              : expression === 'listening'
              ? 'bg-purple-500 opacity-75 animate-ping'
              : 'bg-indigo-400 opacity-40'
          }`}
        />

        {/* Original Artwork Image with Smooth Rounded Contours and Dynamic Border */}
        <div
          className={`relative w-full h-full rounded-full overflow-hidden bg-white shadow-lg border-2 ${
            expression === 'offline'
              ? 'border-amber-500'
              : expression === 'scanning'
              ? 'border-emerald-400'
              : expression === 'success' || expression === 'celebrating'
              ? 'border-amber-400'
              : 'border-indigo-200'
          } ${ringSizeMap[size]}`}
        >
          <img
            src={finalImage}
            alt={mascotName}
            className="w-full h-full object-cover rounded-full select-none pointer-events-none transition-transform duration-300"
          />

          {/* OVERLAY: Laser Visor / Sunglasses (Scanning QR) */}
          {expression === 'scanning' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div className="w-4/5 h-1/4 rounded-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-blue-500 opacity-90 shadow-md border border-white/60 animate-pulse flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              </div>
            </div>
          )}

          {/* OVERLAY: Wink Effect 😉 (QR detected / Wink success) */}
          {expression === 'wink' && (
            <div className="absolute top-1/3 right-1/4 pointer-events-none z-20 animate-bounce">
              <span className="text-base sm:text-lg drop-shadow-md">✨😉</span>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* ACCESSORIES & PROPS LAYERED ON TOP OF ORIGINAL IMAGE      */}
        {/* ========================================================= */}

        {/* 1. MINER HELMET WITH GLOWING LAMP (Offline Bunker Mode) */}
        {expression === 'offline' && (
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center">
            {/* Little Miner Helmet */}
            <div className="relative w-10 sm:w-12 h-5 bg-gradient-to-b from-amber-400 to-amber-600 rounded-t-full border border-amber-800 shadow-md flex items-center justify-center">
              {/* Headlamp */}
              <span className="w-3.5 h-3.5 rounded-full bg-yellow-200 border-2 border-amber-900 shadow-sm shadow-yellow-300 animate-pulse flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
              </span>
              {/* Helmet Rim */}
              <div className="absolute -bottom-1 w-12 sm:w-14 h-1.5 bg-amber-600 rounded-full border border-amber-800" />
            </div>
          </div>
        )}

        {/* 2. HEADPHONES (Listening mode) */}
        {expression === 'listening' && (
          <div className="absolute -top-2 inset-x-0 z-20 pointer-events-none flex justify-between px-0.5">
            <span className="w-3.5 h-5 bg-indigo-600 rounded-l-md border border-indigo-900 shadow-sm" />
            <span className="w-3.5 h-5 bg-indigo-600 rounded-r-md border border-indigo-900 shadow-sm" />
          </div>
        )}

        {/* 3. FLASHLIGHT & UPSIDE-DOWN MAGNIFYING GLASS (Searching mode) */}
        {expression === 'searching' && (
          <div className="absolute -bottom-2 -right-2 z-20 pointer-events-none animate-wiggle">
            <span className="px-1.5 py-0.5 rounded-lg bg-amber-400 text-amber-950 font-black text-[10px] shadow-md border border-amber-600 flex items-center gap-0.5">
              <span>🔦</span>
              <span className="transform rotate-180">🔍</span>
            </span>
          </div>
        )}

        {/* 4. THUMBS UP / WINK BADGE */}
        {expression === 'wink' && (
          <div className="absolute -bottom-2 -right-2 z-20 pointer-events-none animate-bounce">
            <span className="px-1.5 py-0.5 rounded-full bg-white text-emerald-600 font-extrabold text-[10px] shadow-md border border-emerald-300 flex items-center gap-0.5">
              <span>👍</span>
              <span>¡Wink!</span>
            </span>
          </div>
        )}

        {/* 5. VICTORY STAR BADGE (Success) */}
        {(expression === 'success' || expression === 'celebrating') && (
          <div className="absolute -bottom-2 -right-2 z-20 pointer-events-none animate-bounce">
            <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-amber-950 font-black text-[10px] shadow-md border border-amber-500 flex items-center gap-0.5">
              <span>🎉</span>
              <span>¡Genial!</span>
            </span>
          </div>
        )}
      </div>

      {/* PLACARD / CARTELITO: "¡Las tengo bajo control!" (Synchronized with Voice / SpeechSynthesis) */}
      {(showSign || expression === 'speaking') && (
        <div className="mt-2 px-3 py-1 bg-amber-400 text-amber-950 font-black text-xs sm:text-sm rounded-xl border-2 border-amber-600 shadow-md transform -rotate-2 animate-bounce flex items-center gap-1.5 z-20">
          <Sparkles className="w-3.5 h-3.5 text-amber-800" />
          <span>{signText}</span>
        </div>
      )}
    </div>
  );
};
