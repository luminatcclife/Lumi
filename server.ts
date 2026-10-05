import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '25mb' }));

// Helper to extract clean base64 and mime
function parseBase64Image(dataUri: string) {
  const matches = dataUri.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    return { mimeType: matches[1], data: matches[2] };
  }
  return { mimeType: 'image/jpeg', data: dataUri };
}

// Fallback image analyzer when Gemini is not configured
function getFallbackImageAnalysis(hint?: string, existingSpots: ExistingSpot[] = []) {
  const fallbackItem = hint && hint.trim() ? hint.trim() : 'Artículo Fotografiado';
  const defaultSpot = existingSpots[0] || null;
  return {
    name: fallbackItem,
    category: 'Otros',
    size: 'M',
    frequency: 'weekly',
    tags: ['#foto', '#pendienteRevisar'],
    photoEmoji: '📸',
    notes: 'Registrado mediante captura fotográfica.',
    recommendedContainerId: defaultSpot ? defaultSpot.id : '',
    locationRationale: defaultSpot 
      ? `Ubicación sugerida en ${defaultSpot.roomName} (${defaultSpot.furnitureName}) por disponibilidad.`
      : 'Asignado al primer espacio disponible.',
    confidence: 0.85,
  };
}

// Fallback natural language text/voice analyzer
function getFallbackVoiceTextAnalysis(text: string, existingSpots: ExistingSpot[] = []) {
  const clean = text.trim();
  const lower = clean.toLowerCase();

  // Try to match existing spot
  let matchedSpot: ExistingSpot | null = null;
  for (const spot of existingSpots) {
    if (
      lower.includes(spot.name.toLowerCase()) ||
      lower.includes(spot.furnitureName.toLowerCase()) ||
      lower.includes(spot.roomName.toLowerCase())
    ) {
      matchedSpot = spot;
      break;
    }
  }

  // Guess size
  let size: 'XS' | 'S' | 'M' | 'L' | 'XL' = 'S';
  if (lower.includes('pequeñ') || lower.includes('tornillo') || lower.includes('joya') || lower.includes('tarjeta') || lower.includes('llave')) {
    size = 'XS';
  } else if (lower.includes('cable') || lower.includes('libro') || lower.includes('medicina') || lower.includes('mando')) {
    size = 'S';
  } else if (lower.includes('ropa') || lower.includes('herramienta') || lower.includes('taladro') || lower.includes('batidora')) {
    size = 'M';
  } else if (lower.includes('maleta') || lower.includes('abrigo') || lower.includes('aspiradora')) {
    size = 'L';
  } else if (lower.includes('bici') || lower.includes('árbol') || lower.includes('caja grande')) {
    size = 'XL';
  }

  // Guess frequency
  let frequency: 'daily' | 'weekly' | 'monthly' | 'seasonal' | 'rare' = 'weekly';
  if (lower.includes('diario') || lower.includes('todos los días') || lower.includes('siempre') || lower.includes('mano')) {
    frequency = 'daily';
  } else if (lower.includes('semanal')) {
    frequency = 'weekly';
  } else if (lower.includes('mes') || lower.includes('mensual')) {
    frequency = 'monthly';
  } else if (lower.includes('invierno') || lower.includes('verano') || lower.includes('navidad') || lower.includes('temporada') || lower.includes('estacional')) {
    frequency = 'seasonal';
  } else if (lower.includes('raro') || lower.includes('recuerdo') || lower.includes('casi nunca') || lower.includes('archivo')) {
    frequency = 'rare';
  }

  // Guess category
  let category = 'Otros';
  if (lower.includes('cable') || lower.includes('usb') || lower.includes('cargador') || lower.includes('auricular') || lower.includes('consola')) {
    category = 'Electrónica & Cables';
  } else if (lower.includes('documento') || lower.includes('papel') || lower.includes('factura') || lower.includes('pasaporte')) {
    category = 'Documentos & Papeles';
  } else if (lower.includes('herramienta') || lower.includes('tornillo') || lower.includes('taladro') || lower.includes('martillo')) {
    category = 'Herramientas & Bricolaje';
  } else if (lower.includes('ropa') || lower.includes('abrigo') || lower.includes('zapato') || lower.includes('chaqueta')) {
    category = 'Ropa & Calzado';
  } else if (lower.includes('medicina') || lower.includes('termómetro') || lower.includes('pastilla') || lower.includes('botiquín')) {
    category = 'Salud & Botiquín';
  }

  // Clean item name by stripping preamble
  let itemName = clean;
  const prefixes = [
    /^(he guardado|guardé|guarda|quiero guardar|almacenar|poner|tengo)\s+(el|la|los|las|un|una|unos|unas)?\s*/i,
    /^(acabo de guardar|añadir)\s+/i,
  ];
  for (const p of prefixes) {
    itemName = itemName.replace(p, '');
  }
  // Cut at "en el" or "en la"
  const splitEn = itemName.split(/\s+(?:en|dentro de)\s+/i);
  if (splitEn.length > 1) {
    itemName = splitEn[0];
  }
  itemName = itemName.charAt(0).toUpperCase() + itemName.slice(1);

  return {
    name: itemName || clean,
    category,
    size,
    frequency,
    tags: ['#dictado', '#voz'],
    photoEmoji: category === 'Electrónica & Cables' ? '🔌' : category === 'Documentos & Papeles' ? '🛂' : category === 'Herramientas & Bricolaje' ? '🛠️' : '📦',
    notes: `Transcripción: "${clean}"`,
    recommendedContainerId: matchedSpot ? matchedSpot.id : (existingSpots[0]?.id || ''),
    locationRationale: matchedSpot 
      ? `Detectado automáticamente en tu frase: ${matchedSpot.roomName} ➔ ${matchedSpot.furnitureName} (${matchedSpot.name}).`
      : 'Asignado según frecuencia y disponibilidad.',
  };
}

