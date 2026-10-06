import React from 'react';
import { useMascot, MascotMood } from '../../context/MascotContext';
import { LumiCharacter, LumiExpression } from './LumiCharacter';

interface LumiAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  customMood?: MascotMood | LumiExpression;
  interactive?: boolean;
  className?: string;
  showBadge?: boolean;
  showSign?: boolean;
  signText?: string;
}

export const LumiAvatar: React.FC<LumiAvatarProps> = ({
  size = 'md',
  customMood,
  interactive = true,
  className = '',
  showBadge = false,
  showSign = false,
  signText = '¡Las tengo bajo control!',
}) => {
  const { mascot, mood: contextMood, triggerCelebration } = useMascot();
  const currentMood = (customMood || contextMood) as LumiExpression;

  const handleClick = () => {
    if (!interactive) return;
    triggerCelebration();
  };

  return (
    <div
      onClick={handleClick}
      className={`relative inline-flex flex-col items-center justify-center shrink-0 ${
        interactive ? 'cursor-pointer hover:scale-105 transition-transform' : ''
      } ${className}`}
      title={`${mascot.name} - ${mascot.title}`}
    >
      <LumiCharacter
        expression={currentMood}
        size={size}
        showSign={showSign}
        signText={signText}
      />

      {/* Optional Badge */}
      {showBadge && (
        <span className="mt-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide uppercase bg-indigo-600 text-white shadow-xs border border-white">
          {mascot.name}
        </span>
      )}
    </div>
  );
};
