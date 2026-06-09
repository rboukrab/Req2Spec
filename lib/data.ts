/* ===========================================================
   uDefine — conversación guionizada requisito → especificación
   =========================================================== */

export interface ModuleInfo {
  key: string;
  name: string;
  bg: string;
  ink: string;
}

export interface Spec {
  id: string;
  title: string;
  module: string;
  type: string;
  fit: string;
  custom: boolean;
  complexity: number;
  effort: string;
  priority: string;
  source: string;
  description: string;
  objects: string[];
  acceptance: string[];
  question?: string;
  process?: string;
  subProcess?: string;
  parentId?: string;
  level: "task" | "subtask";
}

export interface Project {
  customer: string;
  engagement: string;
  phase: string;
  location: string;
}

export interface Greeting {
  kind: string;
  text: string;
}

export interface SuggestionItem {
  text: string;
  action?: string;
  accent?: boolean;
}

export interface Suggestion {
  label: string;
  items: SuggestionItem[];
}

export type BlockItemKind = "text" | "clarify" | "spec" | "wrap";

export interface BlockItem {
  kind: BlockItemKind;
  text: string;
  spec?: Spec;
}

export interface UDData {
  MODULES: Record<string, ModuleInfo>;
  project: Project;
  greeting: Greeting;
  suggestions: Suggestion[];
  blocks: BlockItem[][];
  fallbackClarify: BlockItem;
  specOrder: Spec[];
}

export const MODULES: Record<string, ModuleInfo> = {
  MM:   { key: "MM",   name: "Gestión de Materiales",    bg: "var(--mod-mm)",   ink: "var(--mod-mm-ink)" },
  SD:   { key: "SD",   name: "Ventas y Distribución",    bg: "var(--mod-sd)",   ink: "var(--mod-sd-ink)" },
  FI:   { key: "FI",   name: "Finanzas (FI/CO)",         bg: "var(--mod-fi)",   ink: "var(--mod-fi-ink)" },
  PP:   { key: "PP",   name: "Planificación Producción", bg: "var(--mod-pp)",   ink: "var(--mod-pp-ink)" },
  ABAP: { key: "ABAP", name: "Desarrollo / ABAP",        bg: "var(--mod-abap)", ink: "var(--mod-abap-ink)" },
  S4:   { key: "S4",   name: "Núcleo S/4HANA",           bg: "var(--mod-s4)",   ink: "var(--mod-s4-ink)" },
};

export const project: Project = {
  customer: "Construcciones y Auxiliar de Ferrocarriles",
  engagement: "S/4HANA Greenfield",
  phase: "Taller Fit-to-Standard",
  location: "Presencial · Barcelona",
};

const SPEC_001: Spec = {
  id: "SPEC-001",
  title: "Estrategia de Liberación para Pedidos de Compra de Alto Valor",
  module: "MM",
  type: "Funcional",
  fit: "Configuración estándar",
  custom: false,
  complexity: 2,
  effort: "4 JP",
  priority: "Alta",
  source: "Los pedidos de compra superiores a 50.000 € deben bloquearse hasta que un responsable los apruebe.",
  description:
    "Configurar una estrategia de liberación de compras para que cualquier pedido de compra con un valor neto ≥ 50.000 € se marque automáticamente como «bloqueado» al guardar y se retenga de la emisión y la entrada de mercancías hasta que lo libere un responsable autorizado. Aplica a todos los centros, evaluado por pedido de compra.",
  objects: ["EKKO", "EKPO", "Grupo de liberación", "Código de liberación Z1", "T16FS"],
  acceptance: [
    "Un pedido con valor neto ≥ 50.000 € se marca como «Bloqueado» al guardar.",
    "Solo los usuarios con el código de liberación Z1 pueden liberar el pedido.",
    "Los pedidos liberados continúan a emisión; los rechazados vuelven al comprador.",
  ],
  question: "Confirmar la jerarquía de aprobación para pedidos superiores a 250.000 € (liberación simple o doble).",
  process: "Compras",
  subProcess: "Liberación de pedidos",
  level: "task",
};