// Endpoint: Analyze Item Image with Gemini Vision
app.post('/api/analyze-item-image', async (req, res) => {
  const { imageBase64, userHint, existingContainers = [] } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ success: false, error: 'Falta la imagen en base64' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    const fallback = getFallbackImageAnalysis(userHint, existingContainers);
    return res.json({ success: true, source: 'fallback', ...fallback });
  }

  try {
    const ai = new GoogleGenAI();
    const { mimeType, data } = parseBase64Image(imageBase64);

    const prompt = `Analiza la imagen de este objeto u objetos que el usuario quiere guardar en casa o trastero.
Pista opcional dada por el usuario: "${userHint || 'Ninguna'}".

ESPACIOS Y CONTENEDORES DISPONIBLES EN SU HOGAR:
${JSON.stringify(existingContainers, null, 2)}

Identifica qué objeto es y clasifícalo. Responde ÚNICAMENTE con un JSON con esta estructura exacta:
{
  "name": "Nombre conciso y descriptivo del objeto (en español, ej: Llaves de repuesto, Taladro de percusión, Cables USB-C, Abrigo de plumas)",
  "category": "Una de: Electrónica & Cables, Documentos & Papeles, Herramientas & Bricolaje, Ropa & Calzado, Cocina & Menaje, Salud & Botiquín, Material de Oficina, Aficiones & Manualidades, Recambios & Ferretería, Recuerdos & Colección, Limpieza & Hogar, Viajes & Deportes, Otros",
  "size": "XS" (si cabe en la palma como tornillo/joya), "S" (si cabe en la mano como cable/libro), "M" (mediano como ropa/batidora), "L" (grande como maleta/aspiradora) o "XL" (muy voluminoso como bici/mueble),
  "frequency": "daily" (uso diario), "weekly" (semanal), "monthly" (mensual), "seasonal" (temporada/invierno) o "rare" (casi nunca/archivo),
  "tags": ["#etiqueta1", "#etiqueta2"],
  "photoEmoji": "un emoji único y representativo (ej: 🔑, 🔌, 🛠️, 🧳, 🩹, 🎮, 👕, 📦)",
  "notes": "Breve descripción visual de su estado, color y características",
  "recommendedContainerId": "id del contenedor más idóneo de los existentes que coincida ergonómicamente con el tamaño y frecuencia, o el primer id de la lista",
  "locationRationale": "Explicación breve de por qué este lugar de almacenaje es el mejor según la regla de ergonomía"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            mimeType,
            data,
          },
        },
        prompt,
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '';
    const parsed = JSON.parse(text);
    return res.json({ success: true, source: 'gemini-vision', ...parsed });
  } catch (err) {
    console.error('Error analyzing image with Gemini:', err);
    const fallback = getFallbackImageAnalysis(userHint, existingContainers);
    return res.json({ success: true, source: 'fallback', ...fallback });
  }
});

// Endpoint: Analyze Voice or Natural Language Text
app.post('/api/analyze-voice-text', async (req, res) => {
  const { text, existingContainers = [] } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, error: 'Texto vacío' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    const fallback = getFallbackVoiceTextAnalysis(text, existingContainers);
    return res.json({ success: true, source: 'fallback', ...fallback });
  }

  try {
    const ai = new GoogleGenAI();
    const prompt = `El usuario ha dicho o dictado la siguiente frase para registrar un objeto en su casa:
"${text}"

ESPACIOS DISPONIBLES EN SU HOGAR:
${JSON.stringify(existingContainers, null, 2)}

Extrae las entidades y determina la ubicación adecuada. Si el usuario mencionó explícitamente una habitación o mueble (ej: "en el cajón del despacho"), haz coincidir con "recommendedContainerId".
Responde ÚNICAMENTE con un JSON con esta estructura exacta:
{
  "name": "Nombre limpio del objeto (ej: Pasaportes familiares)",
  "category": "Una de: Electrónica & Cables, Documentos & Papeles, Herramientas & Bricolaje, Ropa & Calzado, Cocina & Menaje, Salud & Botiquín, Material de Oficina, Aficiones & Manualidades, Recambios & Ferretería, Recuerdos & Colección, Limpieza & Hogar, Viajes & Deportes, Otros",
  "size": "XS" | "S" | "M" | "L" | "XL",
  "frequency": "daily" | "weekly" | "monthly" | "seasonal" | "rare",
  "tags": ["#etiqueta1", "#etiqueta2"],
  "photoEmoji": "emoji adecuado",
  "notes": "Detalles o notas mencionadas",
  "recommendedContainerId": "id del contenedor mencionado o el más idóneo",
  "locationRationale": "Por qué se asigna aquí"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, source: 'gemini-nlp', ...parsed });
  } catch (err) {
    console.error('Error analyzing voice/text with Gemini:', err);
    const fallback = getFallbackVoiceTextAnalysis(text, existingContainers);
    return res.json({ success: true, source: 'fallback', ...fallback });
  }
});

