import { jsPDF } from 'jspdf'
import { ELEMENTOS } from './config.js'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

// Resume los registros de un empleado por día del mes.
// estado[dia][elemento] = true (Bien) | false (Mal) ; entrada[dia] / salida[dia] = nombre
export function resumirMes(registros) {
  const estado = {}
  const entrada = {}
  const salida = {}
  const ordenados = [...registros].sort((a, b) => a.created_at.localeCompare(b.created_at))
  for (const r of ordenados) {
    const d = new Date(r.created_at).getDate()
    if (r.tipo === 'entrada') {
      entrada[d] ??= r.conductor
      const dia = (estado[d] ??= {})
      for (const e of ELEMENTOS) {
        const v = r.checks?.[e.key]
        if (v === false) dia[e.key] = false
        else if (v === true && dia[e.key] !== false) dia[e.key] = true
      }
    } else if (r.tipo === 'salida') {
      salida[d] = r.conductor // la última salida del día
    }
  }
  return { estado, entrada, salida }
}

function tick(doc, cx, cy, s) {
  doc.lines([[s * 0.35, s * 0.4], [s * 0.65, -s * 1.0]], cx - s * 0.5, cy + s * 0.05)
}
function cruz(doc, cx, cy, s) {
  doc.line(cx - s * 0.45, cy - s * 0.45, cx + s * 0.45, cy + s * 0.45)
  doc.line(cx - s * 0.45, cy + s * 0.45, cx + s * 0.45, cy - s * 0.45)
}

// Texto girado 90º en sentido horario (se lee de arriba abajo), centrado en el ancho `w` de la celda.
function textoVertical(doc, texto, xCelda, w, yInicio, size) {
  doc.setFontSize(size)
  const alto = size * 0.3528 * 0.72
  doc.text(texto, xCelda + w / 2 - alto / 2, yInicio, { angle: -90 })
}

// Hoja mensual de un empleado (A4 vertical), formato del checklist de revisión diaria.
export function construirHojaMensual({ registros, mes, conductor }) {
  const [anio, m] = mes.split('-').map(Number)
  const diasMes = new Date(anio, m, 0).getDate()
  const { estado, entrada, salida } = resumirMes(registros)

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  doc.setTextColor(20)
  doc.setDrawColor(20)

  // Geometría
  const x0 = 9
  const y0 = 18.6
  const hHead = 51.6
  const rowH = 6.52
  const colW = 6.13
  const nCols = 12 // 11 elementos + columna "Elemento:"
  const wDia = 7.0
  const xDia = x0 + nCols * colW
  const xFin = xDia + wDia
  const yBody = y0 + hHead
  const yFin = yBody + 31 * rowH

  // Cuadrícula fina
  doc.setLineWidth(0.25)
  for (let i = 1; i <= nCols; i++) doc.line(x0 + i * colW, y0, x0 + i * colW, yFin)
  for (let r = 1; r <= 31; r++) doc.line(x0, yBody + r * rowH, xFin, yBody + r * rowH)
  // Contorno y separación de cabecera, más gruesos
  doc.setLineWidth(0.7)
  doc.rect(x0, y0, xFin - x0, yFin - y0)
  doc.line(x0, yBody, xFin, yBody)

  // Cabecera: de izquierda a derecha, Estado general … Neumáticos, Elemento:, Mes
  doc.setFont('helvetica', 'normal')
  const nombres = [...ELEMENTOS].reverse().map((e) => e.etiquetaHoja ?? e.label)
  nombres.forEach((n, i) => textoVertical(doc, n, x0 + i * colW, colW, y0 + 1.5, 9.5))
  textoVertical(doc, 'Elemento:', x0 + 11 * colW, colW, y0 + 1.5, 9.5)
  textoVertical(doc, `Mes: ${cap(MESES[m - 1])} ${anio}`, xDia, wDia, y0 + 1.5, 9.5)

  // Números de día (también girados) y marcas ✓ / X
  for (let d = 1; d <= 31; d++) {
    const cy = yBody + (d - 0.5) * rowH
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    const t = String(d)
    doc.text(t, xDia + wDia / 2 - 1.2, cy - doc.getTextWidth(t) / 2, { angle: -90 })
    if (d > diasMes) continue
    ELEMENTOS.forEach((e, k) => {
      const v = estado[d]?.[e.key]
      if (v === undefined) return
      const col = 10 - k // columnas en orden inverso
      const cx = x0 + (col + 0.5) * colW
      doc.setLineWidth(0.5)
      doc.setDrawColor(20)
      if (v === true) tick(doc, cx, cy, 3.0)
      else cruz(doc, cx, cy, 3.0)
    })
  }

  // Bloques de firma (a la derecha): nombre del empleado cuando fichó la entrada / la salida
  const bloques = [
    { x: 91.3, w: 49, titulo: 'FIRMA 1: • Al inicio de turno', nombres: entrada },
    { x: 146, w: 49.6, titulo: 'FIRMA 2: • Al final del turno', nombres: salida },
  ]
  for (const b of bloques) {
    doc.setLineWidth(0.5)
    doc.setDrawColor(20)
    doc.line(b.x, y0 - 0.8, b.x, yBody)
    doc.line(b.x, yBody, b.x + b.w, yBody)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.text(b.titulo, b.x + 1.5, 44.5)
    doc.setLineWidth(0.25)
    doc.setDrawColor(70)
    for (let d = 1; d <= 31; d++) {
      const y = yBody + d * rowH
      doc.line(b.x + 1, y, b.x + b.w, y)
      const nombre = d <= diasMes ? b.nombres[d] : null
      if (nombre) {
        doc.setFontSize(9.5)
        doc.text(nombre, b.x + 3, y - 1.6)
      }
    }
    doc.setDrawColor(20)
  }

  // Título girado en el borde derecho
  doc.setFont('helvetica', 'normal')
  let size = 12
  doc.setFontSize(size)
  const titulo = 'CHECKLIST DE REVISIÓN DIARIA'
  size = (size * 58.8) / doc.getTextWidth(titulo)
  doc.setFontSize(size)
  doc.text(titulo, 202.5, 145 - 29.4, { angle: -90 })

  // Leyenda: ✓ Bien / X Mal
  doc.setFillColor(20, 20, 20)
  doc.rect(46, 277, 13, 7.4, 'F')
  doc.setDrawColor(255)
  doc.setLineWidth(0.5)
  tick(doc, 56.2, 280.7, 3.2)
  cruz(doc, 49.6, 280.7, 3.0)
  doc.setDrawColor(20)
  doc.setFontSize(9.5)
  doc.setTextColor(20)
  doc.text('Bien', 55.2, 286, { angle: -90 })
  doc.text('Mal', 48.6, 286, { angle: -90 })

  return doc
}

export function generarHojaMensual(opts) {
  const doc = construirHojaMensual(opts)
  doc.save(`checklist_${opts.conductor.replace(/\s+/g, '_')}_${opts.mes}.pdf`)
}
