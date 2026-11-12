/* HTML de tablas APA 7.ª ed. para pegar en Word, y copia al portapapeles. */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function tablaApaHtml(numero: number, titulo: string, cabeceras: string[], filas: string[][], nota?: string): string {
  const base = "font-family:'Times New Roman',serif;font-size:12pt;padding:2pt 8pt;";
  const head = cabeceras
    .map((h, i) => `<th style="${base}border-top:1px solid #000;border-bottom:1px solid #000;font-weight:normal;text-align:${i ? "center" : "left"}">${esc(h)}</th>`)
    .join("");
  const body = filas
    .map(
      (f, r) =>
        `<tr>${f
          .map(
            (c, i) =>
              `<td style="${base}text-align:${i ? "center" : "left"};${r === filas.length - 1 ? "border-bottom:1px solid #000;" : ""}">${esc(c)}</td>`
          )
          .join("")}</tr>`
    )
    .join("");
  return (
    `<p style="${base}padding:0;margin:12pt 0 0"><b>Tabla ${numero}</b></p>` +
    `<p style="${base}padding:0;margin:0 0 6pt"><i>${esc(titulo)}</i></p>` +
    `<table style="border-collapse:collapse">${`<thead><tr>${head}</tr></thead>`}<tbody>${body}</tbody></table>` +
    (nota ? `<p style="${base}padding:0;margin:4pt 0 0"><i>Nota.</i> ${esc(nota)}</p>` : "")
  );
}

export async function copiarHtml(html: string, texto: string) {
  if (navigator.clipboard && "ClipboardItem" in window) {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([texto], { type: "text/plain" }),
      }),
    ]);
    return;
  }
  // Respaldo para navegadores sin Clipboard API (p. ej. HTTP sin TLS)
  const div = document.createElement("div");
  div.innerHTML = html;
  div.style.position = "fixed";
  div.style.left = "-9999px";
  document.body.appendChild(div);
  const rango = document.createRange();
  rango.selectNodeContents(div);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(rango);
  document.execCommand("copy");
  sel?.removeAllRanges();
  div.remove();
}
