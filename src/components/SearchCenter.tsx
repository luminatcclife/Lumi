import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  Mic, 
  MicOff, 
  QrCode as QrIcon, 
  MapPin, 
  Volume2, 
  VolumeX, 
  Camera, 
  X, 
  SlidersHorizontal, 
  Layers, 
  ArrowRight,
  PackageOpen,
  CheckCircle,
  Sparkles,
  Tag,
  Clock,
  Filter,
  Play,
  HelpCircle,
  Radio,
  Check
} from 'lucide-react';
import { useStorage } from '../context/StorageContext';
import { useMascot } from '../context/MascotContext';
import { MascotMessageBubble } from './mascot/MascotMessageBubble';
import { LumiAvatar } from './mascot/LumiAvatar';
import { LumiCharacter } from './mascot/LumiCharacter';
import { 
  StorageItem, 
  ItemSize, 
  UsageFrequency, 
  CATEGORIES, 
  SIZE_CONFIG, 
  FREQUENCY_CONFIG, 
  AREA_TYPE_CONFIG 
} from '../types/storage';

interface SearchCenterProps {
  onOpenQrModal: (title: string, payload: string, categoryOrType?: string) => void;
  onEditItem: (item: StorageItem) => void;
  onOpenScanner: () => void;
}

type SearchMode = 'object' | 'code' | 'audio' | 'map';