const SPEC_002: Spec = {
  id: "SPEC-002",
  title: "Verificación Automática del Límite de Crédito al Crear el Pedido de Ventas",
  module: "SD",
  type: "Funcional",
  fit: "Configuración estándar",
  custom: false,
  complexity: 3,
  effort: "6 JP",
  priority: "Alta",
  source: "Los pedidos de ventas que superen el límite de crédito del cliente deben detenerse y enviarse al equipo de crédito.",
  description:
    "Activar la Gestión de Crédito de SAP para que, al guardar el pedido de ventas, se compruebe la exposición abierta del cliente frente a su límite de crédito. Los pedidos que superen el límite se bloquean para entrega y se dirigen a la lista de trabajo del equipo de crédito para su revisión y liberación.",
  objects: ["VBAK", "FD32 / UKM_BP", "Área de control de crédito", "Categoría de riesgo", "Bloqueo VKM3"],
  acceptance: [
    "Valor del pedido + exposición abierta > límite de crédito genera un bloqueo de entrega.",
    "Los pedidos bloqueados aparecen en la lista de liberación del equipo de crédito (VKM3).",
    "El equipo de crédito puede liberar, rechazar o solicitar un aumento del límite.",
  ],
  question: "¿Qué área de control de crédito y categorías de riesgo aplican a la cartera de clientes de la UE frente a APAC?",
  process: "Ventas",
  subProcess: "Gestión de crédito",
  level: "task",
};

const SPEC_003: Spec = {
  id: "SPEC-003",
  title: "Contabilización Automática de Facturas de Proveedor mediante Cotejo a 3 Vías",
  module: "FI",
  type: "Funcional",
  fit: "Estándar + config. de tolerancia",
  custom: false,
  complexity: 3,
  effort: "7 JP",
  priority: "Media",
  source: "Las facturas de proveedor deberían contabilizarse automáticamente cuando el pedido, la entrada de mercancías y la factura coinciden.",
  description:
    "Habilitar la contabilización automática (sin intervención) de facturas en la Verificación de Facturas Logísticas. Cuando la factura coincide con el pedido y la entrada de mercancías dentro de una tolerancia del ±2 % o 50 €, el documento se contabiliza y se libera para pago sin revisión manual. Las facturas fuera de tolerancia se retienen y se dirigen a Cuentas por Pagar para su resolución.",
  objects: ["RBKP", "RSEG", "MIRO", "Claves de tolerancia (OMR6)", "MRBR"],
  acceptance: [
    "Las facturas dentro del ±2 % / 50 € del pedido + EM se contabilizan automáticamente.",
    "Las facturas fuera de tolerancia se retienen y se asignan a un gestor de CxP.",
    "Un registro diario lista todos los documentos autocontabilizados para auditoría.",
  ],
  question: "Confirmar la aprobación del responsable de tolerancias y si las desviaciones de flete/impuestos están en alcance.",
  process: "Cuentas por pagar",
  subProcess: "Verificación de facturas",
  level: "task",
};

const SPEC_004: Spec = {
  id: "SPEC-004",
  title: "Cuadro de Mando en Tiempo Real de Órdenes de Producción (App Fiori a Medida)",
  module: "ABAP",
  type: "Técnica",
  fit: "A medida (WRICEF)",
  custom: true,
  complexity: 4,
  effort: "15 JP",
  priority: "Media",
  source: "Los responsables de planta quieren un cuadro de mando Fiori en vivo de las órdenes de producción abiertas.",
  description:
    "Desarrollar un cuadro de mando Fiori (SAPUI5) a medida que muestre las órdenes de producción abiertas por centro, puesto de trabajo y estado, servido por un servicio OData en tiempo real sobre las tablas de PP. Incluye navegación al detalle de la orden y un indicador de retraso para las órdenes que han superado su fecha de fin programada.",
  objects: ["AUFK", "AFKO", "AFPO", "Vista CDS ZC_ProdOrder", "OData ZUI_PRODORD", "SAPUI5"],
  acceptance: [
    "El cuadro de mando lista las órdenes de producción abiertas filtradas por centro y puesto de trabajo.",
    "Los datos se actualizan en vivo vía OData (sin recarga manual).",
    "Las órdenes que superan la fecha de fin programada se resaltan como retrasadas.",
  ],
  question: "Confirmar el modelo de autorización: ¿los responsables ven todos los centros o solo el suyo?",
  process: "Producción",
  subProcess: "Cuadro de mando",
  level: "task",
};

export const greeting: Greeting = {
  kind: "text",
  text:
    "Hola — soy tu asistente de especificaciones a pie de proyecto. Cuéntame cada requisito que plantee el cliente con sus propias palabras y lo convertiré en una especificación técnica SAP clara. Empecemos por el primero.",
};

