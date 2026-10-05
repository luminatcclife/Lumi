import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  Mic, 
  MicOff, 
  FileText, 
  Sliders, 
  Upload, 
  Sparkles, 
  Check, 
  MapPin, 
  RefreshCw, 
  AlertCircle,
  CheckCircle2,
  Tag,
  Save,
  Smile,
  ArrowRight,
  Layers,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';
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
  AREA_TYPE_CONFIG 
} from '../types/storage';

interface SaveCenterProps {
  onOpenAdvisor: () => void;
}

type SaveMode = 'photo' | 'voice' | 'text' | 'form';

export const SaveCenter: React.FC<SaveCenterProps> = ({ onOpenAdvisor }) => {
  const { 
    addItem, 
    allContainersWithLocation, 
    spaces, 
    setActiveTab, 
    locateItemOnMap 
  } = useStorage();

  const { mascot, dialogues, triggerCelebration } = useMascot();

  const [mode, setMode] = useState<SaveMode>('photo');

  // Camera & Image Capture state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [userPhotoHint, setUserPhotoHint] = useState<string>('');

  // Audio / Speech Recognition state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Free-form text state
  const [naturalText, setNaturalText] = useState('');

  // AI Analysis loading & output state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{
    name: string;
    category: string;
    size: ItemSize;
    frequency: UsageFrequency;
    tags: string[];
    photoEmoji: string;
    notes?: string;
    recommendedContainerId: string;
    locationRationale?: string;
  } | null>(null);

  // Full Manual Form state
  const [manualName, setManualName] = useState('');
  const [manualCategory, setManualCategory] = useState<string>(CATEGORIES[0]);
  const [manualSize, setManualSize] = useState<ItemSize>('S');
  const [manualFrequency, setManualFrequency] = useState<UsageFrequency>('weekly');
  const [manualContainerId, setManualContainerId] = useState<string>(
    allContainersWithLocation[0]?.id || ''
  );
  const [manualQuantity, setManualQuantity] = useState<number>(1);
  const [manualNotes, setManualNotes] = useState('');
  const [manualEmoji, setManualEmoji] = useState('📦');
  const [manualTagInput, setManualTagInput] = useState('');
  const [manualTags, setManualTags] = useState<string[]>([]);

  // Feedback banner
  const [savedSuccessItem, setSavedSuccessItem] = useState<{
    id: string;
    name: string;
    locationName: string;
  } | null>(null);

  // Start Camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('La cámara no está soportada en este entorno.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: unknown) {
      console.warn('Camera start error:', err);
      setCameraError('No se pudo acceder a la cámara. Puedes subir una foto desde la galería.');
      setCameraActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    if (mode === 'photo' && !capturedPhoto) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [mode, capturedPhoto, startCamera, stopCamera]);

  // Snap photo from video feed
  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedPhoto(dataUrl);
      stopCamera();
    }
  };

  // Upload photo file
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCapturedPhoto(event.target?.result as string);
      stopCamera();
    };
    reader.readAsDataURL(file);
  };

  // Speech Recognition API setup
  const recognitionRef = useRef<any>(null);
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecording(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join('');
        setVoiceText(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech error:', event.error);
        setIsRecording(false);
        if (event.error === 'not-allowed') {
          setSpeechError('Permiso de micrófono denegado. Permite el acceso para dictar.');
        } else {
          setSpeechError('No se pudo capturar el audio o el navegador no lo soporta.');
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      setVoiceText('');
      setSpeechError(null);
      try {
        recognitionRef.current?.start();
      } catch (e) {
        setIsRecording(false);
      }
    }
  };

  // Call AI Vision Analysis
  const analyzePhotoWithAI = async () => {
    if (!capturedPhoto) return;
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await fetch('/api/analyze-item-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: capturedPhoto,
          userHint: userPhotoHint,
          existingContainers: allContainersWithLocation,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error en el servidor (${response.status})`);
      }

      const data = await response.json();
      setAnalysisResult({
        name: data.name || 'Artículo Identificado',
        category: data.category || 'Otros',
        size: data.size || 'M',
        frequency: data.frequency || 'weekly',
        tags: data.tags || ['#foto'],
        photoEmoji: data.photoEmoji || '📸',
        notes: data.notes || '',
        recommendedContainerId: data.recommendedContainerId || allContainersWithLocation[0]?.id || '',
        locationRationale: data.locationRationale || '',
      });
    } catch (err: unknown) {
      console.warn('Analysis error:', err);
      setAnalysisError('Error al contactar con el analizador inteligente. Usando sugerencia base.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Call AI Voice or Text Analysis
  const analyzeVoiceOrTextWithAI = async (inputText: string) => {
    if (!inputText.trim()) return;
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await fetch('/api/analyze-voice-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText.trim(),
          existingContainers: allContainersWithLocation,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error en el servidor (${response.status})`);
      }

      const data = await response.json();
      setAnalysisResult({
        name: data.name || inputText.trim(),
        category: data.category || 'Otros',
        size: data.size || 'S',
        frequency: data.frequency || 'weekly',
        tags: data.tags || ['#dictado'],
        photoEmoji: data.photoEmoji || '📦',
        notes: data.notes || '',
        recommendedContainerId: data.recommendedContainerId || allContainersWithLocation[0]?.id || '',
        locationRationale: data.locationRationale || '',
      });
    } catch (err: unknown) {
      console.warn('Analysis error:', err);
      setAnalysisError('Error en el análisis de texto. Usando valores predeterminados.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Confirm and Save Item
  const handleConfirmSave = (customContainerId?: string) => {
    if (!analysisResult) return;

    const chosenContainer =
      customContainerId ||
      analysisResult.recommendedContainerId ||
      allContainersWithLocation[0]?.id;

    if (!chosenContainer) {
      alert('Debes tener al menos un contenedor o balda registrada.');
      return;
    }

    const created = addItem({
      name: analysisResult.name,
      category: analysisResult.category,
      size: analysisResult.size,
      frequency: analysisResult.frequency,
      containerId: chosenContainer,
      quantity: 1,
      notes: analysisResult.notes,
      photoEmoji: analysisResult.photoEmoji,
      tags: analysisResult.tags,
    });

    // Confetti effect & Mascot celebration
    try {
      confetti({ particleCount: 60, spread: 55, origin: { y: 0.6 } });
    } catch (e) {
      // ignore
    }
    triggerCelebration();

    const spot = allContainersWithLocation.find((c) => c.id === chosenContainer);
    setSavedSuccessItem({
      id: created.id,
      name: created.name,
      locationName: spot ? `${spot.roomName} ➔ ${spot.furnitureName} ➔ ${spot.name}` : 'Ubicación asignada',
    });

    // Reset capture states
    setAnalysisResult(null);
    setCapturedPhoto(null);
    setVoiceText('');
    setNaturalText('');
  };

  // Submit manual detailed form
  const handleSaveManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) return;

    const chosenContainer = manualContainerId || allContainersWithLocation[0]?.id;
    if (!chosenContainer) {
      alert('Debes tener al menos un contenedor creado.');
      return;
    }

    const created = addItem({
      name: manualName.trim(),
      category: manualCategory,
      size: manualSize,
      frequency: manualFrequency,
      containerId: chosenContainer,
      quantity: Math.max(1, manualQuantity),
      notes: manualNotes.trim(),
      photoEmoji: manualEmoji,
      tags: manualTags,
    });

    try {
      confetti({ particleCount: 60, spread: 55, origin: { y: 0.6 } });
    } catch (e) {}

    const spot = allContainersWithLocation.find((c) => c.id === chosenContainer);
    setSavedSuccessItem({
      id: created.id,
      name: created.name,
      locationName: spot ? `${spot.roomName} ➔ ${spot.furnitureName} ➔ ${spot.name}` : 'Ubicación asignada',
    });

    // Reset manual form
    setManualName('');
    setManualNotes('');
    setManualTags([]);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50/70 p-4 sm:p-6 max-w-5xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h1 className="font-extrabold text-slate-900 text-xl tracking-tight">
                Centro de Registro & Guardado Multimodal
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Elige cómo registrar tu objeto: hazle una foto para que la IA lo reconozca, dicta con voz, escribe en texto libre o rellena el formulario clásico.
            </p>
          </div>

          <button
            onClick={onOpenAdvisor}
            className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs flex items-center gap-1.5 transition self-start sm:self-auto border border-indigo-200/60 shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Asesor Ergonómico</span>
          </button>
        </div>

        {/* 4 Capture Mode Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            onClick={() => {
              setMode('photo');
              setAnalysisResult(null);
            }}
            className={`p-3 rounded-2xl border text-left transition flex items-center gap-3 ${
              mode === 'photo'
                ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600 shadow-xs'
                : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                mode === 'photo' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Camera className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-xs text-slate-900 block truncate">
                Foto en el Momento
              </span>
              <span className="text-[10px] text-slate-500 block">Cámara + Visión IA</span>
            </div>
          </button>

          <button
            onClick={() => {
              setMode('voice');
              setAnalysisResult(null);
            }}
            className={`p-3 rounded-2xl border text-left transition flex items-center gap-3 ${
              mode === 'voice'
                ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600 shadow-xs'
                : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                mode === 'voice' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Mic className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-xs text-slate-900 block truncate">
                Dictado por Audio
              </span>
              <span className="text-[10px] text-slate-500 block">Habla y guarda</span>
            </div>
          </button>

          <button
            onClick={() => {
              setMode('text');
              setAnalysisResult(null);
            }}
            className={`p-3 rounded-2xl border text-left transition flex items-center gap-3 ${
              mode === 'text'
                ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600 shadow-xs'
                : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                mode === 'text' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-xs text-slate-900 block truncate">
                Texto Inteligente
              </span>
              <span className="text-[10px] text-slate-500 block">Frase natural</span>
            </div>
          </button>

          <button
            onClick={() => {
              setMode('form');
              setAnalysisResult(null);
            }}
            className={`p-3 rounded-2xl border text-left transition flex items-center gap-3 ${
              mode === 'form'
                ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600 shadow-xs'
                : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                mode === 'form' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Sliders className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-xs text-slate-900 block truncate">
                Formulario Clásico
              </span>
              <span className="text-[10px] text-slate-500 block">Manual detallado</span>
            </div>
          </button>
        </div>
      </div>

      {/* Success Notification Banner with Mascot Celebration */}
      {savedSuccessItem && (
        <div className="space-y-3">
          <MascotMessageBubble
            dialoguePool={dialogues.saveSuccess}
            mood="celebrating"
            title={`${mascot.name} Bailando de Alegría`}
            actionButton={{
              label: 'Ver en el Mapa Interactivo',
              onClick: () => {
                locateItemOnMap(savedSuccessItem.id);
                setSavedSuccessItem(null);
              },
              icon: <MapPin className="w-3.5 h-3.5" />,
            }}
            secondaryButton={{
              label: 'Continuar guardando',
              onClick: () => setSavedSuccessItem(null),
            }}
          />
        </div>
      )}

      {/* Main Mode Content */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm">
        {/* ======================================================== */}
        {/* OPTION 1: PHOTO CAPTURE & VISION ANALYSIS                */}
        {/* ======================================================== */}
        {mode === 'photo' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-600" />
                <span>Saca una foto en el momento o sube una imagen</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                La Inteligencia Artificial examinará la imagen, reconocerá qué artículo es, determinará su volumen y sugerirá la mejor balda o cajón de tu casa.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Photo Viewfinder or Snapshot Preview */}
              <div className="flex flex-col items-center">
                {!capturedPhoto ? (
                  <div className="relative w-full aspect-square max-w-[340px] bg-slate-900 rounded-3xl overflow-hidden shadow-inner flex items-center justify-center border-2 border-slate-700">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      autoPlay
                      playsInline
                      muted
                    />

                    {cameraActive && (
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                        <div className="w-48 h-48 border-2 border-dashed border-white/60 rounded-2xl"></div>
                        <span className="mt-4 text-[11px] font-semibold text-white bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs">
                          Enfoca el objeto
                        </span>
                      </div>
                    )}

                    {cameraError && (
                      <div className="p-5 text-center text-white bg-slate-900/95 absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <AlertCircle className="w-9 h-9 text-amber-400" />
                        <p className="text-xs text-slate-300 px-4">{cameraError}</p>
                        <button
                          onClick={startCamera}
                          className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white transition flex items-center gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Reintentar cámara
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative w-full aspect-square max-w-[340px] rounded-3xl overflow-hidden shadow-md border-2 border-indigo-300">
                    <img
                      src={capturedPhoto}
                      alt="Captured item"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => {
                        setCapturedPhoto(null);
                        setAnalysisResult(null);
                        startCamera();
                      }}
                      className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-black/70 hover:bg-black text-white text-xs font-medium backdrop-blur-xs flex items-center gap-1.5 transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Tomar otra</span>
                    </button>
                  </div>
                )}

                {/* Camera Buttons Row */}
                <div className="mt-4 flex items-center gap-3">
                  {!capturedPhoto ? (
                    <>
                      <button
                        onClick={takeSnapshot}
                        disabled={!cameraActive}
                        className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition disabled:opacity-40"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Disparar Foto</span>
                      </button>

                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition shadow-2xs">
                        <Upload className="w-4 h-4 text-slate-500" />
                        <span>Subir desde Galería</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setCapturedPhoto(null);
                        setAnalysisResult(null);
                        startCamera();
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800 underline"
                    >
                      Descartar foto actual
                    </button>
                  )}
                </div>
              </div>

              {/* Photo Analysis Action & Result Box */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Pista o nota adicional (opcional)
                  </label>
                  <input
                    type="text"
                    value={userPhotoHint}
                    onChange={(e) => setUserPhotoHint(e.target.value)}
                    placeholder="Ej: Es el cargador de la cámara Sony..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                {capturedPhoto && !analysisResult && (
                  <button
                    onClick={analyzePhotoWithAI}
                    disabled={isAnalyzing}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>La IA está examinando el objeto y los espacios...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Analizar Foto y Ubicar Automáticamente</span>
                      </>
                    )}
                  </button>
                )}

                {analysisError && (
                  <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                    {analysisError}
                  </p>
                )}

                {/* Result Card */}
                {analysisResult && (
                  <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                    <MascotMessageBubble
                      dialoguePool={dialogues.photoAiAnalysis}
                      mood="thinking"
                      title={`${mascot.name} y Gemini 3.8 Flash`}
                      compact
                    />

                    <div className="bg-slate-50 border border-indigo-200 rounded-3xl p-5 space-y-4">
                      <div className="flex items-start gap-3">
                      <span className="text-3xl p-2 bg-white rounded-2xl border border-slate-200 shrink-0">
                        {analysisResult.photoEmoji}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded">
                          Detectado por IA
                        </span>
                        <input
                          type="text"
                          value={analysisResult.name}
                          onChange={(e) =>
                            setAnalysisResult({ ...analysisResult, name: e.target.value })
                          }
                          className="font-bold text-slate-900 text-base mt-1 w-full bg-white px-2 py-1 rounded-lg border border-slate-300"
                        />
                        <p className="text-xs text-slate-500 mt-1">{analysisResult.category}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded border ${SIZE_CONFIG[analysisResult.size].color}`}>
                        Tamaño {SIZE_CONFIG[analysisResult.size].badge}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${FREQUENCY_CONFIG[analysisResult.frequency].color}`}>
                        {FREQUENCY_CONFIG[analysisResult.frequency].icon} {FREQUENCY_CONFIG[analysisResult.frequency].short}
                      </span>
                    </div>

                    {/* Recommended Spot & Container Selector */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Ubicación física sugerida:
                      </label>
                      <select
                        value={analysisResult.recommendedContainerId}
                        onChange={(e) =>
                          setAnalysisResult({
                            ...analysisResult,
                            recommendedContainerId: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                      >
                        {allContainersWithLocation.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.roomName} ➔ {c.furnitureName} ➔ {c.name}
                          </option>
                        ))}
                      </select>
                      {analysisResult.locationRationale && (
                        <p className="text-[11px] text-indigo-700 bg-indigo-50 p-2 rounded-lg border border-indigo-100 mt-1.5">
                          💡 {analysisResult.locationRationale}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleConfirmSave()}
                      className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition"
                    >
                      <Check className="w-4 h-4" />
                      <span>Confirmar y Guardar en este Sitio</span>
                    </button>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* OPTION 2: AUDIO / VOICE RECORDING                        */}
        {/* ======================================================== */}
        {mode === 'voice' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Mic className="w-5 h-5 text-indigo-600" />
                <span>Dictado por Audio en Vivo</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Toca el micrófono y describe lo que estás guardando. Ej: "He guardado las llaves de repuesto en el primer cajón del escritorio" o "Pon los tornillos en la caja del trastero".
              </p>
            </div>

            <div className="p-8 bg-gradient-to-r from-indigo-50/70 to-purple-50/50 rounded-3xl border border-indigo-100 flex flex-col items-center justify-center text-center space-y-4">
              <button
                type="button"
                onClick={toggleRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center text-white transition transform shadow-xl cursor-pointer ${
                  isRecording
                    ? 'bg-rose-600 scale-110 animate-pulse ring-8 ring-rose-200'
                    : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-105'
                }`}
              >
                {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </button>

              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {isRecording ? 'Te escucho... Habla con naturalidad' : 'Pulsa el micrófono para comenzar'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  El sistema extraerá automáticamente el artículo y su lugar ideal.
                </p>
              </div>

              {voiceText && (
                <div className="p-3 px-5 bg-white rounded-2xl border border-indigo-200 text-sm font-semibold text-indigo-950 shadow-2xs max-w-lg">
                  "{voiceText}"
                </div>
              )}

              {speechError && (
                <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  {speechError}
                </p>
              )}

              {voiceText && !analysisResult && (
                <button
                  onClick={() => analyzeVoiceOrTextWithAI(voiceText)}
                  disabled={isAnalyzing}
                  className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Procesando audio con IA...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Analizar Audio y Asignar Ubicación</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Voice Result Review Card */}
            {analysisResult && (
              <div className="bg-slate-50 border border-indigo-200 rounded-3xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-start gap-3">
                  <span className="text-3xl p-2 bg-white rounded-2xl border border-slate-200 shrink-0">
                    {analysisResult.photoEmoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded">
                      Objeto Extraído del Audio
                    </span>
                    <input
                      type="text"
                      value={analysisResult.name}
                      onChange={(e) =>
                        setAnalysisResult({ ...analysisResult, name: e.target.value })
                      }
                      className="font-bold text-slate-900 text-base mt-1 w-full bg-white px-2 py-1 rounded-lg border border-slate-300"
                    />
                  </div>
                </div>

                {/* Spot selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Ubicación determinada:
                  </label>
                  <select
                    value={analysisResult.recommendedContainerId}
                    onChange={(e) =>
                      setAnalysisResult({
                        ...analysisResult,
                        recommendedContainerId: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    {allContainersWithLocation.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.roomName} ➔ {c.furnitureName} ➔ {c.name}
                      </option>
                    ))}
                  </select>
                  {analysisResult.locationRationale && (
                    <p className="text-xs text-indigo-700 bg-indigo-50 p-2 rounded-lg border border-indigo-100 mt-1">
                      💡 {analysisResult.locationRationale}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleConfirmSave()}
                  className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar Objeto en UbicaYa</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* OPTION 3: FREE-FORM TEXT INTELLIGENCE                    */}
        {/* ======================================================== */}
        {mode === 'text' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <span>Registro Rápido mediante Texto Libre</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Escribe una frase sencilla como si le hablaras a un asistente. Ej: "Guardé los pasaportes en el primer cajón del escritorio", "Tengo un abrigo de invierno en el altillo del armario".
              </p>
            </div>

            <div className="space-y-3">
              <textarea
                rows={3}
                value={naturalText}
                onChange={(e) => setNaturalText(e.target.value)}
                placeholder="Escribe aquí tu frase completa..."
                className="w-full p-4 rounded-2xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm"
              />

              <button
                onClick={() => analyzeVoiceOrTextWithAI(naturalText)}
                disabled={isAnalyzing || !naturalText.trim()}
                className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Analizando frase con IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Extraer Datos y Asignar Ubicación</span>
                  </>
                )}
              </button>
            </div>

            {/* Analysis card for text */}
            {analysisResult && (
              <div className="bg-slate-50 border border-indigo-200 rounded-3xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-start gap-3">
                  <span className="text-3xl p-2 bg-white rounded-2xl border border-slate-200 shrink-0">
                    {analysisResult.photoEmoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded">
                      Objeto Extraído
                    </span>
                    <input
                      type="text"
                      value={analysisResult.name}
                      onChange={(e) =>
                        setAnalysisResult({ ...analysisResult, name: e.target.value })
                      }
                      className="font-bold text-slate-900 text-base mt-1 w-full bg-white px-2 py-1 rounded-lg border border-slate-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Ubicación asignada:
                  </label>
                  <select
                    value={analysisResult.recommendedContainerId}
                    onChange={(e) =>
                      setAnalysisResult({
                        ...analysisResult,
                        recommendedContainerId: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    {allContainersWithLocation.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.roomName} ➔ {c.furnitureName} ➔ {c.name}
                      </option>
                    ))}
                  </select>
                  {analysisResult.locationRationale && (
                    <p className="text-xs text-indigo-700 bg-indigo-50 p-2 rounded-lg border border-indigo-100 mt-1">
                      💡 {analysisResult.locationRationale}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleConfirmSave()}
                  className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar Objeto</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* OPTION 4: CLASSIC FULL DETAILED FORM                     */}
        {/* ======================================================== */}
        {mode === 'form' && (
          <form onSubmit={handleSaveManual} className="space-y-5">
            <div>
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600" />
                <span>Formulario Estructurado Manual</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Control total sobre cada atributo, estancia, estantería, balda o cajón exacto.
              </p>
            </div>

            {/* Name & Emoji */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Nombre del Artículo *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Ej: Pasaportes, Cables USB, Llaves de repuesto, Taladro..."
                  className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Category & Quantity */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Categoría
                </label>
                <select
                  value={manualCategory}
                  onChange={(e) => setManualCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 bg-white text-xs font-medium focus:ring-2 focus:ring-indigo-500"
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
                  Cantidad
                </label>
                <input
                  type="number"
                  min="1"
                  value={manualQuantity}
                  onChange={(e) => setManualQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-xs font-semibold"
                />
              </div>
            </div>

            {/* Size Radio Pills */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Tamaño Físico
                </label>
                <span className="text-[11px] text-slate-400">
                  {SIZE_CONFIG[manualSize].example}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {(Object.keys(SIZE_CONFIG) as ItemSize[]).map((sz) => {
                  const cfg = SIZE_CONFIG[sz];
                  const isSelected = manualSize === sz;
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setManualSize(sz)}
                      className={`py-2 px-1 rounded-xl border text-center transition ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold ring-1 ring-indigo-600 shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs block">{cfg.badge}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Usage Frequency */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Frecuencia de Uso
                </label>
                <span className="text-[11px] text-indigo-600 font-medium">
                  {FREQUENCY_CONFIG[manualFrequency].zone}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(Object.keys(FREQUENCY_CONFIG) as UsageFrequency[]).map((fq) => {
                  const cfg = FREQUENCY_CONFIG[fq];
                  const isSelected = manualFrequency === fq;
                  return (
                    <button
                      key={fq}
                      type="button"
                      onClick={() => setManualFrequency(fq)}
                      className={`p-2 rounded-xl border text-center text-xs transition flex flex-col items-center gap-0.5 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 font-bold ring-1 ring-indigo-600'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-sm">{cfg.icon}</span>
                      <span className="text-[11px]">{cfg.short}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Destination Container Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Ubicación Exacta (Habitación ➔ Mueble ➔ Nivel) *
                </label>
                <button
                  type="button"
                  onClick={onOpenAdvisor}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Pedir sugerencia al Asesor</span>
                </button>
              </div>
              <select
                required
                value={manualContainerId}
                onChange={(e) => setManualContainerId(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 bg-white text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              >
                {allContainersWithLocation.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.roomName} ➔ {c.furnitureName} ➔ {c.name} ({c.currentItemsCount} items)
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Etiquetas (Escribe y pulsa Enter)
              </label>
              <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-2xl border border-slate-300 bg-white min-h-[44px]">
                {manualTags.map((t) => (
                  <span
                    key={t}
                    className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 border border-indigo-200"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => setManualTags(manualTags.filter((tag) => tag !== t))}
                      className="hover:text-rose-600 text-indigo-400 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={manualTagInput}
                  onChange={(e) => setManualTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      const clean = manualTagInput.trim().replace(/^#*/, '#');
                      if (clean.length > 1 && !manualTags.includes(clean)) {
                        setManualTags([...manualTags, clean]);
                        setManualTagInput('');
                      }
                    }
                  }}
                  placeholder="Añadir #etiqueta..."
                  className="text-xs outline-hidden flex-1 min-w-[140px]"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Notas adicionales
              </label>
              <textarea
                rows={2}
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder="Detalles sobre posición, fecha de caducidad, precauciones..."
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition"
            >
              <Save className="w-4 h-4" />
              <span>Guardar en UbicaYa</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
