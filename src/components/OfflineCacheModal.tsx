import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Database, 
  HardDrive, 
  CheckCircle2, 
  RefreshCw, 
  X, 
  Trash2, 
  ShieldCheck, 
  Clock, 
  Layers, 
  Package,
  Zap
} from 'lucide-react';
import { offlineCacheService, CacheMetadata } from '../services/offlineCache';
import { useStorage } from '../context/StorageContext';
import { LumiCharacter } from './mascot/LumiCharacter';

interface OfflineCacheModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  isSimulatedOffline: boolean;
  onToggleSimulatedOffline: () => void;
}

export const OfflineCacheModal: React.FC<OfflineCacheModalProps> = ({
  isOpen,
  onClose,
  isOnline,
  isSimulatedOffline,
  onToggleSimulatedOffline,
}) => {
  const { spaces, items } = useStorage();

  const [cacheStats, setCacheStats] = useState<{
    hasIndexedDB: boolean;
    hasLocalStorage: boolean;
    meta: CacheMetadata | null;
    estimatedSizeKb: number;
  } | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const loadStats = async () => {
    const stats = await offlineCacheService.getCacheStatus();
    setCacheStats(stats);
  };

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleForceSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      await offlineCacheService.syncToCache(spaces, items);
      await loadStats();
      setSyncMessage('¡Caché de IndexedDB y LocalStorage sincronizada con éxito!');
      setTimeout(() => setSyncMessage(null), 3500);
    } catch (e) {
      setSyncMessage('Error al sincronizar la caché.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearCache = async () => {
    if (confirm('¿Vaciar la caché local de IndexedDB y LocalStorage? Los datos en memoria no se borrarán hasta refrescar.')) {
      await offlineCacheService.clearAllCache();
      await loadStats();
      setSyncMessage('Caché local vaciada.');
      setTimeout(() => setSyncMessage(null), 3000);
    }
  };

  const effectiveStatus = isOnline && !isSimulatedOffline;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white shadow-xs ${
                effectiveStatus ? 'bg-emerald-600' : 'bg-amber-600'
              }`}
            >
              {effectiveStatus ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">
                Estrategia de Caché & Modo Offline
              </h2>
              <p className="text-xs text-slate-500">
                Almacenamiento dual persistente con IndexedDB y LocalStorage
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Connection Status Card */}
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
              effectiveStatus
                ? 'bg-emerald-50/70 border-emerald-200'
                : 'bg-amber-50/80 border-amber-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{effectiveStatus ? '🟢' : '⚡'}</span>
              <div>
                <h3 className={`font-bold text-sm ${effectiveStatus ? 'text-emerald-950' : 'text-amber-950'}`}>
                  {effectiveStatus ? 'Conectado a Internet' : 'Modo Sin Conexión (Offline Activo)'}
                </h3>
                <p className={`text-xs ${effectiveStatus ? 'text-emerald-700' : 'text-amber-800'} mt-0.5`}>
                  {effectiveStatus
                    ? 'Tus datos se sincronizan continuamente en tu base de datos local para que nunca dependas de la red.'
                    : 'Navegando y consultando mapa y objetos 100% desde la caché local sin conexión.'}
                </p>
              </div>
            </div>

            {/* Offline simulation toggle */}
            <button
              onClick={onToggleSimulatedOffline}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition border ${
                isSimulatedOffline
                  ? 'bg-amber-600 text-white border-amber-700'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {isSimulatedOffline ? 'Salir de Simulación' : 'Simular Offline'}
            </button>
          </div>

          {/* Miner Mascot Offline Bunker Banner */}
          {!effectiveStatus && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-3.5 flex items-center gap-3.5 shadow-2xs">
              <LumiCharacter expression="offline" size="sm" isFloating />
              <div className="text-xs text-amber-950">
                <span className="font-extrabold block text-slate-900">
                  ¡Sin internet no nos paramos!
                </span>
                <span className="text-[11px] text-amber-800 leading-snug">
                  Guardando tus cosas en nuestro búnker local (IndexedDB). Cuando vuelva la red, todo seguirá intacto y ordenado.
                </span>
              </div>
            </div>
          )}

          {syncMessage && (
            <div className="p-3 bg-emerald-100/70 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{syncMessage}</span>
            </div>
          )}

          {/* Dual Storage Mechanics */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Arquitectura de Almacenamiento Local
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* IndexedDB Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    <Database className="w-4 h-4 text-indigo-600" />
                    <span>IndexedDB</span>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                    Activo
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Base de datos estructurada de alta capacidad para mapa, planos, fotos y jerarquías completas.
                </p>
                <div className="text-[10px] text-indigo-700 font-mono pt-1">
                  Base: UbicaYa_OfflineDB
                </div>
              </div>

              {/* LocalStorage Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    <HardDrive className="w-4 h-4 text-amber-600" />
                    <span>LocalStorage</span>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                    Activo
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Copia de seguridad ultrarrápida y síncrona para inicio instantáneo sin pantalla de carga.
                </p>
                <div className="text-[10px] text-amber-700 font-mono pt-1">
                  Tamaño est: ~{cacheStats?.estimatedSizeKb || 0} KB
                </div>
              </div>
            </div>
          </div>

          {/* Cached inventory metrics */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <h4 className="font-bold text-slate-800 flex items-center justify-between">
              <span>Contenido Guardado en Caché Local:</span>
              <span className="text-[10px] text-slate-400 font-normal">
                {cacheStats?.meta?.lastUpdated
                  ? `Último guardado: ${new Date(cacheStats.meta.lastUpdated).toLocaleTimeString()}`
                  : 'Sincronizado'}
              </span>
            </h4>

            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="font-extrabold text-slate-900 text-base block">{items.length}</span>
                <span className="text-[10px] text-slate-500">Artículos</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="font-extrabold text-slate-900 text-base block">
                  {spaces.reduce((acc, s) => acc + s.rooms.length, 0)}
                </span>
                <span className="text-[10px] text-slate-500">Habitaciones</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="font-extrabold text-slate-900 text-base block">
                  {spaces.reduce(
                    (acc, s) => acc + s.rooms.reduce((rAcc, r) => rAcc + r.furniture.length, 0),
                    0
                  )}
                </span>
                <span className="text-[10px] text-slate-500">Muebles / Baldas</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              onClick={handleForceSync}
              disabled={isSyncing}
              className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sincronizar Caché Ahora</span>
            </button>

            <button
              onClick={handleClearCache}
              className="py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 text-slate-600 font-medium text-xs flex items-center justify-center gap-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Vaciar Caché</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Datos 100% privados guardados en tu navegador</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg text-slate-600 hover:bg-slate-200 font-medium transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
