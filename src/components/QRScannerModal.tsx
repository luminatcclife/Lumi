import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { 
  X, 
  Camera, 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  MapPin, 
  PlusCircle, 
  Box, 
  Package, 
  RefreshCw,
  Zap,
  ZapOff,
  SwitchCamera,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { parseQrCode, ParsedQr } from '../utils/qrUtils';
import { useStorage } from '../context/StorageContext';
import { useMascot } from '../context/MascotContext';
import { LumiCharacter } from './mascot/LumiCharacter';
import { MascotMessageBubble } from './mascot/MascotMessageBubble';
import { StorageItem, StorageContainer } from '../types/storage';

export type ScannerCanvasState = 'initializing' | 'searching' | 'locking' | 'success' | 'low_light';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuickAddItemToContainer?: (containerId: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onQuickAddItemToContainer,
}) => {
  const { 
    findContainer, 
    findItem, 
    items, 
    locateItemOnMap, 
    getBreadcrumbs,
    allContainersWithLocation
  } = useStorage();

  const { mascot, dialogues, triggerCelebration, triggerWink, setExpression } = useMascot();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const searchStartTimeRef = useRef<number>(Date.now());
  const lockedLocationRef = useRef<any>(null);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchEnabled, setTorchEnabled] = useState<boolean>(false);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  const [canvasState, setCanvasState] = useState<ScannerCanvasState>('initializing');

  const [scanResult, setScanResult] = useState<{
    parsed: ParsedQr;
    container?: { container: StorageContainer; itemsInContainer: StorageItem[] } | null;
    item?: StorageItem | null;
  } | null>(null);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setTorchEnabled(false);
    setCanvasState('initializing');
    lockedLocationRef.current = null;
  }, []);

  const handleDetectedCode = useCallback(
    (codeText: string, location?: any) => {
      lockedLocationRef.current = location || null;
      setCanvasState('locking');

      setTimeout(() => {
        setCanvasState('success');
        const parsed = parseQrCode(codeText);

        if (parsed.type === 'container') {
          const found = findContainer(parsed.id);
          if (found) {
            const itemsIn = items.filter((i) => i.containerId === parsed.id);
            setScanResult({
              parsed,
              container: { container: found.container, itemsInContainer: itemsIn },
            });
            triggerWink();
            return;
          }
        } else if (parsed.type === 'item') {
          const foundItem = findItem(parsed.id);
          if (foundItem) {
            setScanResult({
              parsed,
              item: foundItem,
            });
            triggerWink();
            return;
          }
        }

        // Unrecognized or custom QR
        setScanResult({
          parsed,
          container: null,
          item: null,
        });
      }, 350);
    },
    [findContainer, findItem, items, triggerWink]
  );

  // Toggle Torch / Flashlight if supported
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const next = !torchEnabled;
      await (track as any).applyConstraints({
        advanced: [{ torch: next }],
      });
      setTorchEnabled(next);
    } catch (e) {
      console.warn('Torch not supported on this track', e);
    }
  };

  // Switch between front and rear cameras
  const switchCamera = () => {
    stopCamera();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Main Canvas Rendering & Optical QR Scanning Loop
  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      // Sync canvas dimensions with display / video
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);
      const now = performance.now();
      const time = now / 1000;
      const elapsedSearching = Date.now() - searchStartTimeRef.current;

      // 1. Process QR Code Frame via jsQR if searching
      if (!scanResult && canvasState !== 'success') {
        const offscreen = document.createElement('canvas');
        offscreen.width = width;
        offscreen.height = height;
        const offCtx = offscreen.getContext('2d', { willReadFrequently: true });

        if (offCtx) {
          offCtx.drawImage(video, 0, 0, width, height);
          const imageData = offCtx.getImageData(0, 0, width, height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            handleDetectedCode(code.data, code.location);
          } else {
            if (canvasState !== 'searching' && canvasState !== 'low_light') {
              setCanvasState('searching');
            }
          }
        }
      }

      // =====================================================================
      // CANVAS DRAWING ENGINE: NURO'S REALTIME OPTICAL SCANNING STATES
      // =====================================================================

      // 1. DIMMED VIGNETTE OVERLAY
      ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.fillRect(0, 0, width, height);

      // Define central scanning zone
      const boxSize = Math.min(width, height) * 0.58;
      const boxX = (width - boxSize) / 2;
      const boxY = (height - boxSize) / 2;

      // Clear center aperture for crystal clear video view
      ctx.clearRect(boxX, boxY, boxSize, boxSize);

      // 2. STATE A: SEARCHING (Nuro actively scanning)
      if (canvasState === 'searching' || canvasState === 'initializing') {
        // A. Dynamic Breathing Corner Brackets
        const breathingOffset = Math.sin(time * 3.5) * 3;
        const bX = boxX - breathingOffset;
        const bY = boxY - breathingOffset;
        const bSize = boxSize + breathingOffset * 2;
        const cornerLen = 28;

        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.shadowColor = '#34d399';
        ctx.shadowBlur = 14;

        // Top-Left Bracket
        ctx.beginPath();
        ctx.moveTo(bX, bY + cornerLen);
        ctx.lineTo(bX, bY);
        ctx.lineTo(bX + cornerLen, bY);
        ctx.stroke();

        // Top-Right Bracket
        ctx.beginPath();
        ctx.moveTo(bX + bSize - cornerLen, bY);
        ctx.lineTo(bX + bSize, bY);
        ctx.lineTo(bX + bSize, bY + cornerLen);
        ctx.stroke();

        // Bottom-Left Bracket
        ctx.beginPath();
        ctx.moveTo(bX, bY + bSize - cornerLen);
        ctx.lineTo(bX, bY + bSize);
        ctx.lineTo(bX + cornerLen, bY + bSize);
        ctx.stroke();

        // Bottom-Right Bracket
        ctx.beginPath();
        ctx.moveTo(bX + bSize - cornerLen, bY + bSize);
        ctx.lineTo(bX + bSize, bY + bSize);
        ctx.lineTo(bX + bSize, bY + bSize - cornerLen);
        ctx.stroke();

        // B. Cybernetic Laser Sweep Line
        const laserProgress = (Math.sin(time * 3) + 1) / 2;
        const laserY = bY + laserProgress * bSize;

        // Laser beam gradient
        const laserGrad = ctx.createLinearGradient(bX, laserY, bX + bSize, laserY);
        laserGrad.addColorStop(0, 'rgba(16, 185, 129, 0)');
        laserGrad.addColorStop(0.2, 'rgba(52, 211, 153, 0.8)');
        laserGrad.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
        laserGrad.addColorStop(0.8, 'rgba(52, 211, 153, 0.8)');
        laserGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');

        ctx.strokeStyle = laserGrad;
        ctx.lineWidth = 3;
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.moveTo(bX, laserY);
        ctx.lineTo(bX + bSize, laserY);
        ctx.stroke();

        // Soft laser plume trailing
        const plumeGrad = ctx.createLinearGradient(bX, laserY - 18, bX, laserY);
        plumeGrad.addColorStop(0, 'rgba(16, 185, 129, 0)');
        plumeGrad.addColorStop(1, 'rgba(16, 185, 129, 0.15)');
        ctx.fillStyle = plumeGrad;
        ctx.fillRect(bX, laserY - 18, bSize, 18);

        // C. Central Crosshair & Micro Marks
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        const midX = width / 2;
        const midY = height / 2;

        ctx.beginPath();
        ctx.moveTo(midX - 10, midY);
        ctx.lineTo(midX + 10, midY);
        ctx.moveTo(midX, midY - 10);
        ctx.lineTo(midX, midY + 10);
        ctx.stroke();

        // Concentric target ring
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
        ctx.beginPath();
        ctx.arc(midX, midY, 32, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 3. STATE B: LOCKING ON TARGET (jsQR detected corners)
      if ((canvasState === 'locking' || canvasState === 'success') && lockedLocationRef.current) {
        const loc = lockedLocationRef.current;
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#34d399';
        ctx.shadowBlur = 20;

        // Trace exact bounding polygon on the physical QR
        ctx.beginPath();
        ctx.moveTo(loc.topLeftCorner.x, loc.topLeftCorner.y);
        ctx.lineTo(loc.topRightCorner.x, loc.topRightCorner.y);
        ctx.lineTo(loc.bottomRightCorner.x, loc.bottomRightCorner.y);
        ctx.lineTo(loc.bottomLeftCorner.x, loc.bottomLeftCorner.y);
        ctx.closePath();
        ctx.stroke();

        // Fill semi-transparent green highlight inside the QR code
        ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
        ctx.fill();

        // Draw target reticles on all 4 corners
        [loc.topLeftCorner, loc.topRightCorner, loc.bottomRightCorner, loc.bottomLeftCorner].forEach((pt) => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2;
          ctx.stroke();
        });

        // Center point calculation
        const cX = (loc.topLeftCorner.x + loc.bottomRightCorner.x) / 2;
        const cY = (loc.topLeftCorner.y + loc.bottomRightCorner.y) / 2;

        // Rotating lock ring around QR center
        ctx.save();
        ctx.translate(cX, cY);
        ctx.rotate(time * 4);
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, 36, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Expanding shockwave ring on success
        if (canvasState === 'success') {
          const waveRadius = 40 + (Math.sin(time * 8) + 1) * 20;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(cX, cY, waveRadius, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Holographic AR Tag drawn on Canvas
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#000000';
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.roundRect(cX - 75, loc.topLeftCorner.y - 42, 150, 30, 8);
        ctx.fill();

        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✓ CÓDIGO IDENTIFICADO', cX, loc.topLeftCorner.y - 23);
      }

      // =====================================================================
      // 4. DRAW NURO: THE VISION SCANNER DRONE ON CANVAS HUD (Top-Left Corner)
      // =====================================================================
      ctx.shadowBlur = 0;
      const nuroX = 35;
      const nuroY = 40;
      const nuroHover = Math.sin(time * 4) * 3;

      ctx.save();
      ctx.translate(nuroX, nuroY + nuroHover);

      // Radar Sweep Cone behind Nuro
      const radarAngle = (time * 3) % (Math.PI * 2);
      ctx.save();
      ctx.rotate(radarAngle);
      const radarGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 30);
      radarGrad.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
      radarGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx.fillStyle = radarGrad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 30, 0, Math.PI / 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Outer Glow Halo
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 12;
      ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();

      // Nuro Spherical Metallic Body
      const droneBodyGrad = ctx.createLinearGradient(-15, -15, 15, 15);
      droneBodyGrad.addColorStop(0, '#f8fafc');
      droneBodyGrad.addColorStop(0.5, '#cbd5e1');
      droneBodyGrad.addColorStop(1, '#64748b');
      ctx.fillStyle = droneBodyGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Nuro Cybernetic Optic Visor
      const visorGrad = ctx.createLinearGradient(-10, -6, 10, 6);
      visorGrad.addColorStop(0, '#10b981');
      visorGrad.addColorStop(1, '#06b6d4');
      ctx.fillStyle = visorGrad;
      ctx.beginPath();
      ctx.ellipse(0, 1, 10, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Digital Eyes based on state
      if (canvasState === 'locking' || canvasState === 'success') {
        // Joyful Star / Happy Eyes
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('★', 0, 4);
      } else {
        // Scanning Pupil
        const pupilX = Math.sin(time * 5) * 3;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(pupilX, 1, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Small Thruster Fins
      ctx.fillStyle = '#334155';
      ctx.fillRect(-19, -3, 3, 6);
      ctx.fillRect(16, -3, 3, 6);

      // Blue Ion Exhaust Sparks
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-22, -1.5, 3, 3);
      ctx.fillRect(19, -1.5, 3, 3);

      ctx.restore();

      // HUD Text Next to Nuro
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#000000';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('NURO • VISIÓN ÓPTICA AR', nuroX + 28, nuroY - 4);

      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = canvasState === 'success' || canvasState === 'locking' ? '#34d399' : '#10b981';
      ctx.fillText(
        canvasState === 'success'
          ? 'ESTADO: CÓDIGO CAPTURADO'
          : canvasState === 'locking'
          ? 'ESTADO: BLOQUEANDO OBJETIVO'
          : 'ESTADO: ESCANEANDO A 60 FPS',
        nuroX + 28,
        nuroY + 11
      );

      // 5. HELPFUL HINT AFTER 4 SECONDS OF SEARCHING
      if (elapsedSearching > 4000 && !scanResult && canvasState === 'searching') {
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#000000';
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        const tipW = 280;
        const tipH = 26;
        ctx.roundRect((width - tipW) / 2, height - 55, tipW, tipH, 8);
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#fef3c7';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💡 Nuro: Acerca la cámara a 15-20 cm con buena luz', width / 2, height - 38);
      }
    }

    animFrameRef.current = requestAnimationFrame(scanFrame);
  }, [canvasState, handleDetectedCode, scanResult]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setScanResult(null);
    setCanvasState('initializing');
    searchStartTimeRef.current = Date.now();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('La cámara no está disponible en este navegador o contexto.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      streamRef.current = stream;

      // Check if torch constraint is available
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = (track as any).getCapabilities ? (track as any).getCapabilities() : {};
        setTorchSupported(!!capabilities.torch);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);
        setCanvasState('searching');
        animFrameRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (err: unknown) {
      console.warn('Camera stream error:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes('Permission denied') || errorMsg.includes('NotAllowedError')) {
        setCameraError('Permiso de cámara denegado. Puedes permitir el acceso o subir una foto con el QR.');
      } else {
        setCameraError('No se pudo acceder a la cámara en este entorno. Usa la opción de subir imagen.');
      }
      setCameraActive(false);
    }
  }, [facingMode, scanFrame]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setScanResult(null);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Handle image upload to scan QR from photo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height);
        if (code && code.data) {
          handleDetectedCode(code.data, code.location);
        } else {
          alert('No se pudo detectar ningún código QR claro en la imagen subida. Prueba con otra foto o ángulo.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Simulate scanning the first available box in demo/testing
  const handleSimulateScan = () => {
    if (allContainersWithLocation.length > 0) {
      const first = allContainersWithLocation[0];
      handleDetectedCode(`UBICAYA:CONT:v1:${first.id}`);
    } else {
      handleDetectedCode('UBICAYA:CONT:v1:demo_box');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col my-4 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                Escáner Óptico de Cajas en Tiempo Real
              </h3>
              <p className="text-xs text-slate-500">
                Alimentado por Nuro • Reconocimiento instantáneo a 60 FPS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Video & AR Canvas */}
        <div className="p-6 flex flex-col items-center space-y-4">
          {!scanResult ? (
            <div className="w-full flex flex-col items-center">
              
              {/* Mascot Dialogue Header */}
              <div className="w-full max-w-[380px] mb-3">
                <MascotMessageBubble
                  dialoguePool={dialogues.qrScanning}
                  mood="scanning"
                  title="Nuro • Dron de Escaneo Espacial"
                  compact
                />
              </div>

              {/* AR Viewfinder Screen Container */}
              <div className="relative w-full aspect-square max-w-[360px] bg-slate-950 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center border-2 border-slate-800">
                
                {/* 1. Underlying Video Stream */}
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />

                {/* 2. REALTIME CANVAS HUD WITH NURO'S SCANNING STATES */}
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none z-20"
                />

                {/* Floating Character Badge in Corner */}
                {cameraActive && (
                  <div className="absolute top-3 right-3 z-30 pointer-events-none flex flex-col items-center">
                    <div className="bg-black/60 backdrop-blur-md p-1.5 rounded-2xl border border-emerald-400/40 shadow-lg flex flex-col items-center">
                      <LumiCharacter
                        expression={canvasState === 'locking' || canvasState === 'success' ? 'wink' : 'scanning'}
                        size="sm"
                        isFloating={false}
                      />
                      <span className="text-[8px] font-black uppercase tracking-wider text-emerald-300 mt-0.5 px-1.5 py-0.2 rounded bg-black/50">
                        {canvasState === 'locking' ? '¡Wink! 😉' : 'LÁSER ON'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Camera Hardware Controls (Torch / Flip) */}
                {cameraActive && (
                  <div className="absolute bottom-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-auto px-2">
                    <div className="flex items-center gap-1.5">
                      {torchSupported && (
                        <button
                          onClick={toggleTorch}
                          className={`p-2 rounded-xl backdrop-blur-md border text-xs font-bold transition flex items-center gap-1 ${
                            torchEnabled
                              ? 'bg-amber-400 text-amber-950 border-amber-300 shadow-md'
                              : 'bg-black/50 text-white border-white/20 hover:bg-black/70'
                          }`}
                          title="Linterna"
                        >
                          {torchEnabled ? <Zap className="w-3.5 h-3.5" /> : <ZapOff className="w-3.5 h-3.5" />}
                          <span className="text-[10px]">{torchEnabled ? 'Luz ON' : 'Flash'}</span>
                        </button>
                      )}
                      <button
                        onClick={switchCamera}
                        className="p-2 rounded-xl bg-black/50 backdrop-blur-md border border-white/20 text-white hover:bg-black/70 text-xs font-bold transition flex items-center gap-1"
                        title="Cambiar Cámara"
                      >
                        <SwitchCamera className="w-3.5 h-3.5" />
                        <span className="text-[10px] hidden sm:inline">Girar</span>
                      </button>
                    </div>

                    {/* Quick Demo Simulator button for desktop testing */}
                    <button
                      onClick={handleSimulateScan}
                      className="px-2.5 py-1 rounded-xl bg-emerald-500/80 hover:bg-emerald-500 text-white font-extrabold text-[10px] backdrop-blur-md transition shadow-sm"
                      title="Probar con una caja de ejemplo"
                    >
                      Probar Escaneo
                    </button>
                  </div>
                )}

                {/* Camera error message / fallback prompt */}
                {cameraError && (
                  <div className="p-5 text-center text-white bg-slate-900/95 absolute inset-0 flex flex-col items-center justify-center gap-3 z-30">
                    <AlertCircle className="w-10 h-10 text-amber-400" />
                    <p className="text-xs text-slate-300 leading-relaxed px-4">{cameraError}</p>
                    <button
                      onClick={startCamera}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-md"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reintentar cámara</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Upload image fallback button */}
              <div className="mt-4 flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition shadow-2xs">
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>Subir foto con código QR</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          ) : (
            /* DECODED RESULT CARD */
            <div className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-5 shadow-xs animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2 text-emerald-600 font-extrabold text-sm mb-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>¡Caja Radiografiada con Éxito por Nuro!</span>
              </div>

              {/* CONTAINER FOUND */}
              {scanResult.container ? (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl">
                          📦
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">
                            Caja Física Registrada
                          </span>
                          <h4 className="text-base font-black text-slate-900 leading-tight">
                            {scanResult.container.container.name}
                          </h4>
                          <span className="text-xs text-slate-500">
                            Tipo: {scanResult.container.container.type}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Location path */}
                    {getBreadcrumbs(scanResult.container.container.id) && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="font-semibold text-slate-800">
                          {getBreadcrumbs(scanResult.container.container.id)?.roomName}
                        </span>
                        <span className="text-slate-400">➔</span>
                        <span>{getBreadcrumbs(scanResult.container.container.id)?.furnitureName}</span>
                      </div>
                    )}
                  </div>

                  {/* Items inside container */}
                  <div>
                    <h5 className="font-bold text-xs text-slate-800 mb-2 flex items-center justify-between">
                      <span>Artículos dentro ({scanResult.container.itemsInContainer.length}):</span>
                    </h5>

                    {scanResult.container.itemsInContainer.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {scanResult.container.itemsInContainer.map((item) => (
                          <div
                            key={item.id}
                            className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs shadow-2xs hover:border-indigo-300 transition"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-base">{item.photoEmoji || '🏷️'}</span>
                              <div>
                                <h6 className="font-bold text-slate-900">{item.name}</h6>
                                <p className="text-[10px] text-slate-400">
                                  {item.category} • Cant: {item.quantity}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                locateItemOnMap(item.id);
                                onClose();
                              }}
                              className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] transition"
                            >
                              Ver en mapa
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic bg-white p-4 rounded-xl border border-dashed text-center">
                        Esta caja está vacía actualmente en el sistema.
                      </p>
                    )}
                  </div>

                  {/* Actions for this container */}
                  <div className="flex items-center gap-2 pt-2">
                    {onQuickAddItemToContainer && (
                      <button
                        onClick={() => {
                          onQuickAddItemToContainer(scanResult.container!.container.id);
                          onClose();
                        }}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-200"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Guardar nuevo artículo aquí</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        locateItemOnMap(scanResult.container!.container.id);
                        onClose();
                      }}
                      className="py-2.5 px-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-white font-bold text-xs transition"
                    >
                      Ubicar en plano 2D
                    </button>
                  </div>
                </div>
              ) : scanResult.item ? (
                /* SINGLE ITEM FOUND */
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{scanResult.item.photoEmoji || '📦'}</span>
                      <div>
                        <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">
                          Artículo Localizado
                        </span>
                        <h4 className="text-base font-black text-slate-900 leading-tight">
                          {scanResult.item.name}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {scanResult.item.category} • Tamaño {scanResult.item.size}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      locateItemOnMap(scanResult.item!.id);
                      onClose();
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-200"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>Mostrar ubicación en el mapa 2D</span>
                  </button>
                </div>
              ) : (
                /* UNRECOGNIZED QR */
                <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center space-y-2">
                  <p className="text-xs font-semibold text-slate-700">
                    Código detectado pero no coincide con ninguna caja de tu casa:
                  </p>
                  <p className="text-xs font-mono bg-slate-100 p-2 rounded-xl text-slate-800 break-all">
                    {scanResult.parsed.raw}
                  </p>
                </div>
              )}

              {/* Reset Scan button */}
              <button
                onClick={() => {
                  setScanResult(null);
                  startCamera();
                }}
                className="mt-4 w-full py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Escanear otra caja</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Consejo: Mantén la caja a 15-20 cm para enfoque rápido</span>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-bold"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