interface ExistingSpot {
  id: string;
  name: string;
  roomName: string;
  furnitureName: string;
  type: string;
  depthLevel?: string;
  currentItemsCount: number;
}

interface SuggestStorageRequest {
  itemName: string;
  size: 'XS' | 'S' | 'M' | 'L' | 'XL';
  frequency: 'daily' | 'weekly' | 'monthly' | 'seasonal' | 'rare';
  category: string;
  notes?: string;
  existingSpots?: ExistingSpot[];
}

function getFallbackSuggestions(reqData: SuggestStorageRequest) {
  const { itemName, size, frequency, category, existingSpots = [] } = reqData;

  const sizeLabels: Record<string, string> = {
    XS: 'Muy Pequeño (cabe en la palma, p. ej. joyas, tornillos, llaves)',
    S: 'Pequeño (libros, cables, medicinas)',
    M: 'Mediano (ropa, batidora, herramientas)',
    L: 'Grande (maleta, abrigos voluminosos, aspiradora)',
    XL: 'Muy Grande (bicicleta, cajas de mudanza, equipamiento)',
  };

  const freqLabels: Record<string, string> = {
    daily: 'Uso Diario (acceso inmediato y sin obstáculos)',
    weekly: 'Uso Semanal (fácil acceso en estantes medios)',
    monthly: 'Uso Mensual (cajones inferiores o estantes altos)',
    seasonal: 'Uso Estacional / Temporada (altillos, trastero, bajo cama)',
    rare: 'Uso Raro / Archivo (zonas profundas, cajas cerradas protegidas)',
  };

  let ergonomic = '';
  if (frequency === 'daily') {
    ergonomic = `Para "${itemName}" (${freqLabels[frequency]}), la regla de oro del almacenaje exige la "Zona de Oro" (entre la cintura y los ojos). Debe estar en una superficie abierta, bandeja vaciabolsillos o el primer cajón sin tapas complicadas para que tomarlo y guardarlo requiera menos de 3 segundos.`;
  } else if (frequency === 'weekly' || frequency === 'monthly') {
    ergonomic = `Para artículos de uso ${frequency === 'weekly' ? 'semanal' : 'mensual'}, la altura ideal es entre las rodillas y el pecho. Las baldas accesibles o cajones secundarios con etiquetas visibles evitan desordenar el resto del espacio.`;
  } else {
    ergonomic = `Dado su uso ${frequency === 'seasonal' ? 'estacional' : 'esporádico'}, ubícalo en la "Zona Fría" (altillos de armario, trastero, canapé o estantes superiores). Debe estar en contenedores cerrados y con etiqueta clara para protegerlo del polvo y la humedad.`;
  }

  // Find suitable existing spots
  const recommendedExisting = existingSpots.map((spot) => {
    let score = 70;
    let reason = `Espacio disponible en ${spot.roomName} (${spot.furnitureName}).`;
    
    if (frequency === 'daily' && spot.roomName.toLowerCase().includes('despacho') || spot.roomName.toLowerCase().includes('salón') || spot.roomName.toLowerCase().includes('dormitorio')) {
      score += 15;
      reason = `Zona de paso frecuente en ${spot.roomName}. Ideal para tenerlo a mano.`;
    }
    if ((frequency === 'seasonal' || frequency === 'rare') && (spot.roomName.toLowerCase().includes('trastero') || spot.furnitureName.toLowerCase().includes('altillo') || spot.furnitureName.toLowerCase().includes('armario'))) {
      score += 20;
      reason = `Excelente para almacenaje a largo plazo sin ocupar espacio cotidiano.`;
    }
    if ((size === 'XS' || size === 'S') && spot.type === 'box') {
      score += 10;
      reason += ` Contenedor delimitado ideal para evitar que se pierdan objetos pequeños.`;
    }
    return {
      containerId: spot.id,
      locationName: `${spot.roomName} ➔ ${spot.furnitureName} ➔ ${spot.name}`,
      reason,
      score,
    };
  }).sort((a, b) => b.score - a.score).slice(0, 3);

  // Creative DIY ideas personalized to size and category
  const diyIdeas = [];

  if (size === 'XS' || size === 'S') {
    diyIdeas.push({
      title: 'Organizador Compartimentado con Caja de Zapatos y Cartón',
      difficulty: 'Fácil (15 min)',
      materials: [
        '1 caja de zapatos o bombones limpia',
        'Tiras de cartón reciclado para divisiones',
        'Pegamento o cinta adhesiva',
        'Rotulador o rotuladora para etiquetas',
      ],
      steps: [
        'Corta tiras de cartón a la misma altura que la caja.',
        'Haz ranuras a media altura en las tiras para cruzarlas en cuadrícula creando 4 o 6 compartimentos.',
        'Etiqueta cada división por tipo de artículo (p. ej. "Cables", "Pilas", "Adaptadores").',
        'Pega una etiqueta exterior o el código QR de UbicaYa en la tapa o frontal.',
      ],
      exampleQuote: '¡Coge una caja pequeña, fórrala si te gusta y ponle separadores con etiqueta para no perder nunca más cosas pequeñas!',
      tags: ['Reciclaje', 'Cero Coste', 'Personalizable'],
    });

    diyIdeas.push({
      title: 'Botes de Cristal Magnéticos o Colgantes',
      difficulty: 'Fácil (10 min)',
      materials: [
        'Botes pequeños de cristal (mermelada o conservas)',
        'Imán potente de neodimio o tornillos para la tapa',
        'Pintura pizarra o cinta de carrocero para rotular',
      ],
      steps: [
        'Lava bien el bote y retira las etiquetas.',
        'Atornilla la tapa debajo de una balda o fija un imán en la tapa.',
        'Enrosca el frasco: tendrás tus objetos suspendidos a la vista sin ocupar superficie útil.',
      ],
      exampleQuote: 'Aprovecha el espacio vertical debajo de tus baldas con botes transparentes desenroscables.',
      tags: ['Ahorro Espacio', 'Visual', 'Bricolaje'],
    });
  } else {
    diyIdeas.push({
      title: 'Caja Contenedora XL con Asas y Ruedas Caseras',
      difficulty: 'Medio (25 min)',
      materials: [
        'Caja resistente de electrodoméstico o fruta de madera',
        '4 ruedas giratorias pequeñas adhesivas o atornilladas',
        'Cuerda o tela para asas laterales',
        'Bolsas al vacío para compactar textiles',
      ],
      steps: [
        'Refuerza la base de la caja con una lámina de cartón doble o madera fina.',
        'Coloca las ruedas en las cuatro esquinas para deslizarla bajo la cama o armario.',
        'Haz dos orificios en los laterales y pasa la cuerda como asas para sacarla fácilmente.',
        'Añade un tarjetero o funda plástica transparente en el frontal para insertar la etiqueta QR.',
      ],
      exampleQuote: 'Convierte cualquier caja fuerte en un cajón rodante para aprovechar bajos de cama o huecos muertos.',
      tags: ['Gran Capacidad', 'Bajo Cama', 'Móvil'],
    });

    diyIdeas.push({
      title: 'Separadores Verticales con Tablas o Planchas de Goma EVA',
      difficulty: 'Fácil (20 min)',
      materials: ['Planchas rígidas de cartón pluma o madera contrachapada', 'Soportes en L adhesivos'],
      steps: [
        'Mide la altura del armario o estante grande.',
        'Coloca los paneles en vertical para evitar que los artículos apilados se caigan como fichas de dominó.',
        'Asigna a cada sección una categoría fija.',
      ],
      exampleQuote: 'La compartimentación vertical te permite extraer el objeto sin desmoronar lo que tiene al lado.',
      tags: ['Armarios', 'Estabilidad', 'Organización Pro'],
    });
  }

  const purchaseIdeas = [
    {
      name: size === 'XS' || size === 'S' 
        ? 'Caja organizadora con separadores modulares transparentes'
        : 'Cajas de polipropileno apilables con tapa y clip de cierre',
      approxPrice: size === 'XS' || size === 'S' ? '4€ - 8€' : '9€ - 16€',
      description: 'Permite visibilidad inmediata del interior sin abrir, con esquinas reforzadas para apilar con seguridad.',
      whereToPlace: frequency === 'daily' ? 'Encima del escritorio o en primer cajón' : 'Estantería superior o trastero',
    },
    {
      name: 'Etiquetas térmicas adhesivas o rotuladora portátil',
      approxPrice: '12€ - 22€',
      description: 'Ideal para imprimir los códigos QR de UbicaYa y nombres legibles a distancia.',
      whereToPlace: 'Cajón de herramientas o papelería',
    },
  ];

  return {
    itemName,
    sizeDesc: sizeLabels[size] || size,
    frequencyDesc: freqLabels[frequency] || frequency,
    ergonomicReasoning: ergonomic,
    recommendedExistingSpots: recommendedExisting,
    diyIdeas,
    purchaseIdeas,
  };
}

