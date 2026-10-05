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
  RefreshCw 
} from 'lucide-react';
import { parseQrCode, ParsedQr } from '../utils/qrUtils';
import { useStorage } from '../context/StorageContext';
import { useMascot } from '../context/MascotContext';
import { LumiAvatar } from './mascot/LumiAvatar';
import { MascotMessageBubble } from './mascot/MascotMessageBubble';
import { StorageItem, StorageContainer } from '../types/storage';

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
    getBreadcrumbs 
  } = useStorage();

  const { mascot, dialogues, triggerCelebration } = useMascot();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
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
  }, []);

  const handleDetectedCode = useCallback(
    (codeText: string) => {
      const parsed = parseQrCode(codeText);

      if (parsed.type === 'container') {
        const found = findContainer(parsed.id);
        if (found) {
          const itemsIn = items.filter((i) => i.containerId === parsed.id);
          setScanResult({
            parsed,
            container: { container: found.container, itemsInContainer: itemsIn },
          });
          triggerCelebration();
          return;
        }
      } else if (parsed.type === 'item') {
        const foundItem = findItem(parsed.id);
        if (foundItem) {
          setScanResult({
            parsed,
            item: foundItem,
          });
          triggerCelebration();
          return;
        }
      }

      // If unrecognized or custom code
      setScanResult({
        parsed,
        container: null,
        item: null,
      });
    },
    [findContainer, findItem, items]
  );

  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        handleDetectedCode(code.data);
        return; // stop continuous scanning when detected
      }
    }

    animFrameRef.current = requestAnimationFrame(scanFrame);
  }, [handleDetectedCode]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setScanResult(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('La cámara no está disponible en este navegador o contexto.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);
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
  }, [scanFrame]);

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
          handleDetectedCode(code.data);
        } else {
          alert('No se pudo detectar ningún código QR claro en la imagen subida. Prueba con otra foto o ángulo.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-base">Escáner de Códigos QR</h2>
              <p className="text-xs text-slate-500">Escanea una caja, cajón o artículo registrado</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Video Canvas */}
        <div className="p-6 flex flex-col items-center space-y-4">
          {!scanResult ? (
            <div className="w-full flex flex-col items-center">
              {/* Mascot Explorer speech bubble */}
              <div className="w-full max-w-[360px] mb-4">
                <MascotMessageBubble
                  dialoguePool={dialogues.qrScanning}
                  mood="scanning"
                  title={`${mascot.name} Explorador QR`}
                  compact
                />
              </div>

              <div className="relative w-full aspect-square max-w-[320px] bg-slate-900 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border-2 border-slate-700">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Animated scan viewfinder HUD */}
                {cameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                    <div className="relative w-48 h-48 border-2 border-indigo-400/80 rounded-xl">
                      {/* Corner marks */}
                      <span className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-indigo-400"></span>
                      <span className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-indigo-400"></span>
                      <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-indigo-400"></span>
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-indigo-400"></span>

                      {/* Laser sweep line */}
                      <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-sm shadow-indigo-400/80 animate-scan-line"></div>
                    </div>
                    <span className="mt-4 text-[11px] font-medium text-white/90 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs">
                      Apunta al código QR de la caja o artículo
                    </span>
                  </div>
                )}

                {/* Camera error message / fallback prompt */}
                {cameraError && (
                  <div className="p-5 text-center text-white bg-slate-900/90 absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <AlertCircle className="w-9 h-9 text-amber-400" />
                    <p className="text-xs text-slate-300 leading-relaxed px-4">{cameraError}</p>
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

              {/* Upload image fallback */}
              <div className="mt-4 flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition shadow-2xs">
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
            /* Result display card */
            <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm mb-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>¡Código QR Detectado con Éxito!</span>
              </div>

              {/* If it is a Container */}
              {scanResult.container ? (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <Box className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          Contenedor Físico
                        </span>
                        <h3 className="font-bold text-slate-900 text-base mt-1">
                          {scanResult.container.container.name}
                        </h3>
                        {(() => {
                          const breadcrumbs = getBreadcrumbs(scanResult.container.container.id);
                          return (
                            breadcrumbs && (
                              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>
                                  {breadcrumbs.roomName} ➔ {breadcrumbs.furnitureName}
                                </span>
                              </p>
                            )
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Items inside this container */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
                      <span>Artículos Guardados en este Sitio</span>
                      <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full text-[11px]">
                        {scanResult.container.itemsInContainer.length}
                      </span>
                    </h4>

                    {scanResult.container.itemsInContainer.length === 0 ? (
                      <div className="text-xs text-slate-400 bg-white p-4 rounded-xl border border-dashed border-slate-200 text-center">
                        Este contenedor está vacío actualmente.
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                        {scanResult.container.itemsInContainer.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 text-xs hover:border-indigo-300 transition"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-base">{item.photoEmoji || '📦'}</span>
                              <div className="truncate">
                                <p className="font-medium text-slate-800 truncate">{item.name}</p>
                                <span className="text-[10px] text-slate-400">{item.category}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                locateItemOnMap(item.id);
                                onClose();
                              }}
                              className="px-2 py-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium text-[11px] shrink-0 transition"
                            >
                              Ver en Mapa
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions for this container */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    {onQuickAddItemToContainer && (
                      <button
                        onClick={() => {
                          const id = scanResult.container?.container.id;
                          if (id) {
                            onQuickAddItemToContainer(id);
                            onClose();
                          }
                        }}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                      >
                        <PlusCircle className="w-4 h-4" />
                        Registrar objeto aquí
                      </button>
                    )}
                    <button
                      onClick={() => {
                        // Locate the container in map
                        if (scanResult.container) {
                          const firstItem = scanResult.container.itemsInContainer[0];
                          if (firstItem) {
                            locateItemOnMap(firstItem.id);
                          }
                        }
                        onClose();
                      }}
                      className="py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-white text-slate-700 font-medium text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <MapPin className="w-4 h-4 text-slate-500" />
                      Ir al Mapa
                    </button>
                  </div>
                </div>
              ) : scanResult.item ? (
                /* If it is an Item */
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 text-2xl flex items-center justify-center shrink-0">
                        {scanResult.item.photoEmoji || '📦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          Artículo Identificado
                        </span>
                        <h3 className="font-bold text-slate-900 text-base mt-1">
                          {scanResult.item.name}
                        </h3>
                        <p className="text-xs text-slate-500">{scanResult.item.category}</p>

                        {/* Breadcrumbs where to find it */}
                        {(() => {
                          const breadcrumbs = getBreadcrumbs(scanResult.item.containerId);
                          return (
                            breadcrumbs && (
                              <div className="mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                                <span className="text-[10px] text-slate-400 font-medium uppercase block mb-0.5">
                                  Ubicación Física Guardada:
                                </span>
                                <div className="font-semibold text-slate-800 flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                  <span>{breadcrumbs.roomName}</span>
                                  <span className="text-slate-400 font-normal">➔</span>
                                  <span>{breadcrumbs.furnitureName}</span>
                                  <span className="text-slate-400 font-normal">➔</span>
                                  <span className="text-indigo-600">{breadcrumbs.containerName}</span>
                                </div>
                              </div>
                            )
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        locateItemOnMap(scanResult.item!.id);
                        onClose();
                      }}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                    >
                      <MapPin className="w-4 h-4" />
                      Ver Ubicación en Mapa Interactivo
                    </button>
                  </div>
                </div>
              ) : (
                /* Unrecognized code */
                <div className="space-y-3 text-center py-2">
                  <Package className="w-10 h-10 text-slate-400 mx-auto" />
                  <div>
                    <h4 className="font-semibold text-slate-800 text-sm">Código QR Externo o Nuevo</h4>
                    <p className="text-xs text-slate-500 font-mono mt-1 break-all bg-white p-2 rounded border border-slate-200">
                      {scanResult.parsed.raw}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      Este código no pertenece a ningún artículo o contenedor existente.
                    </p>
                  </div>
                </div>
              )}

              {/* Scan another button */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex justify-center">
                <button
                  onClick={() => {
                    setScanResult(null);
                    startCamera();
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 py-1 px-3 rounded-lg hover:bg-indigo-50 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Escanear otro código
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Soporta cualquier cámara web o móvil con flash</span>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-medium px-3 py-1 rounded-md hover:bg-slate-200 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
