// Centraliza umbrales y configuración del Launchpad -- ningún componente
// debe hardcodear estos valores por su cuenta (sección 20/26 del brief).

// Umbral para marcar el video de implementación como visto y la demo como
// completada -- ver módulos 5 y 6 del brief (todavía no construidos en
// este slice, pero centralizados desde ya para que esos módulos futuros
// los lean de acá en vez de inventar su propio número).
export const IMPLEMENTATION_VIDEO_COMPLETION_THRESHOLD = 0.8;
export const DEMO_COMPLETION_THRESHOLD = 0.9;

// Cuando está seteada, el botón "Descargar Playbook" abre este archivo
// real en vez de generar un Markdown a partir de las strings de i18n.
// Configurable por variable de entorno para poder reemplazar el archivo
// sin un deploy de código; el valor por defecto es el PDF real entregado.
export const LAUNCHPAD_PLAYBOOK_URL: string | null =
  process.env.LAUNCHPAD_PLAYBOOK_URL ??
  "https://drive.google.com/file/d/1LzMRDD4uT-lOEIkcewB9PFb6N7xmDVsW/view?usp=drive_link";

// Descuento de finalización (módulo 16) -- porcentaje fijo, sin contador
// falso ni vencimiento salvo el que efectivamente se calcule server-side
// al desbloquear el reward.
export const COMPLETION_DISCOUNT_PERCENTAGE = 10;
export const COMPLETION_DISCOUNT_MONTHLY_DURATION_MONTHS = 3;