app.post('/api/suggest-storage', async (req, res) => {
  const reqData = req.body as SuggestStorageRequest;
  const { itemName, size, frequency, category, notes, existingSpots = [] } = reqData;

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    // Return rich rule-based organization suggestions immediately
    const fallback = getFallbackSuggestions(reqData);
    return res.json({ success: true, source: 'heuristic', ...fallback });
  }

  try {
    const ai = new GoogleGenAI();
    const prompt = `Eres un organizador profesional de espacios domésticos y de trabajo (estilo Marie Kondo + ergonomía de almacén).
Analiza el siguiente objeto y genera recomendaciones óptimas de almacenaje, considerando su tamaño, frecuencia de uso y características:

DATOS DEL OBJETO:
- Nombre: "${itemName}"
- Tamaño: "${size}" (XS: muy pequeño como tornillo/joya, S: pequeño como libro/cable, M: mediano como ropa/tostadora, L: grande como maleta/aspiradora, XL: muy voluminoso)
- Frecuencia de uso: "${frequency}" (daily: diario, weekly: semanal, monthly: mensual, seasonal: estacional/temporada, rare: casi nunca/archivo)
- Categoría: "${category}"
- Notas adicionales: "${notes || 'Ninguna'}"

ESPACIOS ACTUALES DISPONIBLES EN EL SISTEMA DEL USUARIO:
${existingSpots.length > 0 ? JSON.stringify(existingSpots, null, 2) : 'Aún no tiene espacios registrados o están llenos.'}

REGLAS DE ERGONOMÍA:
- Alta frecuencia (daily): zona de oro (altura entre cintura y ojos, acceso rápido sin cajas cerradas ni escaleras).
- Media frecuencia (weekly/monthly): estantes medios o cajones accesibles.
- Baja frecuencia (seasonal/rare): altillos, zonas bajo cama, trastero, cajas protegidas contra polvo.
- Tamaño: objetos pequeños requieren división interna (bandejas, separadores, botes) para no perderse. Objetos grandes van en zonas bajas o trastero por seguridad y peso.

Debes responder ÚNICAMENTE con un objeto JSON válido con la siguiente estructura:
{
  "ergonomicReasoning": "Explicación clara y didáctica de por qué conviene esta ubicación según ergonomía y frecuencia",
  "recommendedExistingSpots": [
    {
      "containerId": "id del contenedor existente si aplica, o vacio",
      "locationName": "Nombre legible del sitio existente",
      "reason": "Por qué es idóneo para este objeto",
      "score": 95
    }
  ],
  "diyIdeas": [
    {
      "title": "Nombre de la idea casera (ej. Caja de zapatos con separadores)",
      "difficulty": "Fácil (15 min) | Medio (30 min)",
      "materials": ["Material 1", "Material 2"],
      "steps": ["Paso 1...", "Paso 2..."],
      "exampleQuote": "Frase motivadora y práctica (ej: Coge una caja pequeña, ponle una etiqueta...)",
      "tags": ["DIY", "Reciclaje"]
    }
  ],
  "purchaseIdeas": [
    {
      "name": "Nombre del organizador comercial",
      "approxPrice": "Ej: 6€ - 12€",
      "description": "Breve descripción",
      "whereToPlace": "Dónde ubicarlo"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '';
    const parsed = JSON.parse(text);
    return res.json({ success: true, source: 'gemini', ...parsed });
  } catch (error) {
    console.error('Error in Gemini suggestion:', error);
    // Graceful fallback to heuristic
    const fallback = getFallbackSuggestions(reqData);
    return res.json({ success: true, source: 'fallback', ...fallback });
  }
});

// Serve frontend in production or hook Vite in development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`UbicaYa server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
