export type ItemSize = 'XS' | 'S' | 'M' | 'L' | 'XL';

export type UsageFrequency = 'daily' | 'weekly' | 'monthly' | 'seasonal' | 'rare';

export interface StorageItem {
  id: string;
  name: string;
  category: string;
  tags: string[];
  size: ItemSize;
  frequency: UsageFrequency;
  containerId: string;
  quantity: number;
  notes?: string;
  qrCode: string;
  createdAt: string;
  updatedAt: string;
  photoEmoji?: string;
  colorTag?: string;
}

export type ContainerType = 
  | 'shelf_level' 
  | 'drawer' 
  | 'box' 
  | 'bin' 
  | 'organizer_tray' 
  | 'hanger_bar' 
  | 'cabinet_door'
  | 'compartment';

export interface StorageContainer {
  id: string;
  furnitureId: string;
  name: string;
  type: ContainerType;
  qrCode: string;
  color?: string;
  levelIndex?: number;
  notes?: string;
}

export type FurnitureType = 
  | 'shelf' 
  | 'wardrobe' 
  | 'desk' 
  | 'drawers' 
  | 'cabinet' 
  | 'rack' 
  | 'trunk' 
  | 'custom';

export interface Furniture {
  id: string;
  roomId: string;
  name: string;
  type: FurnitureType;
  x: number; // 0 to 100 percentage inside room
  y: number; // 0 to 100 percentage inside room
  width: number; // percentage
  height: number; // percentage
  color?: string;
  containers: StorageContainer[];
}

export interface Room {
  id: string;
  spaceId: string;
  name: string;
  color: string;
  x: number; // 0 to 100 on floorplan
  y: number;
  width: number;
  height: number;
  furniture: Furniture[];
}

export interface StorageSpace {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  rooms: Room[];
}

export interface DIYIdea {
  title: string;
  difficulty: string;
  materials: string[];
  steps: string[];
  exampleQuote: string;
  tags: string[];
}

export interface PurchaseIdea {
  name: string;
  approxPrice: string;
  description: string;
  whereToPlace: string;
}

export interface RecommendedExistingSpot {
  containerId: string;
  locationName: string;
  reason: string;
  score: number;
}

export interface StorageSuggestionResult {
  itemName: string;
  sizeDesc?: string;
  frequencyDesc?: string;
  ergonomicReasoning: string;
  recommendedExistingSpots: RecommendedExistingSpot[];
  diyIdeas: DIYIdea[];
  purchaseIdeas: PurchaseIdea[];
  source?: 'gemini' | 'heuristic' | 'fallback';
}

export interface LocationBreadcrumbs {
  spaceName: string;
  roomName: string;
  furnitureName: string;
  containerName: string;
  roomId: string;
  furnitureId: string;
  containerId: string;
}

export const CATEGORIES = [
  'Electrónica & Cables',
  'Documentos & Papeles',
  'Herramientas & Bricolaje',
  'Ropa & Calzado',
  'Cocina & Menaje',
  'Salud & Botiquín',
  'Material de Oficina',
  'Aficiones & Manualidades',
  'Recambios & Ferretería',
  'Recuerdos & Colección',
  'Limpieza & Hogar',
  'Viajes & Deportes',
  'Otros',
] as const;

export const AREA_TYPE_CONFIG: Record<
  FurnitureType | ContainerType | 'room',
  { label: string; icon: string; badgeColor: string; description: string }
