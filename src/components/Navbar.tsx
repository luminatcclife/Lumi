import React, { useState } from 'react';
import { 
  Map, 
  Package, 
  Sparkles, 
  Camera, 
  Plus, 
  Download, 
  Upload, 
  RotateCcw, 
  MoreVertical,
  Compass,
  CheckCircle2,
  Box,
  Wifi,
  WifiOff,
  Database
} from 'lucide-react';
import { useStorage } from '../context/StorageContext';
import { useMascot } from '../context/MascotContext';
import { LumiAvatar } from './mascot/LumiAvatar';

interface NavbarProps {
  onOpenAddItem: () => void;
  onOpenAdvisor: () => void;
  onOpenScanner: () => void;
  onOpenOfflineCache: () => void;
  isOnline: boolean;
  isSimulatedOffline: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAddItem,
  onOpenAdvisor,
  onOpenScanner,
  onOpenOfflineCache,
  isOnline,
  isSimulatedOffline,
}) => {
  const { 
    activeTab, 
    setActiveTab, 
    items, 
    spaces, 
    resetToDefaults, 
    exportDataJson, 
    importDataJson 
  } = useStorage();

  const { mascot, setIsOnboardingOpen } = useMascot();

  const [showDataMenu, setShowDataMenu] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const effectiveOnline = isOnline && !isSimulatedOffline;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleExport = () => {
    const data = exportDataJson();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `UbicaYa_CopiaSeguridad_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowDataMenu(false);
    showToast('Copia de seguridad descargada con éxito');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importDataJson(content);
      if (success) {
        showToast('Datos restaurados correctamente');
      } else {
        alert('El archivo no tiene el formato JSON esperado para UbicaYa.');
      }
      setShowDataMenu(false);
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (confirm('¿Restablecer los datos a la demostración inicial (Despacho, Salón, Dormitorio, Trastero con 12 artículos organizados)?')) {
      resetToDefaults();
      setShowDataMenu(false);
      showToast('Datos de demostración cargados');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => setActiveTab('map')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 text-white flex items-center justify-center shadow-sm shadow-indigo-500/20 group-hover:scale-105 transition">
              <Box className="w-5 h-5 text-indigo-100" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 text-lg tracking-tight">
                  UbicaYa
                </span>
                <span className="bg-indigo-50 text-indigo-700 font-bold text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider border border-indigo-200/60">
                  Smart
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Mapa Interactivo & Asesor DIY
              </p>
            </div>
          </div>

          {/* Mascot Quick Chat / Tour Button */}
          <button
            onClick={() => setIsOnboardingOpen(true)}
            className="hidden sm:flex items-center gap-1.5 p-1 px-2.5 rounded-2xl bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200/90 text-xs text-indigo-900 transition cursor-pointer shadow-2xs group"
            title={`Hablar con ${mascot.name} o ver el tour inicial`}
          >
            <LumiAvatar size="sm" interactive={false} />
            <span className="font-bold text-[11px] text-indigo-800 group-hover:text-indigo-950">
              {mascot.name}
            </span>
          </button>
        </div>

        {/* Tab Navigation Pill Bar */}
        <nav className="flex items-center bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('map')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
              activeTab === 'map'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Map className="w-4 h-4 text-indigo-600" />
            <span>Mapa</span>
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
              activeTab === 'search'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <span className="text-sm">🔍</span>
            <span>Buscar</span>
          </button>

          <button
            onClick={() => setActiveTab('save')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
              activeTab === 'save'
                ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <span className="text-sm">➕</span>
            <span>Guardar</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
              activeTab === 'inventory'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Package className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">Inventario</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
              {items.length}
            </span>
          </button>

          <button
            onClick={onOpenAdvisor}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 text-indigo-700 hover:bg-white/60 transition shrink-0"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span className="hidden md:inline">Asesor DIY</span>
          </button>

          <button
            onClick={onOpenScanner}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 text-slate-700 hover:bg-white/60 transition shrink-0"
          >
            <Camera className="w-4 h-4 text-slate-600" />
            <span className="hidden md:inline">Escáner QR</span>
          </button>
        </nav>

        {/* Right Action: Connectivity pill, Quick Guardar button & Backup Dropdown */}
        <div className="flex items-center gap-2">
          {/* Connection status button */}
          <button
            onClick={onOpenOfflineCache}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition border ${
              effectiveOnline
                ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                : 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-xs animate-pulse font-bold'
            }`}
            title="Ver estado de sincronización y caché IndexedDB"
          >
            {effectiveOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="hidden lg:inline text-[11px]">Caché Activa</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-white" />
                <span className="text-[11px]">Offline</span>
              </>
            )}
          </button>

          <button
            onClick={() => setActiveTab('save')}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition transform hover:-translate-y-0.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo Objeto</span>
          </button>

          {/* Backup & Settings menu */}
          <div className="relative">
            <button
              onClick={() => setShowDataMenu(!showDataMenu)}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
              title="Ajustes y copia de seguridad"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showDataMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => {
                    onOpenOfflineCache();
                    setShowDataMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                >
                  <Database className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Estado de Caché & Offline</span>
                </button>

                <div className="h-px bg-slate-100 my-1"></div>

                <button
                  onClick={handleExport}
                  className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Exportar Copia de Seguridad</span>
                </button>

                <label className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>Importar Archivo JSON</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                </label>

                <div className="h-px bg-slate-100 my-1"></div>

                <button
                  onClick={handleReset}
                  className="w-full px-4 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                  <span>Restablecer Datos Demo</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating success toast */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-xl shadow-xl text-xs font-medium z-50 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}
    </header>
  );
};
