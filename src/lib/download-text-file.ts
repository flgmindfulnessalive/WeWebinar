// Descarga de texto plano vía Blob + <a download> temporal -- usado por
// Blueprint y el Playbook de recompensas. Nunca agrega una librería de
// PDF nueva solo para esto: el contenido es igual de útil como archivo
// de texto que se puede abrir en cualquier lado.
export function downloadTextFile(content: string, filename: string, mimeType = "text/markdown;charset=utf-8"): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
