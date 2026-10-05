import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { 
  StorageSpace, 
  StorageItem, 
  StorageContainer, 
  Furniture, 
  Room, 
  LocationBreadcrumbs 
} from '../types/storage';
import { INITIAL_STORAGE_SPACES, INITIAL_ITEMS } from '../data/initialData';
import { makeContainerQrPayload, makeItemQrPayload } from '../utils/qrUtils';
import { offlineCacheService } from '../services/offlineCache';

export type ActiveTab = 'map' | 'search' | 'save' | 'inventory' | 'advisor' | 'scanner';

interface StorageContextType {
  spaces: StorageSpace[];
  items: StorageItem[];
  activeSpaceId: string;
  activeRoomId: string | null;
  selectedFurnitureId: string | null;
  selectedContainerId: string | null;
  highlightItemId: string | null;
  activeTab: ActiveTab;
  
  setActiveTab: (tab: ActiveTab) => void;
  setActiveSpaceId: (id: string) => void;
  setActiveRoomId: (id: string | null) => void;
  setSelectedFurnitureId: (id: string | null) => void;
  setSelectedContainerId: (id: string | null) => void;
  setHighlightItemId: (id: string | null) => void;
  
  locateItemOnMap: (itemId: string) => void;
  getBreadcrumbs: (containerId: string) => LocationBreadcrumbs | null;
  getItemBreadcrumbs: (itemId: string) => LocationBreadcrumbs | null;
  findContainer: (containerId: string) => { container: StorageContainer; furniture: Furniture; room: Room } | null;
  findFurniture: (furnitureId: string) => { furniture: Furniture; room: Room } | null;
  findItem: (itemId: string) => StorageItem | undefined;
  
  addItem: (item: Omit<StorageItem, 'id' | 'createdAt' | 'updatedAt' | 'qrCode'>) => StorageItem;
  updateItem: (item: StorageItem) => void;
  deleteItem: (itemId: string) => void;
  moveItem: (itemId: string, newContainerId: string) => void;
  
  addContainer: (roomId: string, furnitureId: string, container: Omit<StorageContainer, 'id' | 'qrCode'>) => StorageContainer;
  updateContainer: (containerId: string, updates: Partial<StorageContainer>) => void;
  deleteContainer: (containerId: string) => void;
  
  addFurniture: (roomId: string, furniture: Omit<Furniture, 'id' | 'containers'>) => Furniture;
  addRoom: (spaceId: string, room: Omit<Room, 'id' | 'spaceId' | 'furniture'>) => Room;
  
  allContainersWithLocation: Array<{
    id: string;
    name: string;
    roomName: string;
    furnitureName: string;
    type: string;
    currentItemsCount: number;
  }>;

  resetToDefaults: () => void;
  exportDataJson: () => string;
  importDataJson: (jsonStr: string) => boolean;
}

const STORAGE_KEY_SPACES = 'ubicaya_spaces_v2';
const STORAGE_KEY_ITEMS = 'ubicaya_items_v2';

const StorageContext = createContext<StorageContextType | undefined>(undefined);

