export interface MascotDialogues {
  onboarding: string[];
  searchEmpty: string[];
  searchFound: string[];
  qrScanning: string[];
  saveSuccess: string[];
  photoAiAnalysis: string[];
  voiceListening: string[];
  ergonomicZoneGold: string[];
  ergonomicZoneNeutral: string[];
  ergonomicZoneCold: string[];
  systemError: string[];
  randomTips: string[];
}

export type MascotId = 'lumi' | 'glis' | 'nuro';

export interface MascotProfile {
  id: MascotId;
  name: string;
  title: string;
  tagline: string;
  bio: string;
  image: string;
  accentColor: string;
  bubbleBg: string;
}

export const MASCOT_PROFILES: Record<MascotId, MascotProfile> = {
  lumi: {
    id: 'lumi',
    name: 'Lumi',
    title: 'La Nube de Memoria Externa',
    tagline: 'Tu disco duro biológico de bolsillo con gafas de detective',
    bio: 'Una nube esponjosa de luz viva con forma de cerebro. Lleva unas gafas que le quedan grandes y a veces busca sus propias gafas teniéndolas en la cabeza. Su misión: guardar recuerdos espaciales para que tu mente humana descanse.',
    image: '/src/assets/images/lumi_mascot_1791202027224.jpg',
    accentColor: '#6366f1',
    bubbleBg: 'bg-indigo-50/90 border-indigo-200 text-indigo-950',
  },
  glis: {
    id: 'glis',
    name: 'Glis',
    title: 'El Hámster Acumulador Zen',
    tagline: 'Guarda cosas en sus mejillas de luz sin una pizca de culpa',
    bio: 'Un hámster achuchable de luz orgánica. Le encanta que guardes cosas en sitios raros porque para él cada rincón es una madriguera secreta. Cuando encuentras un objeto, ¡lo escupe con orgullo festivo!',
    image: '/src/assets/images/glis_mascot_1791202048360.jpg',
    accentColor: '#f59e0b',
    bubbleBg: 'bg-amber-50/90 border-amber-200 text-amber-950',
  },
  nuro: {
    id: 'nuro',
    name: 'Nuro',
    title: 'El Dron Escáner de Visión Espacial',
    tagline: 'Radiografía cajas con su haz láser en tiempo real',
    bio: 'Un dron esférico con visor holográfico y propulsores silenciosos. Escanea códigos QR a 60 FPS con algoritmo de visión por computador, analiza el contenido de cajas y te muestra lo que hay dentro sin tener que abrirlas.',
    image: '/src/assets/images/lumi_mascot_1791202027224.jpg',
    accentColor: '#10b981',
    bubbleBg: 'bg-emerald-50/90 border-emerald-200 text-emerald-950',
  },
};