export const SearchCenter: React.FC<SearchCenterProps> = ({
  onOpenQrModal,
  onEditItem,
  onOpenScanner,
}) => {
  const { 
    items, 
    spaces, 
    locateItemOnMap, 
    getBreadcrumbs,
    setActiveTab,
    setActiveRoomId,
    setSelectedFurnitureId 
  } = useStorage();

  const { mascot, dialogues, triggerCelebration, triggerSuccess, setExpression } = useMascot();

  const [mode, setMode] = useState<SearchMode>('audio'); // Default to audio to immediately highlight voice commands

  // Text / Object search state
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSize, setSelectedSize] = useState<string>('all');
  const [selectedFrequency, setSelectedFrequency] = useState<string>('all');

  // Code search state
  const [codeQuery, setCodeQuery] = useState('');

  // Web Speech API: SpeechRecognition state
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [lastExecutedCommand, setLastExecutedCommand] = useState<{
    type: 'search' | 'locate' | 'filter_category' | 'filter_room' | 'reset';
    commandText: string;
    details: string;
  } | null>(null);

  // Web Speech API: SpeechSynthesis state
  const [speakingItemId, setSpeakingItemId] = useState<string | null>(null);
  const [isVoiceFeedbackEnabled, setIsVoiceFeedbackEnabled] = useState<boolean>(true);
  const [isSystemSpeaking, setIsSystemSpeaking] = useState<boolean>(false);

  // Map area picker search state
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('all');
  const [selectedFurnFilter, setSelectedFurnFilter] = useState<string>('all');

  const activeSpace = spaces[0];

  // Speech Recognition instance ref
  const recognitionRef = useRef<any>(null);

  // Text-to-speech helper with Web Speech API SpeechSynthesis
  const speakText = (text: string, onEndCallback?: () => void) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSystemSpeaking(true);
    utterance.onend = () => {
      setIsSystemSpeaking(false);
      if (onEndCallback) onEndCallback();
    };
    utterance.onerror = () => {
      setIsSystemSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSystemSpeaking(false);
      setSpeakingItemId(null);
    }
  };

  // Voice command processor
  const processVoiceCommand = (transcriptText: string) => {
    const raw = transcriptText.trim();
    if (!raw) return;

    const lower = raw.toLowerCase().replace(/^[¿¡?!\.]+|[¿¡?!\.]+$/g, '').trim();

    // 1. Command: Localizar en el mapa (e.g., "localizar taladro en el mapa", "ubica el pasaporte en el mapa")
    const locateRegex = /(?:localiza|localizar|ubicar|ubica|ver en el mapa|mostrar en el mapa)\s+(?:a|el|la|los|las)?\s*(.+)/i;
    const locateMatch = lower.match(locateRegex);
    if (locateMatch && locateMatch[1]) {
      const targetTerm = locateMatch[1].trim();
      const matched = items.find((i) =>
        i.name.toLowerCase().includes(targetTerm) ||
        i.tags.some((t) => t.toLowerCase().includes(targetTerm))
      );

      if (matched) {
        const breadcrumb = getBreadcrumbs(matched.containerId);
        setLastExecutedCommand({
          type: 'locate',
          commandText: raw,
          details: `Localizando "${matched.name}" en ${breadcrumb?.roomName || 'el mapa'}...`,
        });
        if (isVoiceFeedbackEnabled) {
          speakText(`Localizando ${matched.name} en el plano interactivo.`, () => {
            locateItemOnMap(matched.id);
          });
        } else {
          locateItemOnMap(matched.id);
        }
        return;
      }
    }

    // 2. Command: "¿Dónde está [X]?" / "¿Dónde guardé [X]?" / "Buscar [X]"
    const searchQuestionRegex = /(?:dónde está|donde esta|dónde están|donde estan|dónde guardé|donde guarde|dónde guardo|donde guardo|dónde se encuentra|buscar|busca|encuentra|encuéntrame|dime dónde está)\s+(?:a|el|la|los|las|mi|mis|un|una|unos|unas)?\s*(.+)/i;
    const questionMatch = lower.match(searchQuestionRegex);
    const searchTerm = questionMatch && questionMatch[1] ? questionMatch[1].trim() : lower;

    // 3. Command: Filtrar por Categoría (e.g. "mostrar herramientas", "ver documentos", "categoría electrónica")
    const categoryMatch = CATEGORIES.find((cat) =>
      lower.includes(cat.toLowerCase()) ||
      (cat.includes('Herramientas') && lower.includes('herramienta')) ||
      (cat.includes('Electrónica') && (lower.includes('electrónica') || lower.includes('electronica') || lower.includes('cables'))) ||
      (cat.includes('Documentos') && (lower.includes('documento') || lower.includes('papeles'))) ||
      (cat.includes('Ropa') && (lower.includes('ropa') || lower.includes('calzado'))) ||
      (cat.includes('Salud') && (lower.includes('salud') || lower.includes('botiquín') || lower.includes('medicina')))
    );

    if (categoryMatch && (lower.startsWith('mostrar') || lower.startsWith('ver') || lower.startsWith('filtrar') || lower.startsWith('solo'))) {
      setSelectedCategory(categoryMatch);
      setQuery('');
      setLastExecutedCommand({
        type: 'filter_category',
        commandText: raw,
        details: `Filtro activado: Categoría "${categoryMatch}"`,
      });
      if (isVoiceFeedbackEnabled) {
        speakText(`Mostrando artículos de la categoría ${categoryMatch}.`);
      }
      return;
    }

    // 4. Command: Filtrar por Habitación (e.g. "qué hay en el despacho", "mostrar trastero", "artículos en el salón")
    const roomMatch = activeSpace.rooms.find((r) =>
      lower.includes(r.name.toLowerCase()) ||
      (r.name.includes('Despacho') && lower.includes('despacho')) ||
      (r.name.includes('Salón') && (lower.includes('salón') || lower.includes('salon'))) ||
      (r.name.includes('Dormitorio') && (lower.includes('dormitorio') || lower.includes('habitación') || lower.includes('habitacion'))) ||
      (r.name.includes('Trastero') && (lower.includes('trastero') || lower.includes('garaje')))
    );

    if (roomMatch && (lower.includes('qué hay en') || lower.includes('que hay en') || lower.includes('mostrar') || lower.includes('cosas en') || lower.includes('estancia'))) {
      setMode('map');
      setSelectedRoomFilter(roomMatch.id);
      setSelectedFurnFilter('all');
      setQuery('');
      setLastExecutedCommand({
        type: 'filter_room',
        commandText: raw,
        details: `Mostrando artículos en la zona "${roomMatch.name}"`,
      });
      if (isVoiceFeedbackEnabled) {
        speakText(`Mostrando todo lo guardado en ${roomMatch.name}.`);
      }
      return;
    }

    // 5. Command: Limpiar / Restablecer búsqueda (e.g. "limpiar búsqueda", "restablecer", "ver todo")
    if (lower === 'limpiar' || lower === 'borrar' || lower.includes('limpiar búsqueda') || lower.includes('restablecer') || lower.includes('ver todo') || lower.includes('mostrar todo')) {
      setQuery('');
      setSelectedCategory('all');
      setSelectedSize('all');
      setSelectedFrequency('all');
      setSelectedRoomFilter('all');
      setSelectedFurnFilter('all');
      setLastExecutedCommand({
        type: 'reset',
        commandText: raw,
        details: 'Búsqueda restablecida. Mostrando todos los artículos.',
      });
      if (isVoiceFeedbackEnabled) {
        speakText('Búsqueda restablecida. Mostrando todos los artículos.');
      }
      return;
    }

    // 6. Standard Search by Keyword extracted
    setQuery(searchTerm);
    const matches = items.filter((i) => {
      const q = searchTerm.toLowerCase();
      const breadcrumb = getBreadcrumbs(i.containerId);
      return (
        i.name.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        i.tags.some((t) => t.toLowerCase().includes(q)) ||
        (breadcrumb && (
          breadcrumb.roomName.toLowerCase().includes(q) ||
          breadcrumb.furnitureName.toLowerCase().includes(q) ||
          breadcrumb.containerName.toLowerCase().includes(q)
        ))
      );
    });

    if (matches.length > 0) {
      const topMatch = matches[0];
      const breadcrumb = getBreadcrumbs(topMatch.containerId);
      setLastExecutedCommand({
        type: 'search',
        commandText: raw,
        details: `Encontrado: "${topMatch.name}" en ${breadcrumb?.roomName || 'casa'} (${breadcrumb?.furnitureName || ''})`,
      });

      if (isVoiceFeedbackEnabled) {
        let answer = `He encontrado ${topMatch.name}. `;
        if (breadcrumb) {
          answer += `Está guardado en ${breadcrumb.roomName}, en ${breadcrumb.furnitureName}, dentro de ${breadcrumb.containerName}.`;
        }
        if (matches.length > 1) {
          answer += ` Y ${matches.length - 1} objetos más coincidentes.`;
        }
        speakText(answer);
        triggerSuccess();
      }
    } else {
      setLastExecutedCommand({
        type: 'search',
        commandText: raw,
        details: `No se encontró ningún artículo para "${searchTerm}".`,
      });
      setExpression('searching');
      if (isVoiceFeedbackEnabled) {
        speakText(`No he encontrado ningún artículo registrado con el nombre ${searchTerm}.`);
      }
    }
  };

  // Setup Web Speech API SpeechRecognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setSpeechError('Tu navegador no soporta la Web Speech API de forma nativa.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setSpeechError(null);
      setExpression('listening');
      stopSpeaking();
    };

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript;
      setVoiceTranscript(transcript);

      // If it's a final result, trigger voice command processor
      if (event.results[current].isFinal) {
        processVoiceCommand(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        setSpeechError('Permiso de micrófono no concedido en el navegador.');
      } else if (event.error === 'no-speech') {
        setSpeechError('No se detectó voz. Inténtalo de nuevo hablando cerca del micrófono.');
      } else {
        setSpeechError(`Error de reconocimiento: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch (e) {}
    };
  }, [items, isVoiceFeedbackEnabled, activeSpace, getBreadcrumbs]);

  const toggleListening = () => {
    if (!speechSupported) {
      alert('Tu navegador no soporta la Web Speech API. Prueba con Google Chrome, Edge o Safari.');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
      setIsListening(false);
    } else {
      setVoiceTranscript('');
      setSpeechError(null);
      stopSpeaking();
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.warn('Recognition start exception:', e);
        setIsListening(false);
      }
    }
  };

  // Text-to-speech for single item button
  const speakSingleItem = (item: StorageItem) => {
    const breadcrumb = getBreadcrumbs(item.containerId);
    let textToSpeak = `${item.name}. `;
    if (breadcrumb) {
      textToSpeak += `Ubicado en ${breadcrumb.roomName}, en ${breadcrumb.furnitureName}, dentro de ${breadcrumb.containerName}.`;
    }
    setSpeakingItemId(item.id);
    speakText(textToSpeak, () => setSpeakingItemId(null));
  };

  // Filtered Items logic
  const searchResults = useMemo(() => {
    return items.filter((item) => {
      const breadcrumb = getBreadcrumbs(item.containerId);

      // Mode: Code / QR
      if (mode === 'code') {
        if (!codeQuery.trim()) return false;
        const q = codeQuery.trim().toLowerCase();
        const matchesItemQr = item.qrCode.toLowerCase().includes(q) || item.id.toLowerCase().includes(q);
        const matchesContainerQr = breadcrumb && breadcrumb.containerId.toLowerCase().includes(q);
        return matchesItemQr || matchesContainerQr;
      }

      // Mode: Interactive Map Area Picker
      if (mode === 'map') {
        if (selectedRoomFilter !== 'all' && breadcrumb?.roomId !== selectedRoomFilter) {
          return false;
        }
        if (selectedFurnFilter !== 'all' && breadcrumb?.furnitureId !== selectedFurnFilter) {
          return false;
        }
      }

      // Query filter (applies across object, audio and map modes)
      if (query.trim()) {
        const q = query.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesCat = item.category.toLowerCase().includes(q);
        const matchesTags = item.tags.some((t) => t.toLowerCase().includes(q));
        const matchesNotes = item.notes?.toLowerCase().includes(q) || false;
        const matchesLoc =
          breadcrumb &&
          (breadcrumb.roomName.toLowerCase().includes(q) ||
            breadcrumb.furnitureName.toLowerCase().includes(q) ||
            breadcrumb.containerName.toLowerCase().includes(q));

        if (!matchesName && !matchesCat && !matchesTags && !matchesNotes && !matchesLoc) {
          return false;
        }
      }

      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (selectedSize !== 'all' && item.size !== selectedSize) {
        return false;
      }
      if (selectedFrequency !== 'all' && item.frequency !== selectedFrequency) {
        return false;
      }

      return true;
    });
  }, [
    items,
    mode,
    query,
    codeQuery,
    selectedCategory,
    selectedSize,
    selectedFrequency,
    selectedRoomFilter,
    selectedFurnFilter,
    getBreadcrumbs,
  ]);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50/70 p-4 sm:p-6 max-w-6xl mx-auto w-full space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping"></span>
              <h1 className="font-extrabold text-slate-900 text-xl tracking-tight">
                Centro de Búsqueda y Comandos por Voz
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Controla la búsqueda con tu propia voz mediante la Web Speech API: pregunta dónde guardaste algo, localiza en el mapa o filtra al instante.
            </p>
          </div>

          {/* Voice Response Toggle Switch */}
          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200">
            <button
              onClick={() => setIsVoiceFeedbackEnabled(!isVoiceFeedbackEnabled)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                isVoiceFeedbackEnabled
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              {isVoiceFeedbackEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>Respuesta por voz: {isVoiceFeedbackEnabled ? 'Activada' : 'Silencio'}</span>
            </button>

            {isSystemSpeaking && (
              <button
                onClick={stopSpeaking}
                className="px-2 py-1 rounded-lg bg-rose-100 text-rose-700 text-xs font-bold hover:bg-rose-200 transition"
              >
                Detener audio
              </button>
            )}
          </div>
        </div>

        {/* 4 Search Mode Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => setMode('audio')}
            className={`p-3 rounded-2xl border text-left transition flex items-center gap-3 ${
              mode === 'audio'
                ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600 shadow-xs'
                : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                mode === 'audio' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Mic className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-xs text-slate-900 block truncate">
                Comandos de Voz
              </span>
              <span className="text-[10px] text-indigo-600 font-semibold block">Web Speech API</span>
            </div>
          </button>

          <button
            onClick={() => setMode('object')}
            className={`p-3 rounded-2xl border text-left transition flex items-center gap-3 ${
              mode === 'object'
                ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600 shadow-xs'
                : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                mode === 'object' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Search className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-xs text-slate-900 block truncate">
                Por Objeto / Texto
              </span>
              <span className="text-[10px] text-slate-500 block">Nombre y filtros</span>
            </div>
          </button>

          <button
            onClick={() => setMode('code')}
            className={`p-3 rounded-2xl border text-left transition flex items-center gap-3 ${
              mode === 'code'
                ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600 shadow-xs'
                : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                mode === 'code' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <QrIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-xs text-slate-900 block truncate">
                Por Código / QR
              </span>
              <span className="text-[10px] text-slate-500 block">Escaneo rápido</span>
            </div>
          </button>

          <button
            onClick={() => setMode('map')}
            className={`p-3 rounded-2xl border text-left transition flex items-center gap-3 ${
              mode === 'map'
                ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600 shadow-xs'
                : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                mode === 'map' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-xs text-slate-900 block truncate">
                Por Mapa / Zona
              </span>
              <span className="text-[10px] text-slate-500 block">Selector espacial</span>
            </div>
          </button>
        </div>

        {/* Dynamic Controls based on selected mode */}
        <div className="pt-2">
          {/* ======================================================== */}
          {/* MODE: AUDIO & VOICE COMMAND CONSOLE (Web Speech API)     */}
          {/* ======================================================== */}
          {mode === 'audio' && (
            <div className="space-y-5">
              {/* Interactive Speech Recognition Center */}
              <div className="p-8 bg-gradient-to-r from-indigo-50/80 via-purple-50/60 to-indigo-50/80 rounded-3xl border border-indigo-200 flex flex-col items-center justify-center text-center space-y-4 relative overflow-hidden">
                {/* Audio visualizer glow waves when listening */}
                {isListening && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <span className="w-36 h-36 rounded-full bg-rose-400/20 animate-ping"></span>
                    <span className="w-52 h-52 rounded-full bg-indigo-400/15 animate-pulse"></span>
                  </div>
                )}

                {/* Dynamic Animated Mascot Character reacting to Voice / SpeechSynthesis */}
                <div className="z-10 mb-2 flex flex-col items-center">
                  <LumiCharacter
                    expression={
                      isSystemSpeaking
                        ? 'speaking'
                        : isListening
                        ? 'listening'
                        : lastExecutedCommand
                        ? 'celebrating'
                        : 'idle'
                    }
                    size="md"
                    showSign={isSystemSpeaking}
                    signText="¡Las tengo bajo control!"
                    isFloating
                  />
                </div>

                {/* Big Microphone button */}
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`w-20 h-20 rounded-full flex items-center justify-center text-white transition transform shadow-xl cursor-pointer z-10 ${
                    isListening
                      ? 'bg-rose-600 scale-110 animate-pulse ring-8 ring-rose-200'
                      : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-105 ring-4 ring-indigo-100'
                  }`}
                  title={isListening ? 'Detener micrófono' : 'Hablar con Web Speech API'}
                >
                  {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                </button>

                <div className="z-10">
                  <h3 className="font-bold text-slate-900 text-lg flex items-center justify-center gap-2">
                    {isListening ? (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                        <span>Escuchando... Di tu comando en voz alta</span>
                      </>
                    ) : (
                      <span>Toca el micrófono para dictar un comando de voz</span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Web Speech API integrada con reconocimiento continuo y síntesis vocal en español
                  </p>
                </div>

                {/* Live Transcript Bubble */}
                {voiceTranscript && (
                  <div className="p-3 px-5 bg-white/95 backdrop-blur-xs rounded-2xl border border-indigo-200 text-sm font-bold text-indigo-950 shadow-md max-w-xl z-10 animate-in fade-in zoom-in-95">
                    <span className="text-xs text-indigo-500 font-normal block mb-0.5">Transcripción en directo:</span>
                    "{voiceTranscript}"
                  </div>
                )}

                {speechError && (
                  <p className="text-xs text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200 z-10 max-w-md">
                    {speechError}
                  </p>
                )}

                {/* Executed Command Feedback */}
                {lastExecutedCommand && (
                  <div className="z-10 p-3 px-4 bg-emerald-50 text-emerald-950 border border-emerald-300 rounded-2xl text-xs flex items-center gap-2 shadow-2xs">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>Comando ejecutado:</strong> {lastExecutedCommand.details}
                    </span>
                  </div>
                )}
              </div>

              {/* Voice Command Shortcuts / Cheat Sheet */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Comandos de voz recomendados (puedes decirlos o pulsar para probar):</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Clic para simular</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      setVoiceTranscript('¿Dónde guardé el pasaporte?');
                      processVoiceCommand('¿Dónde guardé el pasaporte?');
                    }}
                    className="p-2.5 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left text-xs transition group shadow-2xs"
                  >
                    <span className="font-semibold text-slate-800 group-hover:text-indigo-700 block truncate">
                      🎙️ "¿Dónde guardé el pasaporte?"
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Busca y dice la ubicación por voz
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setVoiceTranscript('Localiza el taladro en el mapa');
                      processVoiceCommand('Localiza el taladro en el mapa');
                    }}
                    className="p-2.5 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left text-xs transition group shadow-2xs"
                  >
                    <span className="font-semibold text-slate-800 group-hover:text-indigo-700 block truncate">
                      🎙️ "Localiza el taladro en el mapa"
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Salta al plano con baliza radar
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setVoiceTranscript('¿Dónde están las llaves de repuesto?');
                      processVoiceCommand('¿Dónde están las llaves de repuesto?');
                    }}
                    className="p-2.5 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left text-xs transition group shadow-2xs"
                  >
                    <span className="font-semibold text-slate-800 group-hover:text-indigo-700 block truncate">
                      🎙️ "¿Dónde están las llaves?"
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Responde: "En el recibidor..."
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setVoiceTranscript('Mostrar herramientas');
                      processVoiceCommand('Mostrar herramientas');
                    }}
                    className="p-2.5 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left text-xs transition group shadow-2xs"
                  >
                    <span className="font-semibold text-slate-800 group-hover:text-indigo-700 block truncate">
                      🎙️ "Mostrar herramientas"
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Aplica filtro de categoría
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setVoiceTranscript('¿Qué hay en el trastero?');
                      processVoiceCommand('¿Qué hay en el trastero?');
                    }}
                    className="p-2.5 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left text-xs transition group shadow-2xs"
                  >
                    <span className="font-semibold text-slate-800 group-hover:text-indigo-700 block truncate">
                      🎙️ "¿Qué hay en el trastero?"
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Filtra por estancia física
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setVoiceTranscript('Limpiar búsqueda');
                      processVoiceCommand('Limpiar búsqueda');
                    }}
                    className="p-2.5 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left text-xs transition group shadow-2xs"
                  >
                    <span className="font-semibold text-slate-800 group-hover:text-indigo-700 block truncate">
                      🎙️ "Limpiar búsqueda"
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Muestra todos los artículos
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODE: OBJECT / TEXT SEARCH                               */}
          {/* ======================================================== */}
          {mode === 'object' && (
            <div className="space-y-3">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Escribe lo que buscas: 'pasaporte', '#invierno', 'taladro', 'cables'..."
                  className="w-full pl-10 pr-24 py-3 rounded-2xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50/60 focus:bg-white transition"
                />
                
                {/* Voice mic inside text input */}
                <div className="absolute right-2.5 flex items-center gap-1">
                  {query && (
                    <button
                      onClick={() => setQuery('')}
                      className="text-xs font-semibold text-slate-400 hover:text-slate-600 px-1.5 py-1 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`p-1.5 rounded-xl transition ${
                      isListening ? 'bg-rose-600 text-white animate-pulse' : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'
                    }`}
                    title="Dictar por voz"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filters chip row */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-xs focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">Todas las categorías</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-xs focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">Cualquier tamaño (XS a XL)</option>
                  {(Object.keys(SIZE_CONFIG) as ItemSize[]).map((sz) => (
                    <option key={sz} value={sz}>
                      {SIZE_CONFIG[sz].label}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedFrequency}
                  onChange={(e) => setSelectedFrequency(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-xs focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">Cualquier frecuencia</option>
                  {(Object.keys(FREQUENCY_CONFIG) as UsageFrequency[]).map((fq) => (
                    <option key={fq} value={fq}>
                      {FREQUENCY_CONFIG[fq].icon} {FREQUENCY_CONFIG[fq].label}
                    </option>
                  ))}
                </select>

                {(query || selectedCategory !== 'all' || selectedSize !== 'all' || selectedFrequency !== 'all') && (
                  <button
                    onClick={() => {
                      setQuery('');
                      setSelectedCategory('all');
                      setSelectedSize('all');
                      setSelectedFrequency('all');
                    }}
                    className="text-xs text-rose-600 hover:underline font-medium px-2 py-1"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODE: CODE / QR SEARCH                                   */}
          {/* ======================================================== */}
          {mode === 'code' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <QrIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={codeQuery}
                    onChange={(e) => setCodeQuery(e.target.value)}
                    placeholder="Introduce el código o ID (ej: itm_pasaportes o UBICAYA:CONT:...)"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                  />
                </div>
                <button
                  onClick={onOpenScanner}
                  className="px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition"
                >
                  <Camera className="w-4 h-4" />
                  <span>Abrir Cámara Escáner</span>
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Puedes escribir parte del ID o pulsar el botón para escanear la pegatina QR física de cualquier caja o artículo con la cámara.
              </p>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODE: INTERACTIVE MAP AREA PICKER                        */}
          {/* ======================================================== */}
          {mode === 'map' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => {
                    setSelectedRoomFilter('all');
                    setSelectedFurnFilter('all');
                  }}
                  className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition ${
                    selectedRoomFilter === 'all'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  🏢 Toda la Casa
                </button>
                {activeSpace.rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => {
                      setSelectedRoomFilter(room.id);
                      setSelectedFurnFilter('all');
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs font-medium transition flex items-center justify-between ${
                      selectedRoomFilter === room.id
                        ? 'border-indigo-600 bg-indigo-50 font-bold text-indigo-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: room.color }}></span>
                      <span className="truncate">{room.name}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Sub-selector for furniture if room is chosen */}
              {selectedRoomFilter !== 'all' && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase mr-1">
                    Estructuras en esta zona:
                  </span>
                  <button
                    onClick={() => setSelectedFurnFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                      selectedFurnFilter === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Todos los muebles
                  </button>
                  {activeSpace.rooms
                    .find((r) => r.id === selectedRoomFilter)
                    ?.furniture.map((furn) => (
                      <button
                        key={furn.id}
                        onClick={() => setSelectedFurnFilter(furn.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 ${
                          selectedFurnFilter === furn.id
                            ? 'bg-indigo-600 text-white font-semibold'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <span>{AREA_TYPE_CONFIG[furn.type]?.icon || '📦'}</span>
                        <span>{furn.name}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span className="font-semibold">
            {searchResults.length} {searchResults.length === 1 ? 'artículo encontrado' : 'artículos encontrados'}
          </span>
          {searchResults.length > 0 && (
            <span className="text-slate-400">
              Pulsa el icono de altavoz para escuchar la ubicación en voz alta
            </span>
          )}
        </div>

        {/* Results Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {searchResults.map((item) => {
            const breadcrumb = getBreadcrumbs(item.containerId);
            const sz = SIZE_CONFIG[item.size];
            const fq = FREQUENCY_CONFIG[item.frequency];
            const isSpeakingThis = speakingItemId === item.id;

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-indigo-300 transition flex flex-col justify-between group"
              >
                <div>
                  {/* Top Bar with Emoji & Category */}
                  <div className="flex items-start gap-3">
                    <span className="text-3xl p-2.5 rounded-2xl bg-slate-50 border border-slate-100 shrink-0">
                      {item.photoEmoji || '📦'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded truncate max-w-[170px] inline-block">
                        {item.category}
                      </span>
                      <h3 className="font-bold text-slate-900 text-base mt-1 leading-snug line-clamp-1">
                        {item.name}
                      </h3>
                      {item.quantity > 1 && (
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Cantidad: {item.quantity} unidades
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${sz.color}`}>
                      {sz.badge}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${fq.color}`}>
                      {fq.icon} {fq.short}
                    </span>
                  </div>

                  {/* Tags */}
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {item.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Physical Location Breadcrumb Card */}
                  {breadcrumb && (
                    <div className="mt-3.5 p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs">
                      <div className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-indigo-600" />
                        <span>Ubicación Exacta:</span>
                      </div>
                      <div className="font-semibold text-slate-800 text-xs leading-snug">
                        <span>{breadcrumb.roomName}</span>
                        <span className="mx-1 text-slate-400 font-normal">➔</span>
                        <span>{breadcrumb.furnitureName}</span>
                        <span className="mx-1 text-slate-400 font-normal">➔</span>
                        <span className="text-indigo-600 font-bold">{breadcrumb.containerName}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                  <button
                    onClick={() => locateItemOnMap(item.id)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Localizar en Mapa</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {/* Read out loud button with speech synthesis */}
                    <button
                      title="Escuchar ubicación en voz alta (Web Speech API)"
                      onClick={() => speakSingleItem(item)}
                      className={`p-1.5 rounded-xl transition ${
                        isSpeakingThis
                          ? 'bg-amber-500 text-white shadow-xs animate-bounce'
                          : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'
                      }`}
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>

                    <button
                      title="Ver etiqueta QR"
                      onClick={() => onOpenQrModal(item.name, item.qrCode, item.category)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                    >
                      <QrIcon className="w-4 h-4" />
                    </button>

                    <button
                      title="Editar"
                      onClick={() => onEditItem(item)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                    >
                      <span className="text-xs font-semibold px-1">Editar</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty Search State with Mascot Humor */}
        {searchResults.length === 0 && (
          <div className="max-w-xl mx-auto py-4">
            <MascotMessageBubble
              dialoguePool={dialogues.searchEmpty}
              mood="searching"
              title={`${mascot.name} buscando con linterna y lupa...`}
              actionButton={{
                label: 'Guardar este objeto ahora',
                onClick: () => setActiveTab('save'),
                icon: <ArrowRight className="w-3.5 h-3.5" />,
              }}
              secondaryButton={{
                label: 'Explorar cajas en el plano 2D',
                onClick: () => setActiveTab('map'),
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