export const StorageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [spaces, setSpaces] = useState<StorageSpace[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SPACES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading spaces from localStorage', e);
    }
    return INITIAL_STORAGE_SPACES;
  });

  const [items, setItems] = useState<StorageItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ITEMS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading items from localStorage', e);
    }
    return INITIAL_ITEMS;
  });

  const [activeSpaceId, setActiveSpaceId] = useState<string>('space_home');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null);
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [highlightItemId, setHighlightItemId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('map');

  // Dual Sync to IndexedDB and LocalStorage whenever data changes
  useEffect(() => {
    offlineCacheService.syncToCache(spaces, items);
  }, [spaces, items]);

  // Initial load check from IndexedDB on startup
  useEffect(() => {
    offlineCacheService.loadFromCache().then(({ spaces: cachedSpaces, items: cachedItems }) => {
      if (cachedSpaces && cachedItems && cachedSpaces.length > 0) {
        setSpaces(cachedSpaces);
        setItems(cachedItems);
      }
    });
  }, []);

  // Clear highlight after 7 seconds
  useEffect(() => {
    if (highlightItemId) {
      const timer = setTimeout(() => {
        setHighlightItemId(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [highlightItemId]);

  const findContainer = (containerId: string) => {
    for (const space of spaces) {
      for (const room of space.rooms) {
        for (const furn of room.furniture) {
          const container = furn.containers.find((c) => c.id === containerId);
          if (container) {
            return { container, furniture: furn, room };
          }
        }
      }
    }
    return null;
  };

  const findFurniture = (furnitureId: string) => {
    for (const space of spaces) {
      for (const room of space.rooms) {
        const furn = room.furniture.find((f) => f.id === furnitureId);
        if (furn) {
          return { furniture: furn, room };
        }
      }
    }
    return null;
  };

  const findItem = (itemId: string) => {
    return items.find((itm) => itm.id === itemId);
  };

  const getBreadcrumbs = (containerId: string): LocationBreadcrumbs | null => {
    for (const space of spaces) {
      for (const room of space.rooms) {
        for (const furn of room.furniture) {
          const container = furn.containers.find((c) => c.id === containerId);
          if (container) {
            return {
              spaceName: space.name,
              roomName: room.name,
              furnitureName: furn.name,
              containerName: container.name,
              roomId: room.id,
              furnitureId: furn.id,
              containerId: container.id,
            };
          }
        }
      }
    }
    return null;
  };

  const getItemBreadcrumbs = (itemId: string): LocationBreadcrumbs | null => {
    const item = findItem(itemId);
    if (!item) return null;
    return getBreadcrumbs(item.containerId);
  };

  const locateItemOnMap = (itemId: string) => {
    const item = findItem(itemId);
    if (!item) return;
    const loc = getBreadcrumbs(item.containerId);
    if (!loc) return;

    setActiveTab('map');
    setActiveRoomId(loc.roomId);
    setSelectedFurnitureId(loc.furnitureId);
    setSelectedContainerId(loc.containerId);
    setHighlightItemId(itemId);
  };

  const addItem = (itemData: Omit<StorageItem, 'id' | 'createdAt' | 'updatedAt' | 'qrCode'>): StorageItem => {
    const id = `itm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const newItem: StorageItem = {
      ...itemData,
      id,
      qrCode: makeItemQrPayload(id),
      createdAt: now,
      updatedAt: now,
    };
    setItems((prev) => [newItem, ...prev]);
    return newItem;
  };

  const updateItem = (updated: StorageItem) => {
    const now = new Date().toISOString();
    setItems((prev) =>
      prev.map((itm) => (itm.id === updated.id ? { ...updated, updatedAt: now } : itm))
    );
  };

  const deleteItem = (itemId: string) => {
    setItems((prev) => prev.filter((itm) => itm.id !== itemId));
    if (highlightItemId === itemId) setHighlightItemId(null);
  };

  const moveItem = (itemId: string, newContainerId: string) => {
    const now = new Date().toISOString();
    setItems((prev) =>
      prev.map((itm) =>
        itm.id === itemId ? { ...itm, containerId: newContainerId, updatedAt: now } : itm
      )
    );
  };

  const addContainer = (
    roomId: string, 
    furnitureId: string, 
    contData: Omit<StorageContainer, 'id' | 'qrCode'>
  ): StorageContainer => {
    const id = `cont_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newContainer: StorageContainer = {
      ...contData,
      id,
      furnitureId,
      qrCode: makeContainerQrPayload(id),
    };

    setSpaces((prev) =>
      prev.map((space) => ({
        ...space,
        rooms: space.rooms.map((room) => {
          if (room.id !== roomId) return room;
          return {
            ...room,
            furniture: room.furniture.map((furn) => {
              if (furn.id !== furnitureId) return furn;
              return {
                ...furn,
                containers: [...furn.containers, newContainer],
              };
            }),
          };
        }),
      }))
    );

    return newContainer;
  };

  const updateContainer = (containerId: string, updates: Partial<StorageContainer>) => {
    setSpaces((prev) =>
      prev.map((space) => ({
        ...space,
        rooms: space.rooms.map((room) => ({
          ...room,
          furniture: room.furniture.map((furn) => ({
            ...furn,
            containers: furn.containers.map((c) =>
              c.id === containerId ? { ...c, ...updates } : c
            ),
          })),
        })),
      }))
    );
  };

  const deleteContainer = (containerId: string) => {
    // Also handle items inside: delete or orphan
    setItems((prev) => prev.filter((itm) => itm.containerId !== containerId));
    setSpaces((prev) =>
      prev.map((space) => ({
        ...space,
        rooms: space.rooms.map((room) => ({
          ...room,
          furniture: room.furniture.map((furn) => ({
            ...furn,
            containers: furn.containers.filter((c) => c.id !== containerId),
          })),
        })),
      }))
    );
    if (selectedContainerId === containerId) setSelectedContainerId(null);
  };

  const addFurniture = (
    roomId: string,
    furnitureData: Omit<Furniture, 'id' | 'containers'>
  ): Furniture => {
    const id = `furn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const defaultContainerId = `cont_${id}_1`;
    const defaultContainer: StorageContainer = {
      id: defaultContainerId,
      furnitureId: id,
      name: 'Espacio Principal / Balda 1',
      type: 'shelf_level',
      qrCode: makeContainerQrPayload(defaultContainerId),
      levelIndex: 1,
    };

    const newFurniture: Furniture = {
      ...furnitureData,
      id,
      roomId,
      containers: [defaultContainer],
    };

    setSpaces((prev) =>
      prev.map((space) => ({
        ...space,
        rooms: space.rooms.map((room) => {
          if (room.id !== roomId) return room;
          return {
            ...room,
            furniture: [...room.furniture, newFurniture],
          };
        }),
      }))
    );

    return newFurniture;
  };

  const addRoom = (spaceId: string, roomData: Omit<Room, 'id' | 'spaceId' | 'furniture'>): Room => {
    const id = `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newRoom: Room = {
      ...roomData,
      id,
      spaceId,
      furniture: [],
    };

    setSpaces((prev) =>
      prev.map((space) => {
        if (space.id !== spaceId) return space;
        return {
          ...space,
          rooms: [...space.rooms, newRoom],
        };
      })
    );

    return newRoom;
  };

  const allContainersWithLocation = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      roomName: string;
      furnitureName: string;
      type: string;
      currentItemsCount: number;
    }> = [];

    spaces.forEach((space) => {
      space.rooms.forEach((room) => {
        room.furniture.forEach((furn) => {
          furn.containers.forEach((cont) => {
            const count = items.filter((itm) => itm.containerId === cont.id).length;
            list.push({
              id: cont.id,
              name: cont.name,
              roomName: room.name,
              furnitureName: furn.name,
              type: cont.type,
              currentItemsCount: count,
            });
          });
        });
      });
    });

    return list;
  }, [spaces, items]);

  const resetToDefaults = () => {
    setSpaces(INITIAL_STORAGE_SPACES);
    setItems(INITIAL_ITEMS);
    localStorage.removeItem(STORAGE_KEY_SPACES);
    localStorage.removeItem(STORAGE_KEY_ITEMS);
    setActiveRoomId(null);
    setSelectedFurnitureId(null);
    setSelectedContainerId(null);
  };

  const exportDataJson = () => {
    return JSON.stringify({ spaces, items, exportedAt: new Date().toISOString() }, null, 2);
  };

  const importDataJson = (jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed.spaces) && Array.isArray(parsed.items)) {
        setSpaces(parsed.spaces);
        setItems(parsed.items);
        return true;
      }
    } catch (e) {
      console.error('Import failed', e);
    }
    return false;
  };

  return (
    <StorageContext.Provider
      value={{
        spaces,
        items,
        activeSpaceId,
        activeRoomId,
        selectedFurnitureId,
        selectedContainerId,
        highlightItemId,
        activeTab,
        setActiveTab,
        setActiveSpaceId,
        setActiveRoomId,
        setSelectedFurnitureId,
        setSelectedContainerId,
        setHighlightItemId,
        locateItemOnMap,
        getBreadcrumbs,
        getItemBreadcrumbs,
        findContainer,
        findFurniture,
        findItem,
        addItem,
        updateItem,
        deleteItem,
        moveItem,
        addContainer,
        updateContainer,
        deleteContainer,
        addFurniture,
        addRoom,
        allContainersWithLocation,
        resetToDefaults,
        exportDataJson,
        importDataJson,
      }}
    >
      {children}
    </StorageContext.Provider>
  );
};

export const useStorage = () => {
  const context = useContext(StorageContext);
  if (!context) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
};
