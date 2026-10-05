import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  MascotId, 
  MascotProfile, 
  MASCOT_PROFILES, 
  LUMI_DIALOGUES, 
  GLIS_DIALOGUES, 
  MascotDialogues,
  getRandomMascotDialogue 
} from '../constants/mascotCopy';

export type MascotMood = 
  | 'idle' 
  | 'thinking' 
  | 'searching' 
  | 'scanning' 
  | 'celebrating' 
  | 'sleeping' 
  | 'surprised';

interface MascotContextType {
  activeMascotId: MascotId;
  mascot: MascotProfile;
  dialogues: MascotDialogues;
  mood: MascotMood;
  setMood: (mood: MascotMood) => void;
  setActiveMascotId: (id: MascotId) => void;
  voiceEnabled: boolean;
  setVoiceEnabled: (enabled: boolean) => void;
  speakMascot: (text: string) => void;
  stopSpeaking: () => void;
  isSpeaking: boolean;
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;
  triggerCelebration: () => void;
}

const MascotContext = createContext<MascotContextType | undefined>(undefined);

const LS_KEY_MASCOT = 'ubicaya_mascot_id';
const LS_KEY_ONBOARDING = 'ubicaya_onboarding_shown';
const LS_KEY_VOICE = 'ubicaya_mascot_voice';

export const MascotProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeMascotId, setActiveMascotIdState] = useState<MascotId>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY_MASCOT);
      if (saved === 'glis' || saved === 'lumi') return saved;
    } catch (e) {}
    return 'lumi';
  });

  const [mood, setMood] = useState<MascotMood>('idle');
  const [voiceEnabled, setVoiceEnabledState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY_VOICE);
      return saved !== 'false';
    } catch (e) {
      return true;
    }
  });

  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);

  // Check onboarding on initial mount
  useEffect(() => {
    try {
      const shown = localStorage.getItem(LS_KEY_ONBOARDING);
      if (!shown) {
        setIsOnboardingOpen(true);
      }
    } catch (e) {}
  }, []);

  const setActiveMascotId = (id: MascotId) => {
    setActiveMascotIdState(id);
    try {
      localStorage.setItem(LS_KEY_MASCOT, id);
    } catch (e) {}
  };

  const setVoiceEnabled = (enabled: boolean) => {
    setVoiceEnabledState(enabled);
    try {
      localStorage.setItem(LS_KEY_VOICE, String(enabled));
    } catch (e) {}
  };

  const mascot = MASCOT_PROFILES[activeMascotId];
  const dialogues = activeMascotId === 'glis' ? GLIS_DIALOGUES : LUMI_DIALOGUES;

  const speakMascot = (text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    try {
      window.speechSynthesis.cancel();
      // Clean emoji or formatting for clean speech
      const cleaned = text.replace(/[*_#~]/g, '').replace(/[\u{1F300}-\u{1F9FF}]/gu, '');
      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.lang = 'es-ES';
      utterance.rate = 1.05;
      utterance.pitch = activeMascotId === 'glis' ? 1.25 : 1.1; // Lumi has warm clever pitch, Glis higher cheerful pitch

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const triggerCelebration = () => {
    setMood('celebrating');
    setTimeout(() => {
      setMood('idle');
    }, 4500);
  };

  return (
    <MascotContext.Provider
      value={{
        activeMascotId,
        mascot,
        dialogues,
        mood,
        setMood,
        setActiveMascotId,
        voiceEnabled,
        setVoiceEnabled,
        speakMascot,
        stopSpeaking,
        isSpeaking,
        isOnboardingOpen,
        setIsOnboardingOpen,
        triggerCelebration,
      }}
    >
      {children}
    </MascotContext.Provider>
  );
};

export const useMascot = () => {
  const context = useContext(MascotContext);
  if (!context) {
    throw new Error('useMascot must be used within a MascotProvider');
  }
  return context;
};
