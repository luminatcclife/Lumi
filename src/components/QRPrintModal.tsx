import React, { useEffect, useState, useMemo } from 'react';
import { 
  Printer, 
  Download, 
  X, 
  QrCode as QrIcon, 
  Check, 
  Copy, 
  Scissors, 
  Layers, 
  Grid, 
  FileText, 
  Sliders, 
  Box, 
  Wine, 
  ArrowUp, 
  Weight, 
  Snowflake,
  FolderOpen
} from 'lucide-react';
import { generateQrDataUrl, makeContainerQrPayload } from '../utils/qrUtils';
import { LocationBreadcrumbs, StorageContainer, StorageItem } from '../types/storage';
import { useStorage } from '../context/StorageContext';

export type LabelTemplateType = 'box_master' | 'sheet_a4' | 'shelf_strip';

interface QRPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  qrPayload: string;
  categoryOrType?: string;
  breadcrumbs?: LocationBreadcrumbs | null;
  containerId?: string;
}

export const QRPrintModal: React.FC<QRPrintModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  qrPayload,
  categoryOrType = 'Caja de Almacenaje',
  breadcrumbs,
  containerId,
}) => {
  const { allContainersWithLocation, items, spaces, findContainer } = useStorage();

  // Selected template layout
  const [templateType, setTemplateType] = useState<LabelTemplateType>('box_master');

  // Single label QR image
  const [singleDataUrl, setSingleDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Multi-sheet batch containers
  const [selectedContainerIds, setSelectedContainerIds] = useState<string[]>([]);
  const [batchQrMap, setBatchQrMap] = useState<Record<string, string>>({});

  // Label customization options
  const [showItemChecklist, setShowItemChecklist] = useState<boolean>(true);
  const [showHandwritingLines, setShowHandwritingLines] = useState<boolean>(true);
  const [showHandlingStamps, setShowHandlingStamps] = useState<boolean>(true);
  const [showCropMarks, setShowCropMarks] = useState<boolean>(true);
  const [stampsState, setStampsState] = useState<{
    fragile: boolean;
    thisSideUp: boolean;
    heavy: boolean;
    coldZone: boolean;
  }>({
    fragile: false,
    thisSideUp: true,
    heavy: false,
    coldZone: false,
  });

  // Target container items
  const activeContainerId = useMemo(() => {
    if (containerId) return containerId;
    if (qrPayload && qrPayload.includes(':CONT:')) {
      const parts = qrPayload.split(':');
      return parts[parts.length - 1];
    }
    return '';
  }, [containerId, qrPayload]);

  const itemsInsideActiveContainer = useMemo(() => {
    if (!activeContainerId) return [];
    return items.filter((i) => i.containerId === activeContainerId);
  }, [activeContainerId, items]);

  // Generate QR for single label
  useEffect(() => {
    if (isOpen && qrPayload) {
      generateQrDataUrl(qrPayload, 350).then((url) => setSingleDataUrl(url));
    }
  }, [isOpen, qrPayload]);

  // Initialize selected batch containers
  useEffect(() => {
    if (isOpen && allContainersWithLocation.length > 0) {
      const initial = activeContainerId
        ? [activeContainerId, ...allContainersWithLocation.filter((c) => c.id !== activeContainerId).slice(0, 7).map((c) => c.id)]
        : allContainersWithLocation.slice(0, 8).map((c) => c.id);
      setSelectedContainerIds(initial);
    }
  }, [isOpen, activeContainerId, allContainersWithLocation]);

  // Generate batch QRs
  useEffect(() => {
    if (isOpen && templateType === 'sheet_a4') {
      selectedContainerIds.forEach((cId) => {
        if (!batchQrMap[cId]) {
          const payload = makeContainerQrPayload(cId);
          generateQrDataUrl(payload, 250).then((url) => {
            setBatchQrMap((prev) => ({ ...prev, [cId]: url }));
          });
        }
      });
    }
  }, [isOpen, templateType, selectedContainerIds, batchQrMap]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!singleDataUrl) return;
    const a = document.createElement('a');
    a.href = singleDataUrl;
    a.download = `Etiqueta_Caja_${title.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    a.click();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(qrPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Toggle container in batch sheet
  const toggleContainerInBatch = (id: string) => {
    setSelectedContainerIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 8) {
        return [...prev.slice(1), id]; // keep max 8 for standard A4 grid
      }
      return [...prev, id];
    });
  };

  const currentHumanCode = qrPayload.includes(':') 
    ? qrPayload.split(':').slice(-1)[0].toUpperCase() 
    : title.slice(0, 8).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      {/* Modal Card (hidden in print, replaced by printable area) */}
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col my-4 max-h-[92vh] print:shadow-none print:border-none print:max-w-none print:max-h-none print:rounded-none">
        
        {/* Header (No-Print) */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <QrIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                Plantilla Física de Etiquetas para Cajas
              </h3>
              <p className="text-xs text-slate-500">
                Diseño profesional optimizado para impresión física y pegado en cajas
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

        {/* Studio Controls Bar (No-Print) */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden shrink-0">
          {/* Template Selector Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
            <button
              onClick={() => setTemplateType('box_master')}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                templateType === 'box_master'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Etiqueta Maestra (10x7 cm)</span>
            </button>
            <button
              onClick={() => setTemplateType('sheet_a4')}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                templateType === 'sheet_a4'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Hoja A4 (8 Cajas / Hoja)</span>
            </button>
            <button
              onClick={() => setTemplateType('shelf_strip')}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                templateType === 'shelf_strip'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Frontal de Balda Slim</span>
            </button>
          </div>

          {/* Quick Options Toggles */}
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={showItemChecklist}
                onChange={(e) => setShowItemChecklist(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
              />
              <span>Checklist</span>
            </label>
            <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={showHandwritingLines}
                onChange={(e) => setShowHandwritingLines(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
              />
              <span>Renglones rotulador</span>
            </label>
            <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={showHandlingStamps}
                onChange={(e) => setShowHandlingStamps(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
              />
              <span>Sellos (Frágil / Arriba)</span>
            </label>
            <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={showCropMarks}
                onChange={(e) => setShowCropMarks(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
              />
              <span>Marcas de corte ✂️</span>
            </label>
          </div>
        </div>

        {/* Handling Stamp Chooser Bar (No-Print) */}
        {showHandlingStamps && templateType !== 'shelf_strip' && (
          <div className="px-6 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2 text-xs print:hidden shrink-0">
            <span className="text-slate-500 font-semibold mr-1">Sellos de caja activa:</span>
            <button
              onClick={() => setStampsState((s) => ({ ...s, fragile: !s.fragile }))}
              className={`px-2 py-1 rounded-lg border flex items-center gap-1 font-bold transition ${
                stampsState.fragile
                  ? 'bg-rose-50 border-rose-300 text-rose-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Wine className="w-3 h-3" />
              <span>🍷 Frágil</span>
            </button>
            <button
              onClick={() => setStampsState((s) => ({ ...s, thisSideUp: !s.thisSideUp }))}
              className={`px-2 py-1 rounded-lg border flex items-center gap-1 font-bold transition ${
                stampsState.thisSideUp
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ArrowUp className="w-3 h-3" />
              <span>⬆️ Hacia Arriba</span>
            </button>
            <button
              onClick={() => setStampsState((s) => ({ ...s, heavy: !s.heavy }))}
              className={`px-2 py-1 rounded-lg border flex items-center gap-1 font-bold transition ${
                stampsState.heavy
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Weight className="w-3 h-3" />
              <span>⚖️ Pesada</span>
            </button>
            <button
              onClick={() => setStampsState((s) => ({ ...s, coldZone: !s.coldZone }))}
              className={`px-2 py-1 rounded-lg border flex items-center gap-1 font-bold transition ${
                stampsState.coldZone
                  ? 'bg-cyan-50 border-cyan-300 text-cyan-800'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Snowflake className="w-3 h-3" />
              <span>❄️ Zona Fría</span>
            </button>
          </div>
        )}

        {/* Batch Container Selector (Only in sheet_a4) */}
        {templateType === 'sheet_a4' && (
          <div className="px-6 py-2.5 bg-indigo-50/50 border-b border-indigo-100 text-xs print:hidden shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-extrabold text-indigo-950">
                Selecciona las cajas a incluir en la hoja A4 ({selectedContainerIds.length} / 8 máx):
              </span>
              <button
                onClick={() => setSelectedContainerIds(allContainersWithLocation.slice(0, 8).map((c) => c.id))}
                className="text-[11px] text-indigo-600 font-bold hover:underline"
              >
                Seleccionar primeras 8
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-white rounded-xl border border-indigo-100">
              {allContainersWithLocation.map((c) => {
                const isChecked = selectedContainerIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleContainerInBatch(c.id)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition flex items-center gap-1 ${
                      isChecked
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{isChecked ? '✓' : '+'}</span>
                    <span>{c.name}</span>
                    <span className="text-[9px] opacity-75">({c.roomName})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Printable Canvas / Sheet Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60 flex flex-col items-center print:p-0 print:bg-white print:overflow-visible">
          
          {/* ========================================================================= */}
          {/* TEMPLATE 1: BOX MASTER BADGE (10x7 cm)                                    */}
          {/* ========================================================================= */}
          {templateType === 'box_master' && (
            <div className="relative my-auto flex flex-col items-center">
              {/* Cutting guides notice */}
              {showCropMarks && (
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 mb-2 print:text-black">
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Línea de corte perimetral con tijeras para tu caja física</span>
                </div>
              )}

              {/* Physical Master Box Label Card */}
              <div
                id="printable-box-label"
                className={`relative bg-white text-slate-900 border-2 border-slate-900 shadow-xl print:shadow-none w-[340px] sm:w-[420px] rounded-2xl overflow-hidden print:w-[130mm] print:border-black print:rounded-lg ${
                  showCropMarks ? 'border-dashed' : 'border-solid'
                }`}
                style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
              >
                {/* 1. Header Color Band (Room Identification) */}
                <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between border-b-2 border-slate-900 print:bg-black print:text-white">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-400 border border-white"></span>
                    <span className="font-black text-xs uppercase tracking-wider">
                      {breadcrumbs?.roomName || 'UBICAYA • SISTEMA DE ALMACENAJE'}
                    </span>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-white/20 text-white tracking-widest">
                    {categoryOrType}
                  </span>
                </div>

                {/* 2. Main Box Title & Alphanumeric Code */}
                <div className="p-4 border-b border-slate-300 bg-gradient-to-b from-white to-slate-50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight uppercase font-sans">
                        {title}
                      </h2>
                      {subtitle && (
                        <p className="text-xs text-slate-600 font-semibold mt-0.5">{subtitle}</p>
                      )}
                    </div>
                    {/* Human Alphanumeric Badge */}
                    <div className="shrink-0 text-center px-2.5 py-1 bg-slate-900 text-white rounded-lg font-mono font-black text-xs shadow-xs print:border print:border-black print:bg-black">
                      <span className="text-[8px] block opacity-80 uppercase tracking-widest">CÓDIGO</span>
                      <span>{currentHumanCode}</span>
                    </div>
                  </div>

                  {/* Breadcrumb Path */}
                  {breadcrumbs && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-700 bg-slate-200/70 px-2.5 py-1 rounded-md border border-slate-300">
                      <span>📍</span>
                      <span>{breadcrumbs.roomName}</span>
                      <span className="text-slate-400">➔</span>
                      <span>{breadcrumbs.furnitureName}</span>
                      {breadcrumbs.containerName !== title && (
                        <>
                          <span className="text-slate-400">➔</span>
                          <span className="text-indigo-900 underline">{breadcrumbs.containerName}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Core Grid: High Contrast QR + Inventory Checklist */}
                <div className="p-4 grid grid-cols-12 gap-3 bg-white">
                  {/* Left Column: Big Crisp QR Code */}
                  <div className="col-span-5 flex flex-col items-center justify-center border-r border-slate-200 pr-3">
                    <div className="p-1.5 bg-white border-2 border-slate-900 rounded-xl shadow-xs print:border-black">
                      {singleDataUrl ? (
                        <img
                          src={singleDataUrl}
                          alt={`QR for ${title}`}
                          className="w-32 h-32 object-contain"
                        />
                      ) : (
                        <div className="w-32 h-32 flex items-center justify-center text-slate-400 text-xs">
                          Generando QR...
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] font-black text-slate-500 mt-1 uppercase tracking-wider text-center">
                      ESCANEAR CON CÁMARA
                    </span>
                  </div>

                  {/* Right Column: Content Checklist & Notes */}
                  <div className="col-span-7 flex flex-col justify-between pl-1">
                    {showItemChecklist && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-1 border-b border-slate-200 pb-0.5">
                          <span>📦 CONTENIDO REGISTRADO:</span>
                        </span>
                        {itemsInsideActiveContainer.length > 0 ? (
                          <ul className="space-y-1 mt-1 text-[11px] text-slate-800">
                            {itemsInsideActiveContainer.slice(0, 4).map((item) => (
                              <li key={item.id} className="flex items-center gap-1.5 truncate">
                                <span className="w-3 h-3 rounded-xs border border-slate-600 inline-flex items-center justify-center text-[9px] font-bold">
                                  ✓
                                </span>
                                <span className="font-semibold truncate">{item.name}</span>
                              </li>
                            ))}
                            {itemsInsideActiveContainer.length > 4 && (
                              <li className="text-[10px] text-slate-500 italic">
                                + {itemsInsideActiveContainer.length - 4} artículos más...
                              </li>
                            )}
                          </ul>
                        ) : (
                          <p className="text-[10px] text-slate-400 italic py-1">
                            (Caja lista para guardar nuevos artículos)
                          </p>
                        )}
                      </div>
                    )}

                    {/* Handwriting lines for physical marker notes */}
                    {showHandwritingLines && (
                      <div className="mt-2 space-y-1.5">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                          Añadidos a mano:
                        </span>
                        <div className="border-b border-dashed border-slate-400 h-2 w-full"></div>
                        <div className="border-b border-dashed border-slate-400 h-2 w-full"></div>
                        <div className="border-b border-dashed border-slate-400 h-2 w-full"></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Physical Handling Stamps (Stamps row) */}
                {showHandlingStamps && (
                  <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      {stampsState.fragile && (
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                          🍷 FRÁGIL
                        </span>
                      )}
                      {stampsState.thisSideUp && (
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1">
                          ⬆️ ESTE LADO ARRIBA
                        </span>
                      )}
                      {stampsState.heavy && (
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                          ⚖️ PESADA
                        </span>
                      )}
                      {stampsState.coldZone && (
                        <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-900 border border-cyan-300 flex items-center gap-1">
                          ❄️ ZONA FRÍA
                        </span>
                      )}
                    </div>
                    <span className="text-slate-400 text-[9px] font-mono">UBICAYA BOX v2</span>
                  </div>
                )}

                {/* Crop marks in corners */}
                {showCropMarks && (
                  <>
                    <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-black"></span>
                    <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-black"></span>
                    <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-black"></span>
                    <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-black"></span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TEMPLATE 2: A4 SHEET (8 BOX LABELS GRID 2x4)                              */}
          {/* ========================================================================= */}
          {templateType === 'sheet_a4' && (
            <div className="w-full flex flex-col items-center">
              <div className="text-xs text-slate-500 mb-3 print:hidden text-center">
                Previsualización de Hoja A4 estándar con cuadrícula de 8 etiquetas para cajas (Avery / Apli 99.1 x 67.7 mm):
              </div>

              {/* A4 Sheet Container */}
              <div
                className="bg-white border-2 border-slate-300 shadow-2xl p-4 sm:p-6 w-full max-w-[210mm] min-h-[297mm] grid grid-cols-2 gap-3 print:border-none print:shadow-none print:p-0 print:m-0"
                style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
              >
                {selectedContainerIds.map((cId) => {
                  const spot = allContainersWithLocation.find((c) => c.id === cId);
                  const qr = batchQrMap[cId];
                  const boxItems = items.filter((i) => i.containerId === cId);
                  if (!spot) return null;

                  return (
                    <div
                      key={cId}
                      className="border-2 border-dashed border-slate-400 rounded-xl p-2.5 flex flex-col justify-between bg-white relative print:border-black"
                    >
                      {/* Top Header */}
                      <div className="flex items-center justify-between border-b border-slate-300 pb-1 mb-1">
                        <span className="text-[10px] font-black uppercase text-indigo-900 truncate max-w-[130px]">
                          {spot.roomName} ➔ {spot.furnitureName}
                        </span>
                        <span className="text-[9px] font-mono font-bold bg-slate-100 px-1 py-0.5 rounded">
                          {spot.type}
                        </span>
                      </div>

                      {/* Middle: Title & QR */}
                      <div className="flex items-center gap-2">
                        <div className="shrink-0 p-1 bg-white border border-slate-800 rounded-lg">
                          {qr ? (
                            <img src={qr} alt={spot.name} className="w-18 h-18 object-contain" />
                          ) : (
                            <div className="w-18 h-18 flex items-center justify-center text-[8px] text-slate-400">
                              QR...
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-xs text-slate-900 uppercase leading-snug line-clamp-2">
                            {spot.name}
                          </h4>
                          {showItemChecklist && (
                            <div className="mt-1 text-[9px] text-slate-600 line-clamp-2">
                              {boxItems.length > 0 ? (
                                boxItems.map((bi) => `• ${bi.name}`).join(' ')
                              ) : (
                                <span className="italic text-slate-400">Caja vacía / nueva</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom row */}
                      <div className="mt-1 pt-1 border-t border-slate-200 flex items-center justify-between text-[8px] text-slate-500 font-mono">
                        <span>UBICAYA • {spot.id}</span>
                        <span className="font-sans font-bold text-slate-700">✂️ Recortar</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TEMPLATE 3: SLIM SHELF STRIP (100x30 mm)                                  */}
          {/* ========================================================================= */}
          {templateType === 'shelf_strip' && (
            <div className="my-auto flex flex-col items-center">
              <div className="text-xs text-slate-500 mb-3 print:hidden text-center">
                Formato cinta horizontal para canto frontal de balda o tirador de cajón:
              </div>

              <div
                className="bg-white border-2 border-slate-900 rounded-xl shadow-lg w-[320px] sm:w-[460px] p-2.5 flex items-center justify-between gap-3 print:border-black"
                style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
              >
                {/* QR Code */}
                <div className="shrink-0 p-1 bg-white border border-slate-900 rounded-lg">
                  {singleDataUrl ? (
                    <img src={singleDataUrl} alt={title} className="w-16 h-16 object-contain" />
                  ) : (
                    <div className="w-16 h-16 flex items-center justify-center text-[9px]">QR...</div>
                  )}
                </div>

                {/* Title & Path */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-indigo-700">
                    <span>📍 {breadcrumbs?.roomName || 'UBICAYA'}</span>
                    <span>➔</span>
                    <span>{breadcrumbs?.furnitureName || categoryOrType}</span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 uppercase truncate leading-tight">
                    {title}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono">
                    ID: {currentHumanCode}
                  </p>
                </div>

                {/* Scissor icon */}
                <div className="shrink-0 flex flex-col items-center text-[9px] text-slate-400">
                  <Scissors className="w-4 h-4 text-slate-600" />
                  <span>✂️ Corte</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls (No-Print) */}
        <div className="px-6 py-4 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 print:hidden shrink-0">
          {/* Quick Payload copy */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-mono bg-slate-100 px-2 py-1 rounded max-w-[200px] truncate">
              {qrPayload}
            </span>
            <button
              onClick={handleCopyCode}
              className="text-indigo-600 font-bold hover:underline flex items-center gap-1"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs transition"
            >
              Cerrar
            </button>
            <button
              onClick={handleDownload}
              disabled={!singleDataUrl}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs transition flex items-center gap-1.5 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar PNG</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition flex items-center gap-2 shadow-md shadow-indigo-200 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Plantilla Física (A4)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
