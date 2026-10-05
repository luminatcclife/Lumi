import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  MapPin, 
  QrCode as QrIcon, 
  Plus, 
  Edit3, 
  Trash2, 
  LayoutGrid, 
  List, 
  Tag, 
  ArrowUpDown,
  Sparkles,
  PackageOpen,
  ChevronRight,
  ExternalLink,
  Layers
} from 'lucide-react';
import { useStorage } from '../context/StorageContext';
import { 
  StorageItem, 
  ItemSize, 
  UsageFrequency, 
  CATEGORIES, 
  SIZE_CONFIG, 
  FREQUENCY_CONFIG 
} from '../types/storage';

interface ItemsListProps {
  onOpenAddItem: (initialContainerId?: string) => void;
  onEditItem: (item: StorageItem) => void;
  onOpenQrModal: (title: string, payload: string, category?: string) => void;
  onOpenAdvisor: () => void;
  initialSearchQuery?: string;
}

export const ItemsList: React.FC<ItemsListProps> = ({
  onOpenAddItem,
  onEditItem,
  onOpenQrModal,
  onOpenAdvisor,
  initialSearchQuery = '',
}) => {
  const { items, deleteItem, locateItemOnMap, getBreadcrumbs, spaces } = useStorage();

  const [search, setSearch] = useState(initialSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSize, setSelectedSize] = useState<string>('all');
  const [selectedFrequency, setSelectedFrequency] = useState<string>('all');
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'frequency' | 'recent'>('recent');

  // Extract all rooms for the room filter
  const allRooms = useMemo(() => {
    const rooms: { id: string; name: string }[] = [];
    spaces.forEach((s) => {
      s.rooms.forEach((r) => {
        rooms.push({ id: r.id, name: r.name });
      });
    });
    return rooms;
  }, [spaces]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const breadcrumb = getBreadcrumbs(item.containerId);

      // Search text match
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesCat = item.category.toLowerCase().includes(query);
        const matchesTags = item.tags.some((t) => t.toLowerCase().includes(query));
        const matchesNotes = item.notes?.toLowerCase().includes(query) || false;
        const matchesLocation =
          breadcrumb &&
          (breadcrumb.roomName.toLowerCase().includes(query) ||
            breadcrumb.furnitureName.toLowerCase().includes(query) ||
            breadcrumb.containerName.toLowerCase().includes(query));

        if (!matchesName && !matchesCat && !matchesTags && !matchesNotes && !matchesLocation) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      // Size filter
      if (selectedSize !== 'all' && item.size !== selectedSize) {
        return false;
      }

      // Frequency filter
      if (selectedFrequency !== 'all' && item.frequency !== selectedFrequency) {
        return false;
      }

      // Room filter
      if (selectedRoom !== 'all') {
        if (!breadcrumb || breadcrumb.roomId !== selectedRoom) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'recent') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'size') {
        const order: Record<ItemSize, number> = { XS: 1, S: 2, M: 3, L: 4, XL: 5 };
        return order[a.size] - order[b.size];
      }
      return 0;
    });
  }, [items, search, selectedCategory, selectedSize, selectedFrequency, selectedRoom, sortBy, getBreadcrumbs]);

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setSelectedSize('all');
    setSelectedFrequency('all');
    setSelectedRoom('all');
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50/50 p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-5">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="font-bold text-slate-900 text-xl tracking-tight">
            Inventario & Clasificación de Objetos
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Desde lo más pequeño (tarjetas, tornillos) a lo más grande (bicis, maletas), localízalo en un segundo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAdvisor}
            className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs flex items-center gap-1.5 transition shadow-2xs border border-indigo-200/60"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Asesor de Almacenaje</span>
          </button>
          <button
            onClick={() => onOpenAddItem()}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Objeto</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, etiqueta (#invierno), categoría o estancia (despacho, trastero)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm placeholder:text-slate-400 bg-slate-50/50 focus:bg-white"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-medium"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Category */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-xs focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Todas las categorías</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Size */}
            <select
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-xs focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Todos los tamaños (XS a XL)</option>
              {(Object.keys(SIZE_CONFIG) as ItemSize[]).map((sz) => (
                <option key={sz} value={sz}>
                  {SIZE_CONFIG[sz].label}
                </option>
              ))}
            </select>

            {/* Frequency */}
            <select
              value={selectedFrequency}
              onChange={(e) => setSelectedFrequency(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-xs focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Todas las frecuencias</option>
              {(Object.keys(FREQUENCY_CONFIG) as UsageFrequency[]).map((fq) => (
                <option key={fq} value={fq}>
                  {FREQUENCY_CONFIG[fq].icon} {FREQUENCY_CONFIG[fq].label}
                </option>
              ))}
            </select>

            {/* Room */}
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-xs focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Todas las estancias</option>
              {allRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            {(search || selectedCategory !== 'all' || selectedSize !== 'all' || selectedFrequency !== 'all' || selectedRoom !== 'all') && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-rose-600 hover:underline font-medium px-2 py-1"
              >
                Restablecer filtros
              </button>
            )}
          </div>

          {/* Right: View mode and sort */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-medium"
            >
              <option value="recent">Más recientes</option>
              <option value="name">Alfabético (A-Z)</option>
              <option value="size">Por tamaño (XS ➔ XL)</option>
            </select>

            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'grid' ? 'bg-white shadow-2xs text-slate-800' : 'text-slate-500'
                }`}
                title="Vista cuadrícula"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'table' ? 'bg-white shadow-2xs text-slate-800' : 'text-slate-500'
                }`}
                title="Vista lista"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Item count summary */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Mostrando <strong>{filteredItems.length}</strong> de <strong>{items.length}</strong> artículos registrados
        </span>
      </div>

      {/* Items Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const breadcrumb = getBreadcrumbs(item.containerId);
            const sz = SIZE_CONFIG[item.size];
            const fq = FREQUENCY_CONFIG[item.frequency];

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-300 p-4 shadow-xs hover:shadow-md transition flex flex-col justify-between group"
              >
                <div>
                  {/* Top line with emoji, title & quantity */}
                  <div className="flex items-start gap-3">
                    <span className="text-2xl p-2 rounded-xl bg-slate-50 border border-slate-100 shrink-0">
                      {item.photoEmoji || '📦'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded truncate max-w-[170px]">
                          {item.category}
                        </span>
                        {item.quantity > 1 && (
                          <span className="text-[11px] font-bold text-slate-600 font-mono bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                            x{item.quantity}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm mt-1 leading-snug line-clamp-1">
                        {item.name}
                      </h3>
                    </div>
                  </div>

                  {/* Size and Frequency badges */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    <span
                      title={sz.example}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${sz.color}`}
                    >
                      {sz.badge}
                    </span>
                    <span
                      title={fq.zone}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${fq.color}`}
                    >
                      {fq.icon} {fq.short}
                    </span>
                    {item.notes && (
                      <span className="text-[10px] text-slate-400 italic truncate max-w-[140px]">
                        "{item.notes}"
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {item.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-slate-50 text-slate-600 border border-slate-200/80 px-2 py-0.5 rounded"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Breadcrumb location path */}
                  {breadcrumb && (
                    <div className="mt-3 p-2 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-indigo-500" />
                        <span>Ubicación guardada:</span>
                      </div>
                      <div className="font-medium text-slate-700 truncate text-[11px]">
                        <span>{breadcrumb.roomName}</span>
                        <span className="mx-1 text-slate-400 font-normal">➔</span>
                        <span>{breadcrumb.furnitureName}</span>
                        <span className="mx-1 text-slate-400 font-normal">➔</span>
                        <span className="text-indigo-600 font-semibold">
                          {breadcrumb.containerName}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom action buttons */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                  <button
                    onClick={() => locateItemOnMap(item.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-semibold text-xs flex items-center gap-1.5 transition"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Localizar en Mapa</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      title="Generar / Imprimir etiqueta QR"
                      onClick={() => onOpenQrModal(item.name, item.qrCode, item.category)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                    >
                      <QrIcon className="w-4 h-4" />
                    </button>
                    <button
                      title="Editar"
                      onClick={() => onEditItem(item)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      title="Eliminar"
                      onClick={() => {
                        if (confirm(`¿Eliminar "${item.name}"?`)) {
                          deleteItem(item.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Detailed Table View */
        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Artículo</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4">Tamaño</th>
                  <th className="py-3 px-4">Frecuencia</th>
                  <th className="py-3 px-4">Ubicación Física</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const breadcrumb = getBreadcrumbs(item.containerId);
                  const sz = SIZE_CONFIG[item.size];
                  const fq = FREQUENCY_CONFIG[item.frequency];

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{item.photoEmoji || '📦'}</span>
                          <div>
                            <span className="font-semibold text-slate-900 block">{item.name}</span>
                            {item.quantity > 1 && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                Cantidad: {item.quantity}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{item.category}</td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${sz.color}`}>
                          {sz.badge}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${fq.color}`}>
                          {fq.icon} {fq.short}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {breadcrumb ? (
                          <div className="text-slate-700">
                            <span className="font-medium">{breadcrumb.roomName}</span>
                            <span className="text-slate-400 mx-1">➔</span>
                            <span>{breadcrumb.furnitureName}</span>
                            <span className="text-slate-400 mx-1">➔</span>
                            <span className="text-indigo-600 font-medium">{breadcrumb.containerName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Sin asignar</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => locateItemOnMap(item.id)}
                            className="px-2 py-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium text-[11px] transition"
                          >
                            Mapa
                          </button>
                          <button
                            onClick={() => onOpenQrModal(item.name, item.qrCode, item.category)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                          >
                            <QrIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEditItem(item)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`¿Eliminar "${item.name}"?`)) {
                                deleteItem(item.id);
                              }
                            }}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center max-w-lg mx-auto">
          <PackageOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base">No se encontraron artículos</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Prueba a cambiar los filtros o registra tu primer artículo para comenzar a organizar tu espacio.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={handleResetFilters}
              className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium"
            >
              Restablecer filtros
            </button>
            <button
              onClick={() => onOpenAddItem()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
            >
              + Registrar Artículo Ahora
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