export const suggestions: Suggestion[] = [
  {
    label: "Elige un requisito que planteó el cliente",
    items: [
      { text: "Quieren que los pedidos de compra de más de 50.000 € se bloqueen hasta que los apruebe un responsable." },
      { text: "Los pedidos de ventas que superen el límite de crédito del cliente deberían detenerse." },
      { text: "Las facturas de proveedor deberían contabilizarse solas cuando todo coincide." },
    ],
  },
  {
    label: "Responde para afinar la especificación",
    items: [
      { text: "Por pedido de compra, y debería aplicar a todos los centros." },
      { text: "Por posición, solo el centro 1000." },
    ],
  },
  {
    label: "Siguiente requisito",
    items: [
      { text: "Necesitan una verificación del límite de crédito al introducir los pedidos de ventas." },
      { text: "Sáltatelo — dame una especificación de automatización de facturas." },
    ],
  },
  {
    label: "Responde para afinar la especificación",
    items: [
      { text: "Bloquea el pedido y dirígelo al equipo de crédito." },
      { text: "Solo avisa al comercial pero déjalo pasar." },
    ],
  },
  {
    label: "Siguiente requisito",
    items: [
      { text: "Las facturas de proveedor deberían contabilizarse solas tras un cotejo a 3 vías." },
      { text: "Finanzas quiere procesamiento de facturas sin intervención." },
    ],
  },
  {
    label: "Responde para afinar la especificación",
    items: [
      { text: "Autocontabilizar dentro del ±2 % o 50 €, si no, retenerla." },
      { text: "Solo coincidencia exacta — sin tolerancia." },
    ],
  },
  {
    label: "Siguiente requisito",
    items: [
      { text: "Los responsables de planta quieren un cuadro de mando Fiori en vivo de las órdenes de producción abiertas." },
      { text: "Pidieron un informe a medida sobre producción." },
    ],
  },
  {
    label: "Responde para afinar la especificación",
    items: [
      { text: "En tiempo real — debería actualizarse en vivo desde el backend." },
      { text: "Una actualización cada 5 minutos es suficiente." },
    ],
  },
  {
    label: "Has capturado cuatro especificaciones en MM, SD, FI y un desarrollo a medida",
    items: [
      { text: "Generar el documento de especificaciones", action: "export", accent: true },
    ],
  },
];

export const blocks: BlockItem[][] = [
  [
    {
      kind: "clarify",
      text:
        "Entendido — eso es una <em>estrategia de liberación</em> de compras en MM. Dos detalles rápidos para que la especificación sea precisa: ¿el umbral de 50.000 € aplica <b>por pedido de compra</b> o <b>por posición</b>, y debería cubrir <b>todos los centros</b>?",
    },
  ],
  [
    { kind: "spec", text: "Perfecto. Aquí tienes el borrador — échale un vistazo:", spec: SPEC_001 },
    { kind: "text", text: "Registrado como <code>SPEC-001</code>. ¿Cuál es el siguiente requisito que mencionó el cliente?" },
  ],
  [
    {
      kind: "clarify",
      text:
        "Eso es un requisito de <em>gestión de crédito</em> en SD. Cuando un pedido supera el límite, ¿debería <b>bloquearse del todo</b> y dirigirse al equipo de crédito, o solo <b>marcarse</b> como aviso?",
    },
  ],
  [
    { kind: "spec", text: "Tiene sentido para un fabricante con pedidos grandes. Redactado:", spec: SPEC_002 },
    { kind: "text", text: "Eso es <code>SPEC-002</code> — SD cubierto. Sigue planteándolos." },
  ],
  [
    {
      kind: "clarify",
      text:
        "Bien — automatización financiera. Para el cotejo a 3 vías, ¿qué desviación debería seguir <b>autocontabilizándose</b> sin que la revise una persona? Todo lo que exceda lo retenemos para CxP.",
    },
  ],
  [
    { kind: "spec", text: "Buena decisión mantener una tolerancia. Aquí está:", spec: SPEC_003 },
    { kind: "text", text: "<code>SPEC-003</code> hecho. Tres módulos cubiertos. ¿Algo más técnico — un desarrollo a medida o un informe?" },
  ],
  [
    {
      kind: "clarify",
      text:
        "Ese es una <em>app Fiori a medida</em> que extrae de PP — un objeto WRICEF. ¿El cuadro de mando necesita ser <b>en tiempo real</b> desde el backend, o es aceptable un breve <b>retardo de actualización</b>?",
    },
  ],
  [
    { kind: "spec", text: "Entendido — en tiempo real. Este es un desarrollo a medida:", spec: SPEC_004 },
    {
      kind: "wrap",
      text:
        "Son cuatro especificaciones bien formadas que cubren <b>MM, SD, FI</b> y un <b>desarrollo Fiori a medida</b> — con tres preguntas abiertas marcadas para seguimiento. ¿Quieres que prepare el documento de especificaciones para el cliente?",
    },
  ],
];

export const fallbackClarify: BlockItem = {
  kind: "clarify",
  text:
    "Anotado. Déjame asegurarme de capturarlo bien — ¿se trata de un proceso que el cliente quiere <b>cambiar</b>, o de una <b>nueva capacidad</b> que hoy le falta?",
};

export const UD: UDData = {
  MODULES,
  project,
  greeting,
  suggestions,
  blocks,
  fallbackClarify,
  specOrder: [SPEC_001, SPEC_002, SPEC_003, SPEC_004],
};
