import React from 'react';
import { useMascot, MascotMood } from '../../context/MascotContext';
import { Sparkles, Glasses, Search, Flashlight, Camera, Heart, Zap } from 'lucide-react';

interface LumiAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  customMood?: MascotMood;
  interactive?: boolean;
  className?: string;
  showBadge?: boolean;
}

export const LumiAvatar: React.FC<LumiAvatarProps> = ({
  size = 'md',
  customMood,
  interactive = true,
  className = '',
  showBadge = false,
}) => {
  const { mascot, mood: contextMood, setMood, triggerCelebration } = useMascot();
  const mood = customMood || contextMood;

  const sizeClasses = {
    sm: 'w-9 h-9',
    md: 'w-14 h-14',
    lg: 'w-24 h-24',
    xl: 'w-36 h-36',
  };

  const getMoodAnimation = () => {
    switch (mood) {
      case 'celebrating':
        return 'animate-bounce';
      case 'searching':
        return 'animate-pulse';
      case 'scanning':
        return 'animate-spin-slow';
      case 'thinking':
        return 'animate-wiggle';
      case 'sleeping':
        return 'opacity-85';
      default:
        return 'hover:scale-105 transition-transform duration-300';
    }
  };

  const handleClick = () => {
    if (!interactive) return;
    if (mood === 'idle') {
      triggerCelebration();
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${
        interactive ? 'cursor-pointer' : ''
      } ${sizeClasses[size]} ${className}`}
      title={`${mascot.name} - ${mascot.title}`}
    >
      {/* Outer ambient glow */}
      <div
        className={`absolute inset-0 rounded-full blur-md opacity-40 transition-all duration-500 ${
          mood === 'celebrating'
            ? 'bg-amber-400 scale-125 opacity-70 animate-ping'
            : mood === 'searching'
            ? 'bg-indigo-400 scale-110 opacity-60'
            : mood === 'scanning'
            ? 'bg-emerald-400 scale-110'
            : 'bg-indigo-300'
        }`}
      />

      {/* Main Avatar Card / Character */}
      <div
        className={`relative w-full h-full rounded-full overflow-hidden border-2 shadow-md bg-white flex items-center justify-center transition-all ${getMoodAnimation()} ${
          mood === 'celebrating'
            ? 'border-amber-400 ring-4 ring-amber-200'
            : mood === 'searching'
            ? 'border-indigo-500 ring-2 ring-indigo-200'
            : 'border-indigo-200'
        }`}
      >
        <img
          src={mascot.image}
          alt={mascot.name}
          className="w-full h-full object-cover object-center pointer-events-none"
        />

        {/* Overlay mood icons */}
        {mood === 'searching' && (
          <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-1 rounded-full shadow-xs border border-white">
            <Search className="w-3 h-3" />
          </div>
        )}

        {mood === 'scanning' && (
          <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-1 rounded-full shadow-xs border border-white">
            <Zap className="w-3 h-3 animate-pulse" />
          </div>
        )}

        {mood === 'celebrating' && (
          <div className="absolute -top-1 -right-1 bg-amber-500 text-white p-1 rounded-full shadow-xs border border-white animate-spin">
            <Sparkles className="w-3 h-3" />
          </div>
        )}
      </div>

      {/* Optional Badge */}
      {showBadge && (
        <span className="absolute -bottom-2 px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide uppercase bg-indigo-600 text-white shadow-xs border border-white">
          {mascot.name}
        </span>
      )}
    </div>
  );
};