> = {
  room: {
    label: 'Habitación / Zona',
    icon: '🏠',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    description: 'Área espacial principal (ej. Salón, Despacho)',
  },
  wardrobe: {
    label: 'Armario',
    icon: '🚪',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Armario ropero, vestidor o alacena cerrada',
  },
  shelf: {
    label: 'Estantería',
    icon: '📚',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Estructura vertical con baldas abiertas',
  },
  drawers: {
    label: 'Cajonera / Cómoda',
    icon: '🗄️',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    description: 'Bloque de cajones superpuestos',
  },
  desk: {
    label: 'Escritorio',
    icon: '🖥️',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    description: 'Mesa de trabajo con cajones y superficie',
  },
  cabinet: {
    label: 'Mueble / Aparador',
    icon: '🗃️',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
    description: 'Mueble bajo con puertas y módulos',
  },
  rack: {
    label: 'Estantería de Carga',
    icon: '🪜',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
    description: 'Estantería metálica resistente para trastero',
  },
  trunk: {
    label: 'Baúl / Espacio Suelo',
    icon: '🧳',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    description: 'Espacio diáfano para objetos voluminosos',
  },
  custom: {
    label: 'Estructura Personalizada',
    icon: '🧩',
    badgeColor: 'bg-gray-100 text-gray-800 border-gray-200',
    description: 'Área o soporte definido a medida',
  },
  drawer: {
    label: 'Cajón',
    icon: '📥',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-300',
    description: 'Subnivel extraíble horizontal',
  },
  shelf_level: {
    label: 'Balda / Estante',
    icon: '➖',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-300',
    description: 'Nivel horizontal dentro del mueble',
  },
  box: {
    label: 'Caja Organizadora',
    icon: '📦',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    description: 'Contenedor cerrado o modular con tapa',
  },
  bin: {
    label: 'Bote / Organizador',
    icon: '🥫',
    badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-300',
    description: 'Recipiente para piezas pequeñas o tornillería',
  },
  organizer_tray: {
    label: 'Bandeja Vaciabolsillos',
    icon: '🍽️',
    badgeColor: 'bg-orange-50 text-orange-700 border-orange-300',
    description: 'Superficie plana delimitada de acceso diario',
  },
  hanger_bar: {
    label: 'Barra de Perchas',
    icon: '👔',
    badgeColor: 'bg-violet-50 text-violet-700 border-violet-300',
    description: 'Barra horizontal para colgar prendas',
  },
  cabinet_door: {
    label: 'Armarito / Módulo',
    icon: '🚪',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-300',
    description: 'Compartimento con puerta',
  },
  compartment: {
    label: 'Rincón / Hueco',
    icon: '📍',
    badgeColor: 'bg-slate-50 text-slate-700 border-slate-300',
    description: 'Sub-área física reservada',
  },
};

export const SIZE_CONFIG: Record<ItemSize, { label: string; badge: string; example: string; color: string }> = {
  XS: {
    label: 'Muy Pequeño (XS)',
    badge: 'XS',
    example: 'Joyas, tornillos, tarjetas SD, llaves sueltas',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  S: {
    label: 'Pequeño (S)',
    badge: 'S',
    example: 'Cables, medicinas, libros de bolsillo, ratón',
    color: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  },
  M: {
    label: 'Mediano (M)',
    badge: 'M',
    example: 'Ropa, pequeños electrodomésticos, herramientas',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  L: {
    label: 'Grande (L)',
    badge: 'L',
    example: 'Maleta de cabina, abrigos gruesos, aspiradora',
    color: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  XL: {
    label: 'Muy Grande (XL)',
    badge: 'XL',
    example: 'Bicicleta, equipamiento de nieve, cajas de mudanza',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
  },
};

export const FREQUENCY_CONFIG: Record<UsageFrequency, { label: string; short: string; zone: string; icon: string; color: string }> = {
  daily: {
    label: 'Uso Diario',
    short: 'Diario',
    zone: 'Zona de Oro (a mano, entre pecho y ojos)',
    icon: '⚡',
    color: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  weekly: {
    label: 'Uso Semanal',
    short: 'Semanal',
    zone: 'Zona Accesible (cajones superiores o baldas medias)',
    icon: '🔄',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  monthly: {
    label: 'Uso Mensual',
    short: 'Mensual',
    zone: 'Zona Secundaria (baldas inferiores o traseras)',
    icon: '📅',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  seasonal: {
    label: 'Por Temporada / Estacional',
    short: 'Temporada',
    zone: 'Zona Fría (altillos, bajo cama o trastero)',
    icon: '❄️',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  rare: {
    label: 'Casi Nunca / Archivo',
    short: 'Archivo',
    zone: 'Zona Muerta / Trastero protegido',
    icon: '📦',
    color: 'bg-slate-100 text-slate-700 border-slate-300',
  },
};