export const LUMI_DIALOGUES: MascotDialogues = {
  onboarding: [
    "¡Hola humano! Soy Lumi, tu nube de memoria externa oficial. Sé que registrar lo que guardas da una pereza tremenda, así que hagamos un trato: tú dale al botón, yo activo mis poderes de neurona y creamos un mapa visual de tus cosas. Así, cuando se te olvide dónde pusiste el pasaporte (porque se te va a olvidar, admítelo), yo te diré exactamente en qué cajón está.",
    "¡Por fin nos conocemos! Soy Lumi. La ciencia dice que el cerebro humano no está diseñado para recordar en qué caja del canapé metiste el cargador del año 2018. Para eso estoy aquí: yo me encargo de la memoria, tú dedícate a vivir.",
    "¡Bienvenido a bordo! Soy Lumi. Deja de apuntar cosas en servilletas o notas del móvil que nunca volverás a abrir. Vamos a construir juntos el plano de tu casa y mapear hasta el último tornillo con alegría.",
  ],

  searchEmpty: [
    "He buscado en el rincón más oscuro del armario... No está ahí, pero encontré un calcetín desparejado que dabas por perdido en 2024. ¿Buscamos en otra caja o abrimos el trastero?",
    "Mis gafas de aumento están limpias y he rastreado cada balda: no veo nada con ese nombre. ¿Seguro que no le pusiste un apodo secreto, o lo dejamos en el coche?",
    "Mmm... mis sensores de nube no detectan ese objeto aquí. O todavía no lo hemos registrado juntos, o se ha teleportado a esa dimensión paralela donde van a parar los bolígrafos azules.",
    "¡Alarma de despiste! No encuentro ese objeto en tu inventario. No te juzgo, a mí se me acaban de perder las gafas y las llevo puestas en la coronilla. ¿Quieres que lo registremos ahora?",
  ],

  searchFound: [
    "¡BINGO ESPACIAL! ¡Mis antenas no fallan! Lo tienes exactamente donde te marco en el mapa. ¿A que da una satisfacción cósmica no tener que revolver cuatro cajas?",
    "¡Ajá! ¡Caso cerrado por el detective Lumi! Ahí mismito te está esperando. Tu memoria humana puede relajarse otros 10 minutos.",
    "¡Eureka! Localizado a la primera. Te he encendido la baliza radar en el plano para que vayas directo con los ojos cerrados.",
  ],

  qrScanning: [
    "Activando binoculares láser y casco de explorador... Apunta la cámara a cualquier pegatina QR. Mis fotones descifrarán qué hay dentro sin que tengas que abrir la caja.",
    "¡Lente de escaneo lista! Pon el código frente a mí. Estoy listo para hacer una radiografía instantánea de tu caja misteriosa.",
    "¡Oído y ojo al parche! Lector visual preparado. Enséñame ese código QR y te cuento los secretos que esconde ese cajón.",
  ],

  saveSuccess: [
    "¡Objeto registrado con éxito! *Hace un bailecito victorioso en el aire*. Choca esos cinco digitales. Tu casa está hoy un 1% más ordenada que ayer.",
    "¡Guardado para la eternidad! Ya puedes olvidarte por completo de dónde está: yo lo tengo grabado a fuego en mi base de datos cuántica.",
    "¡Yasss! Objeto guardado, etiquetado y ubicado ergonómicamente. Si Marie Kondo nos viera ahora mismo, lloraría de emoción.",
  ],

  photoAiAnalysis: [
    "Le he pasado la foto a mi primo mayor, el supercerebro de Gemini 3.8 Flash. Dice que ve tres destornilladores, un cable misterioso que no deberías tirar por si acaso, y algo que parece un tornillo pero podría ser un artefacto alienígena. ¡Todo categorizado!",
    "Mi visión láser de nube y Gemini han analizado la foto: hemos detectado el tamaño aproximado, la categoría y hasta la balda perfecta donde guardarlo sin doblar la espalda.",
    "¡Foto procesada en milisegundos! Gemini y yo nos hemos puesto de acuerdo: este objeto merece un hueco de fácil acceso. Revisa si te gusta nuestra sugerencia.",
  ],

  voiceListening: [
    "¡Soy todo orejas y nubes! Habla con confianza: dime qué guardaste o qué estás buscando como si hablaras con un amigo.",
    "Escuchando atentamente... Dime frases como: '¿Dónde está el pasaporte?' o 'He guardado la cinta aislante en el taller'.",
  ],

  ergonomicZoneGold: [
    "¡Esta es la Zona de Oro! Entre la altura de tus ojos y tu cintura. Aquí va lo que usas cada día: llaves, cascos, agenda. Cero agacharse, cero estirarse. ¡Ergonomía pura!",
    "Regla número uno de Lumi: lo que usas a diario no puede obligarte a ponerte de puntillas. La Zona de Oro es sagrada.",
  ],

  ergonomicZoneNeutral: [
    "Zona Neutra: a la altura de las rodillas o justo sobre la cabeza. Perfecta para planchas, juegos de mesa o herramientas que usas los fines de semana.",
  ],

  ergonomicZoneCold: [
    "A ver, a esta zona de arriba la llamamos 'Zona Fría' no porque caiga nieve, sino porque todo lo que guardes aquí va a ir al fondo de tu memoria. Es el lugar perfecto para el árbol de Navidad, los apuntes de la universidad de hace una década o esa freidora de aire que usaste una sola vez.",
    "¡Bienvenido al Polo Norte de tu casa! El altillo y el fondo del trastero: el cementerio de maletas y abrigos de esquí. Lo bueno es que como me tienes a mí, no tendrás que bajar 8 cajas para recordar qué había.",
  ],

  systemError: [
    "¡Cuidado! Una de mis neuronas principales se ha tropezado con un cable imaginario. No te preocupes, tus datos espaciales están a salvo abajo en la memoria local IndexedDB, pero dame un segundo para que me tome un café virtual y me vuelva a ordenar.",
    "¡Ups! Un pequeño hipo cósmico. Nada grave: tus cosas siguen guardadas a buen recaudo en tu navegador. Respiramos hondo y volvemos a intentarlo.",
  ],

  randomTips: [
    "¿Sabías que el 80% del desorden es solo indecisión sobre dónde dejar las cosas? ¡Elige una balda y déjame recordártelo a mí!",
    "Si tienes un cable que no sabes de qué aparato es, guárdalo en la 'Caja de Cables Huérfanos'. Si en dos años no lo has usado... bueno, seguiremos guardándolo por si acaso.",
    "Truco de Lumi: pega una etiqueta QR en la tapa de las cajas del trastero. Así sabrás si tienen ropa de verano o mantas sin pasar frío en invierno.",
    "Respira: no tienes que ordenar toda la casa en un día. Con registrar una caja hoy, ya le hemos ganado la partida al caos.",
  ],
};

