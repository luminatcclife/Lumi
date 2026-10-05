import React, { useEffect, useState } from 'react';
import { Printer, Download, X, QrCode as QrIcon, Check, Copy } from 'lucide-react';
import { generateQrDataUrl } from '../utils/qrUtils';
import { LocationBreadcrumbs } from '../types/storage';

interface QRPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  qrPayload: string;
  categoryOrType?: string;
  breadcrumbs?: LocationBreadcrumbs | null;
}

export const QRPrintModal: React.FC<QRPrintModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  qrPayload,
  categoryOrType,
  breadcrumbs,
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && qrPayload) {
      generateQrDataUrl(qrPayload, 300).then((url) => setDataUrl(url));
    }
  }, [isOpen, qrPayload]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `QR_${title.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    a.click();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(qrPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-lg">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <QrIcon className="w-5 h-5" />
            </div>
            <span>Etiqueta con Código QR</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body & Printable Area */}
        <div className="p-6">
          <p className="text-xs text-slate-500 mb-4 text-center">
            Pega esta etiqueta en tu caja, cajón, balda o artículo para escanearlo al instante con el móvil o la cámara.
          </p>

          {/* Label Card preview & printable zone */}
          <div
            id="printable-qr-sheet"
            className="bg-white border-2 border-dashed border-slate-300 rounded-xl p-5 shadow-xs text-center flex flex-col items-center justify-center mx-auto"
          >
            <div className="w-full border-b border-slate-200 pb-2 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 tracking-wider uppercase">
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                UbicaYa
              </div>
              {categoryOrType && (
                <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                  {categoryOrType}
                </span>
              )}
            </div>

            <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2 px-2">
              {title}
            </h3>

            {subtitle && (
              <p className="text-xs text-slate-500 mt-0.5 font-medium">{subtitle}</p>
            )}

            {/* QR Image */}
            <div className="my-3 p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
              {dataUrl ? (
                <img
                  src={dataUrl}
                  alt={`QR for ${title}`}
                  className="w-44 h-44 object-contain mx-auto"
                />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center text-slate-400 text-xs">
                  Generando QR...
                </div>
              )}
            </div>

            {/* Breadcrumb path for easy physical reference */}
            {breadcrumbs && (
              <div className="text-[11px] text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-100 max-w-full text-center">
                <span className="font-semibold text-slate-700">{breadcrumbs.roomName}</span>
                <span className="mx-1 text-slate-400">➔</span>
                <span>{breadcrumbs.furnitureName}</span>
                {breadcrumbs.containerName !== title && (
                  <>
                    <span className="mx-1 text-slate-400">➔</span>
                    <span className="text-indigo-600 font-medium">{breadcrumbs.containerName}</span>
                  </>
                )}
              </div>
            )}

            <div className="mt-2 text-[10px] text-slate-400 font-mono tracking-tight">
              ID: {qrPayload}
            </div>
          </div>

          {/* Quick Payload copy */}
          <div className="mt-4 flex items-center justify-between text-xs bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
            <span className="text-slate-600 font-mono truncate max-w-[240px]">{qrPayload}</span>
            <button
              onClick={handleCopyCode}
              className="text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1 shrink-0 ml-2"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200/60 font-medium text-sm transition"
          >
            Cerrar
          </button>
          <button
            onClick={handleDownload}
            disabled={!dataUrl}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-white font-medium text-sm transition flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-4 h-4" />
            Descargar PNG
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-medium text-sm transition flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Imprimir Etiqueta
          </button>
        </div>
      </div>
    </div>
  );
};
