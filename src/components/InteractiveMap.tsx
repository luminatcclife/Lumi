import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Layers, 
  Box, 
  MapPin, 
  Plus, 
  Compass, 
  Sparkles,
  Info,
  ChevronRight,
  Search,
  X,
  QrCode as QrIcon,
  FolderOpen,
  ArrowLeft,
  Eye,
  SlidersHorizontal,
  Home,
  Tag
} from 'lucide-react';
import { useStorage } from '../context/StorageContext';
import { 
  Furniture, 
  Room, 
  StorageSpace, 
  StorageContainer, 
  StorageItem, 
  AREA_TYPE_CONFIG, 
  FurnitureType,
  SIZE_CONFIG,
  FREQUENCY_CONFIG 
} from '../types/storage';

interface InteractiveMapProps {
  onSelectFurniture: (furnitureId: string) => void;
  onOpenAdvisor: () => void;
  onAddRoom: () => void;
  onAddFurniture: (roomId: string) => void;
  onOpenAddItemWithContainer?: (containerId: string) => void;
  onOpenQrModal?: (title: string, payload: string, categoryOrType?: string) => void;
}

type MapLevelView = 'overview' | 'room' | 'furniture_elevation';

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  onSelectFurniture,
  onOpenAdvisor,
  onAddRoom,
  onAddFurniture,
  onOpenAddItemWithContainer,
  onOpenQrModal,
}) => {
  const { 
    spaces, 
    activeSpaceId, 
    activeRoomId, 
    setActiveRoomId, 
    highlightItemId, 
    items, 
    findItem,
    getBreadcrumbs,
    addContainer
  } = useStorage();

  // Canvas View & Transform state
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [mapPan, setMapPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Map Filter & Search state
  const [mapSearch, setMapSearch] = useState<string>('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [showDensityHeatmap, setShowDensityHeatmap] = useState<boolean>(false);

  // Inspector & Elevation state
  const [inspectedLocation, setInspectedLocation] = useState<{
    type: 'room' | 'furniture' | 'container';
    roomId: string;
    furnitureId?: string;
    containerId?: string;
  } | null>(null);

  const [levelView, setLevelView] = useState<MapLevelView>('overview');
  const [elevationFurnitureId, setElevationFurnitureId] = useState<string | null>(null);

  // Quick inline add container state inside inspector
  const [showAddSublevel, setShowAddSublevel] = useState<boolean>(false);
  const [newSublevelName, setNewSublevelName] = useState<string>('');
  const [newSublevelType, setNewSublevelType] = useState<StorageContainer['type']>('drawer');

  const containerRef = useRef<HTMLDivElement | null>(null);

  const activeSpace: StorageSpace =
    spaces.find((s) => s.id === activeSpaceId) || spaces[0];

  // If an item is highlighted, focus on its room & furniture
  const highlightedItem = highlightItemId ? findItem(highlightItemId) : null;
  const highlightedBreadcrumbs = highlightItemId ? getBreadcrumbs(highlightedItem?.containerId || '') : null;

  useEffect(() => {
    if (highlightedBreadcrumbs) {
      setActiveRoomId(highlightedBreadcrumbs.roomId);
      setInspectedLocation({
        type: 'container',
        roomId: highlightedBreadcrumbs.roomId,
        furnitureId: highlightedBreadcrumbs.furnitureId,
        containerId: highlightedBreadcrumbs.containerId,
      });
    }
  }, [highlightedBreadcrumbs, setActiveRoomId]);

  // Handle Wheel Zooming directly on canvas
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      setZoomLevel((prev) => Math.min(Math.max(0.6, prev * zoomFactor), 2.5));
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.min(Math.max(0.6, prev + delta), 2.5));
  };

  const handleResetView = () => {
    setZoomLevel(1);
    setMapPan({ x: 0, y: 0 });
    setActiveRoomId(null);
    setLevelView('overview');
    setElevationFurnitureId(null);
  };

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target !== containerRef.current && !(e.target as HTMLElement).classList.contains('map-drag-surface')) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - mapPan.x, y: e.clientY - mapPan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setMapPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Helper counts
  const getFurnitureItemCount = (furniture: Furniture) => {
    const containerIds = new Set(furniture.containers.map((c) => c.id));
    return items.filter((itm) => containerIds.has(itm.containerId)).length;
  };

  const getContainerItems = (containerId: string) => {
    return items.filter((itm) => itm.containerId === containerId);
  };

  const getRoomItemCount = (room: Room) => {
    let count = 0;
    room.furniture.forEach((f) => {
      count += getFurnitureItemCount(f);
    });
    return count;
  };

  // Check if a furniture matches the search filter or area type filter
  const matchesFilter = (furn: Furniture) => {
    if (selectedTypeFilter !== 'all' && furn.type !== selectedTypeFilter) {
      return false;
    }
    if (mapSearch.trim()) {
      const q = mapSearch.toLowerCase();
      const nameMatches = furn.name.toLowerCase().includes(q);
      const containerMatches = furn.containers.some((c) => c.name.toLowerCase().includes(q));
      const itemsMatch = items.some(
        (itm) =>
          furn.containers.some((c) => c.id === itm.containerId) &&
          (itm.name.toLowerCase().includes(q) ||
            itm.category.toLowerCase().includes(q) ||
            itm.tags.some((t) => t.toLowerCase().includes(q)))
      );
      return nameMatches || containerMatches || itemsMatch;
    }
    return true;
  };

  // Get active inspected objects
  const activeRoom = activeSpace.rooms.find((r) => r.id === inspectedLocation?.roomId) || null;
  const activeFurn = activeRoom?.furniture.find((f) => f.id === inspectedLocation?.furnitureId) || null;
  const activeCont = activeFurn?.containers.find((c) => c.id === inspectedLocation?.containerId) || null;

  const inspectedItems = useMemo(() => {
    if (activeCont) {
      return items.filter((i) => i.containerId === activeCont.id);
    }
    if (activeFurn) {
      const ids = new Set(activeFurn.containers.map((c) => c.id));
      return items.filter((i) => ids.has(i.containerId));
    }
    if (activeRoom) {
      const ids = new Set(
        activeRoom.furniture.flatMap((f) => f.containers.map((c) => c.id))
      );
      return items.filter((i) => ids.has(i.containerId));
    }
    return [];
  }, [activeRoom, activeFurn, activeCont, items]);

  const handleOpenElevationView = (furnId: string) => {
    setElevationFurnitureId(furnId);
    setLevelView('furniture_elevation');
    const furn = activeSpace.rooms.flatMap((r) => r.furniture).find((f) => f.id === furnId);
    if (furn) {
      setInspectedLocation({
        type: 'furniture',
        roomId: furn.roomId,
        furnitureId: furn.id,
      });
    }
  };

  const handleCreateSublevel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSublevelName.trim() || !activeFurn || !activeRoom) return;

    const created = addContainer(activeRoom.id, activeFurn.id, {
      name: newSublevelName.trim(),
      type: newSublevelType,
      furnitureId: activeFurn.id,
      levelIndex: activeFurn.containers.length + 1,
    });

    setNewSublevelName('');
    setShowAddSublevel(false);
    setInspectedLocation({
      type: 'container',
      roomId: activeRoom.id,
      furnitureId: activeFurn.id,
      containerId: created.id,
    });
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 relative select-none overflow-hidden">
      {/* 1. Map Header & Breadcrumbs Bar */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 z-30 shadow-2xs">
        {/* Breadcrumb level navigation */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={handleResetView}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition font-medium ${
              levelView === 'overview' && !activeRoomId
                ? 'bg-slate-900 text-white font-semibold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Toda la Casa</span>
          </button>

          {activeRoom && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <button
                onClick={() => {
                  setLevelView('room');
                  setElevationFurnitureId(null);
                  setInspectedLocation({ type: 'room', roomId: activeRoom.id });
                }}
                className={`px-2 py-1 rounded-lg transition font-medium flex items-center gap-1.5 ${
                  levelView === 'room' && !elevationFurnitureId
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeRoom.color }}></span>
                <span>{activeRoom.name}</span>
              </button>
            </>
          )}

          {activeFurn && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <button
                onClick={() => handleOpenElevationView(activeFurn.id)}
                className={`px-2 py-1 rounded-lg transition font-medium flex items-center gap-1.5 ${
                  levelView === 'furniture_elevation' && !activeCont
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{AREA_TYPE_CONFIG[activeFurn.type]?.icon || '📦'}</span>
                <span>{activeFurn.name}</span>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-1 rounded">
                  {AREA_TYPE_CONFIG[activeFurn.type]?.label || activeFurn.type}
                </span>
              </button>
            </>
          )}

          {activeCont && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-1 border border-emerald-200">
                <span>{AREA_TYPE_CONFIG[activeCont.type]?.icon || '📥'}</span>
                <span>{activeCont.name}</span>
              </span>
            </>
          )}
        </div>

        {/* Search on Map & Area Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={mapSearch}
              onChange={(e) => setMapSearch(e.target.value)}
              placeholder="Buscar en el mapa..."
              className="pl-8 pr-6 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white w-36 sm:w-48 transition"
            />
            {mapSearch && (
              <button
                onClick={() => setMapSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Area Level Type Filter Dropdown */}
          <div className="flex items-center gap-1">
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-medium focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Todas las estructuras</option>
              <option value="wardrobe">🚪 Armarios</option>
              <option value="shelf">📚 Estanterías</option>
              <option value="drawers">🗄️ Cajoneras</option>
              <option value="desk">🖥️ Escritorios</option>
              <option value="cabinet">🗃️ Aparadores</option>
              <option value="rack">🪜 Estanterías de Carga</option>
              <option value="trunk">🧳 Baúl / Suelo</option>
            </select>
          </div>

          {/* Density Heatmap toggle */}
          <button
            onClick={() => setShowDensityHeatmap(!showDensityHeatmap)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1 border ${
              showDensityHeatmap
                ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title="Mapa de calor de ocupación"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Densidad</span>
          </button>

          {/* Zoom controls */}
          <div className="flex items-center bg-white rounded-xl border border-slate-200 p-0.5 shadow-2xs">
            <button
              onClick={() => handleZoom(0.2)}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              title="Acercar zoom (+ o rueda)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-500 px-1.5">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => handleZoom(-0.2)}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              title="Alejar zoom (- o rueda)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetView}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition border-l border-slate-100 ml-0.5"
              title="Centrar todo el plano"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* New Area / Room */}
          <button
            onClick={onAddRoom}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-medium flex items-center gap-1.5 transition shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Nueva Zona</span>
          </button>
        </div>
      </div>

      {/* Main Map View Area & Slide-Over Inspector */}
      <div className="flex-1 w-full flex overflow-hidden relative">
        {/* Interactive Map Blueprint Canvas */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="flex-1 h-full overflow-hidden relative map-drag-surface cursor-grab active:cursor-grabbing p-6"
          style={{
            backgroundImage: `
              radial-gradient(circle at 1px 1px, #cbd5e1 1.2px, transparent 0)
            `,
            backgroundSize: '24px 24px',
          }}
        >
          {/* Compass & North Indicator */}
          <div className="absolute top-4 right-4 z-10 pointer-events-none opacity-40 flex flex-col items-center">
            <Compass className="w-7 h-7 text-slate-700" />
            <span className="text-[9px] font-bold text-slate-700">NORTE</span>
          </div>

          {/* Scale helper */}
          <div className="absolute bottom-4 left-4 z-10 pointer-events-none bg-white/80 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-200 text-[10px] text-slate-500 flex items-center gap-2">
            <span>Escala: 1m</span>
            <div className="w-12 h-1 bg-slate-700 rounded-full"></div>
            <span>Rueda ratón = Zoom</span>
          </div>

          {/* Canvas Transform Container */}
          <div
            className="w-full h-full transition-transform duration-150 ease-out origin-top-left"
            style={{
              transform: `translate(${mapPan.x}px, ${mapPan.y}px) scale(${zoomLevel})`,
            }}
          >
            {/* VIEW MODE 1 & 2: Architectural Floorplan */}
            {levelView !== 'furniture_elevation' ? (
              <div className="relative w-full max-w-5xl h-[680px] mx-auto bg-white rounded-3xl shadow-xl border-4 border-slate-300/80 p-4 overflow-hidden">
                {activeSpace.rooms.map((room) => {
                  const isRoomFocused = activeRoomId === null || activeRoomId === room.id;
                  const isItemInThisRoom = highlightedBreadcrumbs?.roomId === room.id;
                  const roomItemCount = getRoomItemCount(room);

                  return (
                    <div
                      key={room.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveRoomId(room.id);
                        setLevelView('room');
                        setInspectedLocation({ type: 'room', roomId: room.id });
                      }}
                      className={`absolute rounded-2xl border-2 transition-all duration-300 p-3 flex flex-col justify-between overflow-hidden group cursor-pointer ${
                        isRoomFocused ? 'opacity-100 ring-2 ring-slate-400/20' : 'opacity-30 hover:opacity-70'
                      }`}
                      style={{
                        left: `${room.x}%`,
                        top: `${room.y}%`,
                        width: `${room.width}%`,
                        height: `${room.height}%`,
                        backgroundColor: showDensityHeatmap
                          ? roomItemCount > 8
                            ? 'rgba(239, 68, 68, 0.14)'
                            : roomItemCount > 3
                            ? 'rgba(245, 158, 11, 0.14)'
                            : 'rgba(16, 185, 129, 0.14)'
                          : `${room.color}0d`,
                        borderColor: isItemInThisRoom ? '#6366f1' : `${room.color}70`,
                        boxShadow: isItemInThisRoom
                          ? '0 0 0 3px rgba(99, 102, 241, 0.35)'
                          : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                      }}
                    >
                      {/* Room Header Label */}
                      <div className="flex items-center justify-between z-10">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shadow-2xs"
                            style={{ backgroundColor: room.color }}
                          ></span>
                          <h3 className="font-bold text-slate-800 text-xs sm:text-sm tracking-tight">
                            {room.name}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-slate-600 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                            {roomItemCount} {roomItemCount === 1 ? 'artículo' : 'artículos'}
                          </span>
                          <button
                            title="Añadir estructura o mueble a esta habitación"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddFurniture(room.id);
                            }}
                            className="p-1 rounded-md bg-white hover:bg-slate-100 text-slate-500 hover:text-indigo-600 border border-slate-200 transition opacity-0 group-hover:opacity-100"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Room Interior with Structures / Furniture Pieces */}
                      <div className="relative flex-1 w-full mt-2 rounded-xl border border-dashed border-slate-200 bg-white/50 overflow-hidden">
                        {room.furniture.map((furn) => {
                          const isMatch = matchesFilter(furn);
                          const isTargetFurn = highlightedBreadcrumbs?.furnitureId === furn.id;
                          const furnItemCount = getFurnitureItemCount(furn);
                          const typeMeta = AREA_TYPE_CONFIG[furn.type] || AREA_TYPE_CONFIG.shelf;

                          if (!isMatch && selectedTypeFilter !== 'all') {
                            return null;
                          }

                          return (
                            <div
                              key={furn.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectedLocation({
                                  type: 'furniture',
                                  roomId: room.id,
                                  furnitureId: furn.id,
                                });
                              }}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                handleOpenElevationView(furn.id);
                              }}
                              className={`absolute rounded-xl border transition-all duration-200 p-2.5 flex flex-col justify-between cursor-pointer group/furn ${
                                isTargetFurn
                                  ? 'border-indigo-600 bg-indigo-50/95 shadow-lg ring-2 ring-indigo-500/80 z-20'
                                  : isMatch && mapSearch
                                  ? 'border-amber-500 bg-amber-50/90 shadow-md ring-2 ring-amber-400 z-15'
                                  : inspectedLocation?.furnitureId === furn.id
                                  ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-400'
                                  : 'border-slate-300 bg-white/95 hover:border-indigo-400 hover:bg-indigo-50/30 hover:shadow-md'
                              }`}
                              style={{
                                left: `${furn.x}%`,
                                top: `${furn.y}%`,
                                width: `${furn.width}%`,
                                height: `${furn.height}%`,
                              }}
                            >
                              {/* Pulsing Beacon if target item is located here */}
                              {isTargetFurn && (
                                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                  <span className="absolute w-full h-full rounded-xl bg-indigo-500/30 animate-beacon"></span>
                                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-indigo-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full shadow-md whitespace-nowrap z-30 flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-amber-300" />
                                    <span>¡Aquí guardado!</span>
                                  </div>
                                </div>
                              )}

                              {/* Top Bar with Icon, Name & Type Badge */}
                              <div className="flex items-start justify-between gap-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-sm shrink-0">{typeMeta.icon}</span>
                                  <span className="font-bold text-slate-900 text-xs leading-tight line-clamp-1">
                                    {furn.name}
                                  </span>
                                </div>
                                <span className="text-[10px] bg-slate-100 group-hover/furn:bg-indigo-100 text-slate-700 group-hover/furn:text-indigo-800 px-1.5 py-0.2 rounded font-mono font-bold shrink-0">
                                  {furnItemCount}
                                </span>
                              </div>

                              {/* Visual Sub-levels (Baldas, Cajones, Cajas) representation */}
                              <div className="space-y-1 my-1">
                                {furn.containers.slice(0, 3).map((cont) => {
                                  const contItems = getContainerItems(cont.id);
                                  const isTargetCont = highlightedBreadcrumbs?.containerId === cont.id;
                                  return (
                                    <div
                                      key={cont.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setInspectedLocation({
                                          type: 'container',
                                          roomId: room.id,
                                          furnitureId: furn.id,
                                          containerId: cont.id,
                                        });
                                      }}
                                      className={`h-4 rounded px-1.5 flex items-center justify-between text-[9px] transition cursor-pointer ${
                                        isTargetCont
                                          ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                                          : inspectedLocation?.containerId === cont.id
                                          ? 'bg-indigo-100 text-indigo-800 font-semibold'
                                          : 'bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700'
                                      }`}
                                      title={`Nivel: ${cont.name} (${contItems.length} artículos)`}
                                    >
                                      <span className="truncate max-w-[85px]">{cont.name}</span>
                                      <span className="font-mono text-[8px] opacity-80">{contItems.length}</span>
                                    </div>
                                  );
                                })}
                                {furn.containers.length > 3 && (
                                  <div className="text-[9px] text-slate-400 font-mono text-center">
                                    +{furn.containers.length - 3} niveles más
                                  </div>
                                )}
                              </div>

                              {/* Bottom action row */}
                              <div className="text-[9px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
                                <span className="text-slate-500 font-medium">
                                  {typeMeta.label}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenElevationView(furn.id);
                                  }}
                                  className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-0.5 hover:underline"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Ver Alzado</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {room.furniture.length === 0 && (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs p-3 text-center">
                            <Box className="w-6 h-6 mb-1 opacity-40" />
                            <span>Sin áreas de almacenaje aún</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddFurniture(room.id);
                              }}
                              className="mt-1.5 text-indigo-600 hover:underline font-semibold text-[11px]"
                            >
                              + Añadir armario, estantería o cajón
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* VIEW MODE 3: ARCHITECTURAL ELEVATION SECTION (ALZADO DEL MUEBLE) */
              (() => {
                const elevFurn = activeSpace.rooms
                  .flatMap((r) => r.furniture)
                  .find((f) => f.id === elevationFurnitureId);
                if (!elevFurn) return null;

                const elevRoom = activeSpace.rooms.find((r) => r.id === elevFurn.roomId);
                const typeMeta = AREA_TYPE_CONFIG[elevFurn.type] || AREA_TYPE_CONFIG.shelf;

                return (
                  <div className="relative w-full max-w-4xl min-h-[580px] mx-auto bg-white rounded-3xl shadow-xl border-4 border-indigo-200 p-6 flex flex-col justify-between">
                    {/* Elevation Header */}
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setLevelView('overview')}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          title="Volver al plano de planta"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                              Alzado de Estructura • {elevRoom?.name}
                            </span>
                          </div>
                          <h2 className="font-bold text-slate-900 text-xl flex items-center gap-2 mt-0.5">
                            <span>{typeMeta.icon}</span>
                            <span>{elevFurn.name}</span>
                            <span className="text-xs font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                              {typeMeta.label}
                            </span>
                          </h2>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onSelectFurniture(elevFurn.id)}
                          className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 transition"
                        >
                          Inspección Clásica
                        </button>
                        <button
                          onClick={() => setLevelView('overview')}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-medium transition"
                        >
                          Volver al Plano
                        </button>
                      </div>
                    </div>

                    {/* Visual Physical Levels (Baldas, Cajones, Cajas apiladas) */}
                    <div className="my-6 p-6 bg-slate-100/70 rounded-2xl border-4 border-slate-300 flex-1 flex flex-col justify-between relative shadow-inner">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
                        <span>Niveles de almacenaje verticales ({elevFurn.containers.length})</span>
                        <span className="text-[10px] text-slate-400">
                          Haz clic en cualquier cajón o balda para ver sus objetos
                        </span>
                      </div>

                      <div className="space-y-3 flex-1 flex flex-col justify-around">
                        {elevFurn.containers.map((cont, idx) => {
                          const contItems = getContainerItems(cont.id);
                          const isSelected = activeCont?.id === cont.id;
                          const contTypeMeta = AREA_TYPE_CONFIG[cont.type] || AREA_TYPE_CONFIG.drawer;

                          return (
                            <div
                              key={cont.id}
                              onClick={() => {
                                setInspectedLocation({
                                  type: 'container',
                                  roomId: elevFurn.roomId,
                                  furnitureId: elevFurn.id,
                                  containerId: cont.id,
                                });
                              }}
                              className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                isSelected
                                  ? 'border-indigo-600 bg-white shadow-md ring-2 ring-indigo-500'
                                  : 'border-slate-300 bg-white/90 hover:border-indigo-400 hover:bg-white'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-700 shrink-0">
                                  {contTypeMeta.icon}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900 text-sm">{cont.name}</span>
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${contTypeMeta.badgeColor}`}>
                                      {contTypeMeta.label}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {contItems.length === 0
                                      ? 'Nivel vacío disponible'
                                      : `${contItems.length} artículos: ${contItems.map((i) => i.name).slice(0, 3).join(', ')}${
                                          contItems.length > 3 ? '...' : ''
                                        }`}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded-md">
                                  {contItems.length} {contItems.length === 1 ? 'artículo' : 'artículos'}
                                </span>
                                {onOpenAddItemWithContainer && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onOpenAddItemWithContainer(cont.id);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition"
                                  >
                                    + Guardar aquí
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Quick Add Sub-Level Form inside Elevation view */}
                      <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center">
                        <span className="text-xs text-slate-500">
                          Puedes definir baldas, cajones o cajas adicionales en esta estructura.
                        </span>
                        <button
                          onClick={() => {
                            setInspectedLocation({
                              type: 'furniture',
                              roomId: elevFurn.roomId,
                              furnitureId: elevFurn.id,
                            });
                            setShowAddSublevel(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center gap-1.5 transition shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Añadir Nivel (Cajón / Balda)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>

        {/* 2. Slide-Over Inspector Drawer for Selected Location */}
        {inspectedLocation && (
          <aside className="w-80 sm:w-96 bg-white border-l border-slate-200 shadow-2xl flex flex-col z-40 animate-in slide-in-from-right duration-200">
            {/* Inspector Top Bar */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  {activeCont
                    ? AREA_TYPE_CONFIG[activeCont.type]?.icon || '📥'
                    : activeFurn
                    ? AREA_TYPE_CONFIG[activeFurn.type]?.icon || '📦'
                    : '🏠'}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                    {activeCont
                      ? `Nivel: ${AREA_TYPE_CONFIG[activeCont.type]?.label}`
                      : activeFurn
                      ? `Mueble: ${AREA_TYPE_CONFIG[activeFurn.type]?.label}`
                      : 'Habitación / Zona'}
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm truncate">
                    {activeCont ? activeCont.name : activeFurn ? activeFurn.name : activeRoom?.name}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setInspectedLocation(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inspector Body */}
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {/* Location breadcrumb path */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] text-slate-600">
                <span className="font-semibold text-slate-700">{activeRoom?.name}</span>
                {activeFurn && (
                  <>
                    <span className="mx-1 text-slate-400">➔</span>
                    <span>{activeFurn.name}</span>
                  </>
                )}
                {activeCont && (
                  <>
                    <span className="mx-1 text-slate-400">➔</span>
                    <span className="font-bold text-indigo-600">{activeCont.name}</span>
                  </>
                )}
              </div>

              {/* Quick Action: Add item here or print QR */}
              <div className="flex items-center gap-2">
                {onOpenAddItemWithContainer && (
                  <button
                    onClick={() => {
                      const contId = activeCont?.id || activeFurn?.containers[0]?.id;
                      if (contId) onOpenAddItemWithContainer(contId);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Guardar Artículo Aquí</span>
                  </button>
                )}

                {onOpenQrModal && (activeCont || activeFurn) && (
                  <button
                    onClick={() => {
                      const title = activeCont ? activeCont.name : activeFurn!.name;
                      const payload = activeCont ? activeCont.qrCode : activeFurn!.containers[0]?.qrCode || '';
                      onOpenQrModal(title, payload, activeCont ? 'Contenedor' : 'Mueble');
                    }}
                    className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                    title="Imprimir código QR de este nivel"
                  >
                    <QrIcon className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Sub-Levels Selector (if inspecting furniture) */}
              {activeFurn && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Niveles o Compartimentos ({activeFurn.containers.length})
                    </span>
                    <button
                      onClick={() => setShowAddSublevel(!showAddSublevel)}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Añadir</span>
                    </button>
                  </div>

                  {/* Add sublevel form */}
                  {showAddSublevel && (
                    <form
                      onSubmit={handleCreateSublevel}
                      className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-200 mb-2 space-y-2 animate-in fade-in zoom-in-95 duration-150"
                    >
                      <input
                        type="text"
                        required
                        placeholder="Ej: Balda 3, Cajón Inferior, Caja #2..."
                        value={newSublevelName}
                        onChange={(e) => setNewSublevelName(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                      />
                      <div className="flex gap-1.5">
                        <select
                          value={newSublevelType}
                          onChange={(e) => setNewSublevelType(e.target.value as StorageContainer['type'])}
                          className="flex-1 text-xs px-2 py-1 rounded-lg border border-slate-300 bg-white"
                        >
                          <option value="drawer">Cajón</option>
                          <option value="shelf_level">Balda / Estante</option>
                          <option value="box">Caja de almacenaje</option>
                          <option value="bin">Organizador / Bote</option>
                          <option value="organizer_tray">Bandeja</option>
                          <option value="hanger_bar">Barra de perchas</option>
                        </select>
                        <button
                          type="submit"
                          className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
                        >
                          Guardar
                        </button>
                      </div>
                    </form>
                  )}

                  {/* List of sub-levels */}
                  <div className="space-y-1">
                    {activeFurn.containers.map((c) => {
                      const isSelected = activeCont?.id === c.id;
                      const cCount = getContainerItems(c.id).length;
                      const cMeta = AREA_TYPE_CONFIG[c.type] || AREA_TYPE_CONFIG.drawer;

                      return (
                        <div
                          key={c.id}
                          onClick={() => {
                            setInspectedLocation({
                              type: 'container',
                              roomId: activeRoom!.id,
                              furnitureId: activeFurn.id,
                              containerId: c.id,
                            });
                          }}
                          className={`p-2 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/70 font-bold text-indigo-900 shadow-2xs'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span>{cMeta.icon}</span>
                            <span className="truncate">{c.name}</span>
                          </div>
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shrink-0">
                            {cCount}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Items Stored inside this inspected spot */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
                  <span>Artículos en esta Ubicación</span>
                  <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full text-[10px]">
                    {inspectedItems.length}
                  </span>
                </h4>

                {inspectedItems.length === 0 ? (
                  <div className="p-5 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                    No hay ningún artículo guardado aquí.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {inspectedItems.map((item) => {
                      const sz = SIZE_CONFIG[item.size];
                      const fq = FREQUENCY_CONFIG[item.frequency];

                      return (
                        <div
                          key={item.id}
                          className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs hover:border-indigo-300 transition shadow-2xs flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xl p-1 bg-slate-50 rounded-lg shrink-0">
                              {item.photoEmoji || '📦'}
                            </span>
                            <div className="min-w-0 truncate">
                              <p className="font-bold text-slate-900 truncate">{item.name}</p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className={`text-[9px] font-bold px-1 rounded border ${sz.color}`}>
                                  {sz.badge}
                                </span>
                                <span className={`text-[9px] font-semibold px-1 rounded border ${fq.color}`}>
                                  {fq.short}
                                </span>
                                {item.quantity > 1 && (
                                  <span className="text-[9px] text-slate-400 font-mono">
                                    x{item.quantity}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {onOpenQrModal && (
                            <button
                              onClick={() => onOpenQrModal(item.name, item.qrCode, item.category)}
                              className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition shrink-0"
                              title="Ver código QR de este artículo"
                            >
                              <QrIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Inspector Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>{inspectedItems.length} objetos en total</span>
              {activeFurn && levelView !== 'furniture_elevation' && (
                <button
                  onClick={() => handleOpenElevationView(activeFurn.id)}
                  className="text-indigo-600 font-bold hover:underline flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver en Alzado</span>
                </button>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
