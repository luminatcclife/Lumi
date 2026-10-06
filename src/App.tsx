import React, { useState } from 'react';
import { StorageProvider, useStorage } from './context/StorageContext';
import { MascotProvider, useMascot } from './context/MascotContext';
import { Navbar } from './components/Navbar';
import { InteractiveMap } from './components/InteractiveMap';
import { ItemsList } from './components/ItemsList';
import { AIAdvisorModal } from './components/AIAdvisorModal';
import { QRScannerModal } from './components/QRScannerModal';
import { QRPrintModal } from './components/QRPrintModal';
import { StorageExplorerModal } from './components/StorageExplorerModal';
import { ItemFormModal } from './components/ItemFormModal';
import { ContainerFormModal } from './components/ContainerFormModal';
import { SearchCenter } from './components/SearchCenter';
import { SaveCenter } from './components/SaveCenter';
import { OfflineCacheModal } from './components/OfflineCacheModal';
import { FloatingMascotCompanion } from './components/mascot/FloatingMascotCompanion';
import { MascotOnboardingModal } from './components/mascot/MascotOnboardingModal';
import { LumiCharacter } from './components/mascot/LumiCharacter';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { StorageItem, ItemSize, UsageFrequency } from './types/storage';
import { WifiOff, Database } from 'lucide-react';