export const GLIS_DIALOGUES: MascotDialogues = {
  ...LUMI_DIALOGUES,
  onboarding: [
    "¡Hola amigo humano! Soy Glis, tu ardilla-hámster de la memoria. ¿Sabes lo que más me gusta en el mundo? ¡Guardar cosas en sitios insospechados! Tú preocúpate de vivir, que yo guardo cada tuerca, bufanda y cargador en mis mofletes de luz para cuando los necesites.",
    "¡Bienvenido a mi madriguera! Soy Glis. No sientas culpa si tienes cosas acumuladas: para mí eso es pura riqueza. ¡Vamos a mapear tu casa para que ningún tesoro se pierda jamás!",
  ],
  searchEmpty: [
    "¡Sniff sniff! He olisqueado todas las baldas y mis mejillas están vacías... No encuentro nada con ese nombre. ¿Seguro que no lo escondiste en otro rincón secreto?",
    "He buscado bajo la alfombra y detrás del sofá: no está aquí. ¡Pero no pasa nada! Guardar cosas en lugares misteriosos es un arte, ¿probamos otra búsqueda?",
  ],
  searchFound: [
    "¡POOOOOOP! *Glis escupe el objeto con confeti de luz*. ¡Lo tenía bien guardadito aquí mismo en el mapa! ¡A que soy el mejor compañero de piso del mundo!",
    "¡Lo encontré, lo encontré! Justo en la balda que te marco. ¡Mis bigotes nunca se equivocan!",
  ],
  saveSuccess: [
    "¡Ñam! Guardado en la despensa del orden. Mis mejillas de luz lo tienen asegurado para siempre.",
    "¡Nuevo tesoro registrado! Si alguna vez dudas de dónde está, ¡solo silba y te lo muestro!",
  ],
};

export const NURO_DIALOGUES: MascotDialogues = {
  ...LUMI_DIALOGUES,
  onboarding: [
    "¡Sistema Nuro en línea! Soy tu dron de escaneo óptico y visión espacial. Mi haz láser radiografía códigos QR y contenidos en milisegundos para que nunca más tengas que abrir una caja a ciegas.",
  ],
  qrScanning: [
    "¡Sistemas de visión Nuro activados a 60 FPS! Apunta la cámara a cualquier etiqueta de caja o balda.",
    "Láser de rastreo calibrado. Detectando códigos QR con algoritmo de decodificación en tiempo real.",
    "Buscando patrón QR... Mantén la caja a unos 15-25 cm con buena iluminación.",
    "¡Coordenadas ópticas fijadas! Escaneando píxeles del código QR...",
  ],
  searchFound: [
    "¡Coordenadas fijadas! Nuro ha localizado el objeto en el mapa espacial.",
    "¡Radiografía completada! El artículo está exactamente en las coordenadas señaladas.",
  ],
  saveSuccess: [
    "¡Transmisión completada! Código QR enlazado a la base de datos de tu casa.",
  ],
};

/**
 * Helper to pick a random dialogue line from an array
 */
export function getRandomMascotDialogue(lines: string[]): string {
  if (!lines || lines.length === 0) return '';
  const idx = Math.floor(Math.random() * lines.length);
  return lines[idx];
}
