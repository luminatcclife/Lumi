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
  const { isOnboardingOpen, setIsOnboardingOpen } = useMascot();

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
        isOnline={isOnline}
        isSimulatedOffline={isSimulatedOffline}
      />

      {/* Offline Alert Banner */}
      {!effectiveOnline && (
        <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-xs z-30 shadow-xs">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>
              <strong>Modo Sin Conexión (Offline Activo):</strong> Puedes consultar y navegar por tu mapa, habitaciones y lista de objetos sin problemas gracias a la caché persistente IndexedDB.
            </span>
          </div>
          <button
            onClick={() => setIsOfflineModalOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-black/20 hover:bg-black/30 font-semibold text-[11px] transition shrink-0 ml-2"
          >
            Ver Estado de Caché
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
