// ============================================================
//  Utilidades de exportación: Excel (CSV) y PDF.
//  Las librerías de PDF se cargan de forma diferida (dynamic import)
//  para no aumentar el bundle inicial ni romper el render en servidor.
// ============================================================

export type ColumnaExport<T> = {
  header: string;
  /** Devuelve el valor de la celda para una fila. */
  valor: (fila: T) => string | number | null | undefined;
};

function nombreConFecha(base: string): string {
  const hoy = new Date().toISOString().slice(0, 10);
  return `${base}_${hoy}`;
}

function descargarBlob(blob: Blob, nombreArchivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exporta a CSV compatible con Excel (separador ";" y BOM UTF-8
 * para que los acentos y la "ñ" se vean correctamente).
 */
export function exportarExcel<T>(
  base: string,
  columnas: ColumnaExport<T>[],
  filas: T[]
) {
  const escapar = (v: string | number | null | undefined) => {
    const texto = v === null || v === undefined ? "" : String(v);
    if (/[;"\n]/.test(texto)) {
      return `"${texto.replace(/"/g, '""')}"`;
    }
    return texto;
  };

  const encabezado = columnas.map((c) => escapar(c.header)).join(";");
  const cuerpo = filas
    .map((fila) => columnas.map((c) => escapar(c.valor(fila))).join(";"))
    .join("\n");

  const contenido = "﻿" + encabezado + "\n" + cuerpo;
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
  descargarBlob(blob, `${nombreConFecha(base)}.csv`);
}

/**
 * Exporta a PDF con una tabla formateada (jsPDF + autotable).
 */
export async function exportarPDF<T>(
  base: string,
  titulo: string,
  columnas: ColumnaExport<T>[],
  filas: T[]
) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.setTextColor(21, 128, 61); // green-700
  doc.text(titulo, 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    `Generado: ${new Date().toLocaleDateString("es-PE")}  ·  ${filas.length} registro(s)`,
    14,
    25
  );

  autoTable(doc, {
    startY: 30,
    head: [columnas.map((c) => c.header)],
    body: filas.map((fila) =>
      columnas.map((c) => {
        const v = c.valor(fila);
        return v === null || v === undefined ? "" : String(v);
      })
    ),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [21, 128, 61], textColor: 255 },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${nombreConFecha(base)}.pdf`);
}