function AppContent() {
  const { 
    activeTab, 
    setActiveTab, 
    selectedFurnitureId, 
    setSelectedFurnitureId,
    locateItemOnMap 
  } = useStorage();

  const { isOnline, isSimulatedOffline, effectiveOnline, toggleSimulatedOffline } = useNetworkStatus();
  const { isOnboardingOpen, setIsOnboardingOpen, setExpression, expression } = useMascot();

  // Keep mascot expression synchronized with offline status
  React.useEffect(() => {
    if (!effectiveOnline) {
      setExpression('offline');
    } else if (expression === 'offline') {
      setExpression('idle');
    }
  }, [effectiveOnline]);

  // Modals state
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StorageItem | null>(null);
  const [prefillContainerId, setPrefillContainerId] = useState<string | undefined>(undefined);
  const [prefillAdvisorData, setPrefillAdvisorData] = useState<{
    name: string;
    size: ItemSize;
    frequency: UsageFrequency;
    category: string;
    notes?: string;
  } | undefined>(undefined);

  // Container or Room Form Modal
  const [containerModalType, setContainerModalType] = useState<'room' | 'furniture' | null>(null);
  const [containerModalRoomId, setContainerModalRoomId] = useState<string | undefined>(undefined);

  // QR Print Modal State
  const [qrModalData, setQrModalData] = useState<{
    isOpen: boolean;
    title: string;
    payload: string;
    categoryOrType?: string;
  }>({
    isOpen: false,
    title: '',
    payload: '',
  });

  const handleOpenQrModal = (title: string, payload: string, categoryOrType?: string) => {
    setQrModalData({
      isOpen: true,
      title,
      payload,
      categoryOrType,
    });
  };

  const handleOpenAddItem = (initialContainerId?: string) => {
    setEditingItem(null);
    setPrefillAdvisorData(undefined);
    setPrefillContainerId(initialContainerId);
    setIsItemFormOpen(true);
  };

  const handleEditItem = (item: StorageItem) => {
    setEditingItem(item);
    setPrefillAdvisorData(undefined);
    setPrefillContainerId(undefined);
    setIsItemFormOpen(true);
  };

  // Called from AI Advisor when user chooses a recommended container
  const handleAdvisorSelectContainer = (
    containerId: string,
    initialData?: {
      name: string;
      size: ItemSize;
      frequency: UsageFrequency;
      category: string;
      notes?: string;
    }
  ) => {
    setEditingItem(null);
    setPrefillContainerId(containerId);
    setPrefillAdvisorData(initialData);
    setIsItemFormOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Top Navbar with Offline indicator */}
      <Navbar
        onOpenAddItem={() => handleOpenAddItem()}
        onOpenAdvisor={() => setIsAdvisorOpen(true)}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenOfflineCache={() => setIsOfflineModalOpen(true)}
        onOpenQrPrintStudio={() => handleOpenQrModal('Plantilla de Etiquetas para Cajas', 'UBICAYA:PRINT:STUDIO', 'Caja de Almacenaje')}
        isOnline={isOnline}
        isSimulatedOffline={isSimulatedOffline}
      />

      {/* Offline Alert Banner with Miner Mascot */}
      {!effectiveOnline && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-white px-4 py-2.5 flex items-center justify-between text-xs z-30 shadow-sm border-b border-amber-600">
          <div className="flex items-center gap-3">
            <LumiCharacter expression="offline" size="sm" isFloating />
            <div>
              <p className="font-extrabold text-xs tracking-tight">
                ¡Sin internet no nos paramos! Guardando tus cosas en nuestro búnker local.
              </p>
              <p className="text-[11px] text-amber-100 opacity-90">
                La base de datos local IndexedDB y el Service Worker mantienen tu inventario 100% operativo.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOfflineModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-black/25 hover:bg-black/35 font-bold text-xs transition shrink-0 ml-2 border border-white/20"
          >
            Estado del Búnker
          </button>
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'map' ? (
          <InteractiveMap
            onSelectFurniture={(furnId) => setSelectedFurnitureId(furnId)}
            onOpenAdvisor={() => setIsAdvisorOpen(true)}
            onAddRoom={() => setContainerModalType('room')}
            onAddFurniture={(roomId) => {
              setContainerModalRoomId(roomId);
              setContainerModalType('furniture');
            }}
            onOpenAddItemWithContainer={(contId) => handleOpenAddItem(contId)}
            onOpenQrModal={handleOpenQrModal}
          />
        ) : activeTab === 'search' ? (
          <SearchCenter
            onOpenQrModal={handleOpenQrModal}
            onEditItem={handleEditItem}
            onOpenScanner={() => setIsScannerOpen(true)}
          />
        ) : activeTab === 'save' ? (
          <SaveCenter
            onOpenAdvisor={() => setIsAdvisorOpen(true)}
          />
        ) : (
          <ItemsList
            onOpenAddItem={handleOpenAddItem}
            onEditItem={handleEditItem}
            onOpenQrModal={handleOpenQrModal}
            onOpenAdvisor={() => setIsAdvisorOpen(true)}
          />
        )}
      </main>

      {/* Modals */}
      <AIAdvisorModal
        isOpen={isAdvisorOpen}
        onClose={() => setIsAdvisorOpen(false)}
        onSelectContainerForNewItem={handleAdvisorSelectContainer}
      />

      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onQuickAddItemToContainer={(contId) => {
          handleOpenAddItem(contId);
        }}
      />

      <StorageExplorerModal
        furnitureId={selectedFurnitureId}
        onClose={() => setSelectedFurnitureId(null)}
        onOpenQr={handleOpenQrModal}
        onAddNewItemInContainer={(contId) => handleOpenAddItem(contId)}
        onLocateItem={(itemId) => {
          locateItemOnMap(itemId);
          setSelectedFurnitureId(null);
        }}
      />

      <ItemFormModal
        isOpen={isItemFormOpen}
        onClose={() => {
          setIsItemFormOpen(false);
          setEditingItem(null);
          setPrefillAdvisorData(undefined);
          setPrefillContainerId(undefined);
        }}
        editingItem={editingItem}
        initialContainerId={prefillContainerId}
        initialPrefillData={prefillAdvisorData}
        onOpenAdvisor={() => {
          setIsItemFormOpen(false);
          setIsAdvisorOpen(true);
        }}
      />

      <ContainerFormModal
        isOpen={containerModalType !== null}
        onClose={() => setContainerModalType(null)}
        type={containerModalType || 'room'}
        initialRoomId={containerModalRoomId}
      />

      <QRPrintModal
        isOpen={qrModalData.isOpen}
        onClose={() => setQrModalData((prev) => ({ ...prev, isOpen: false }))}
        title={qrModalData.title}
        qrPayload={qrModalData.payload}
        categoryOrType={qrModalData.categoryOrType}
      />

      <OfflineCacheModal
        isOpen={isOfflineModalOpen}
        onClose={() => setIsOfflineModalOpen(false)}
        isOnline={isOnline}
        isSimulatedOffline={isSimulatedOffline}
        onToggleSimulatedOffline={toggleSimulatedOffline}
      />

      {/* Floating Mascot Widget */}
      <FloatingMascotCompanion />

      {/* Mascot Initial Onboarding & Story Tour */}
      <MascotOnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onGoToMap={() => setActiveTab('map')}
        onGoToSave={() => setActiveTab('save')}
      />
    </div>
  );
}

export default function App() {
  return (
    <StorageProvider>
      <MascotProvider>
        <AppContent />
      </MascotProvider>
    </StorageProvider>
  );
}
