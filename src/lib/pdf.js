import { jsPDF } from 'jspdf'
import { ELEMENTOS, EMPRESA } from './config.js'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const W = 297
const H = 210
const GRIS = 125
const NEGRO = 25

// Rango de días de una quincena: 1 = del 1 al 15, 2 = del 16 al fin de mes.
export function rangoQuincena(mes, quincena) {
  const [anio, m] = mes.split('-').map(Number)
  const ultimo = new Date(anio, m, 0).getDate()
  return quincena === 1 ? [1, 15] : [16, ultimo]
}

// Estado de cada elemento por día: false si algún registro de entrada del día lo marcó mal,
// true si todos lo marcaron bien, null si ese día no hay registro.
function estadoPorDia(entradas) {
  const dias = {}
  for (const r of entradas) {
    const d = new Date(r.created_at).getDate()
    const dia = (dias[d] ??= {})
    for (const e of ELEMENTOS) {
      const v = r.checks?.[e.key]
      if (v === false) dia[e.key] = false
      else if (v === true && dia[e.key] !== false) dia[e.key] = true
    }
  }
  return dias
}

function cabecera(doc, y = 10) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(GRIS)
  doc.text(EMPRESA, W / 2, y, { align: 'center' })
  doc.setTextColor(NEGRO)
}

function marco(doc) {
  doc.setDrawColor(70)
  doc.setLineWidth(0.3)
  doc.rect(6, 7, W - 12, H - 14)
}

function titulo(doc, texto, x, y, ancho) {
  doc.setFont('helvetica', 'bolditalic')
  doc.setTextColor(70)
  let size = 12
  doc.setFontSize(size)
  size = (size * ancho) / doc.getTextWidth(texto)
  doc.setFontSize(size)
  doc.text(texto, x, y)
  doc.setTextColor(NEGRO)
}

function seccion(doc, texto, x, y) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(texto, x, y)
}

// Viñeta con ajuste de línea. Devuelve la y de la última línea escrita.
function vineta(doc, texto, x, y, ancho) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('•', x, y)
  const lineas = doc.splitTextToSize(texto, ancho)
  lineas.forEach((l, i) => doc.text(l, x + 3, y + i * 5))
  return y + (lineas.length - 1) * 5
}

function pagina1(doc) {
  cabecera(doc)
  titulo(doc, 'PROTOCOLO DE REVISIÓN DE CICLOMOTORES DE REPARTO – DOMINOS', 31, 25.5, 140)
  doc.setDrawColor(150)
  doc.setLineWidth(0.25)
  doc.line(31, 30, 268, 30)

  seccion(doc, '1. Revisión previa al inicio del servicio', 12, 46.5)
  const items = [
    'Neumáticos: presión, desgaste, cortes o deformaciones.',
    'Frenos: funcionamiento y respuesta adecuada.',
    'Dirección: ausencia de holguras o anomalías.',
    'Luces e intermitentes: funcionamiento correcto.',
    'Espejos retrovisores: colocación, estado y visibilidad.',
    'Claxon: funcionamiento.',
    'Acelerador: respuesta y retorno correcto.',
    'Nivel de combustible/batería: suficiente para el servicio.',
    'Caballete y elementos de sujeción: funcionamiento y estabilidad.',
    'Baúl o sistema de carga: correctamente cerrado y sujeto, sin riesgo de desprendimiento.',
    'Estado general: ausencia de daños o averías visibles que puedan afectar a la conducción.',
  ]
  items.forEach((t, i) => vineta(doc, t, 14, 56.5 + i * 8.7, 240))

  seccion(doc, '2. Registro de incidencias', 12, 153)
  vineta(doc, 'Toda anomalía detectada deberá registrarse indicando: fecha, ciclomotor, incidencia detectada, si afecta a la seguridad, actuación realizada y responsable.', 14, 162, 245)

  seccion(doc, '3. Criterio de actuación', 12, 176)
  vineta(doc, 'Incidencia leve: se registra y se comunica al gerente para su reparación cuando sea posible.', 14, 185, 240)
  vineta(doc, 'Incidencia que pueda afectar al manejo o a la seguridad: el ciclomotor no deberá utilizarse hasta su comprobación y/o reparación.', 14, 194, 240)
}

function casilla(doc, cx, cy, tipo) {
  const s = 2.4
  doc.setDrawColor(90)
  doc.setLineWidth(0.2)
  doc.rect(cx - s / 2, cy - s / 2, s, s)
  if (!tipo) return
  doc.setDrawColor(NEGRO)
  doc.setLineWidth(0.5)
  if (tipo === 'ok') {
    doc.lines([[0.8, 0.9], [1.5, -2.2]], cx - 1.0, cy + 0.1)
  } else {
    doc.line(cx - 0.9, cy - 0.9, cx + 0.9, cy + 0.9)
    doc.line(cx - 0.9, cy + 0.9, cx + 0.9, cy - 0.9)
  }
}

function pagina2(doc, { mesTxt, dias, estado }) {
  doc.addPage()
  cabecera(doc, 17)
  marco(doc)

  vineta(doc, 'Avería durante el servicio: detener el vehículo en un lugar seguro, comunicar la incidencia al encargado de turno y solicitar las instrucciones correspondientes.', 20, 27, 245)
  seccion(doc, '4. Responsabilidades', 18, 40)
  vineta(doc, 'El conductor será responsable de realizar la revisión previa y comunicar cualquier anomalía.', 20, 49, 245)
  vineta(doc, 'El responsable de la turno/gerente deberá valorar las incidencias, asegurar su reparación y determinar cuándo el ciclomotor vuelve a estar disponible para el servicio.', 20, 58, 245)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('CHECKLIST DE REVISIÓN DIARIA', 18, 85)

  // Geometría de la tabla
  const x0 = 18
  const xLabel = 34
  const total = 215
  const n = dias.length
  const wDia = total / n
  const wCol = wDia / 2
  const y0 = 91
  const altos = [5.5, 6.5, 6, 5.8, 5.8, 9.6, 9.6, 5.6, 5.6, 9.6, 5.6, 14.5, 10.5]
  const yTop = altos.map((_, i) => y0 + altos.slice(0, i).reduce((a, b) => a + b, 0))
  const yFin = yTop[yTop.length - 1] + altos[altos.length - 1]
  const xFin = x0 + xLabel + total

  doc.setDrawColor(40)
  doc.setLineWidth(0.35)
  // contorno y líneas horizontales
  doc.rect(x0, y0, xLabel + total, yFin - y0)
  yTop.slice(1).forEach((y) => doc.line(x0, y, xFin, y))
  // verticales: etiqueta + días (línea gruesa entre días, fina entre ✓ y X)
  doc.line(x0 + xLabel, y0, x0 + xLabel, yFin)
  for (let i = 0; i < n; i++) {
    const xd = x0 + xLabel + i * wDia
    doc.setLineWidth(0.35)
    if (i > 0) doc.line(xd, y0, xd, yFin)
    doc.setLineWidth(0.15)
    doc.line(xd + wCol, y0 + altos[0], xd + wCol, yFin)
  }

  // Cabecera: Mes + números de día
  doc.setLineWidth(0.35)
  doc.setTextColor(NEGRO)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.text(`Mes: ${mesTxt}`, x0 + 1.5, y0 + 3.9)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  dias.forEach((d, i) => {
    const xd = x0 + xLabel + i * wDia
    doc.text(String(d), xd + wDia / 2, y0 + 3.8, { align: 'center' })
  })
  // Segunda fila: Elemento + ✓ / X
  const yh = yTop[1]
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.text('Elemento', x0 + 1.5, yh + 4.5)
  dias.forEach((d, i) => {
    const xd = x0 + xLabel + i * wDia
    const cy = yh + altos[1] / 2
    doc.setDrawColor(NEGRO)
    doc.setLineWidth(0.3)
    doc.lines([[0.9, 1.0], [1.6, -2.4]], xd + wCol / 2 - 1.2, cy + 0.2)
    doc.setFontSize(8.5)
    doc.text('X', xd + wCol + wCol / 2, cy + 1.1, { align: 'center' })
  })

  // Filas de elementos
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  ELEMENTOS.forEach((e, r) => {
    const top = yTop[r + 2]
    const alto = altos[r + 2]
    const lineas = doc.splitTextToSize(e.label, xLabel - 3)
    const bloque = lineas.length * 4.2
    lineas.forEach((l, k) => doc.text(l, x0 + 1.5, top + (alto - bloque) / 2 + 3.3 + k * 4.2))
    const cy = top + alto / 2
    dias.forEach((d, i) => {
      const xd = x0 + xLabel + i * wDia
      const v = estado[d]?.[e.key]
      casilla(doc, xd + wCol / 2, cy, v === true ? 'ok' : null)
      casilla(doc, xd + wCol + wCol / 2, cy, v === false ? 'mal' : null)
    })
  })
}

function pagina3(doc, { fecha, matricula, conductores }) {
  doc.addPage()
  cabecera(doc, 17)
  marco(doc)
  doc.setFontSize(10.5)
  const campo = (etq, valor, x, y, largo) => {
    doc.setFont('helvetica', 'bold')
    doc.text(etq, x, y)
    const wEtq = doc.getTextWidth(etq) + 2
    doc.setDrawColor(40)
    doc.setLineWidth(0.25)
    doc.line(x + wEtq, y + 1.2, x + wEtq + largo, y + 1.2)
    if (valor) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      doc.text(doc.splitTextToSize(valor, largo - 2)[0], x + wEtq + 1, y)
      doc.setFontSize(10.5)
    }
  }
  campo('Fecha:', fecha, 16, 32, 58)
  campo('Ciclomotor:', matricula, 100, 33.5, 58)
  campo('Conductor:', conductores, 16, 42, 58)
  campo('Firma:', '', 100, 43.5, 58)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Nota:', 16, 58)
  doc.setFont('helvetica', 'normal')
  doc.text('Cualquier incidencia que pueda comprometer el manejo o la seguridad deberá comunicarse al encargado de turno antes de utilizar el ciclomotor.', 16 + doc.getTextWidth('Nota: ') + 0.5, 58)
}

// Construye el informe quincenal: por cada ciclomotor con registros, las 3 hojas del formato oficial.
// `registros`: filas de la tabla registros (solo se usan las de tipo "entrada").
export function construirInformeQuincenal({ registros, mes, quincena }) {
  const [anio, m] = mes.split('-').map(Number)
  const dias = []
  const [d1, d2] = rangoQuincena(mes, quincena)
  for (let d = d1; d <= d2; d++) dias.push(d)

  const porMatricula = new Map()
  for (const r of registros) {
    if (r.tipo !== 'entrada') continue
    if (!porMatricula.has(r.matricula)) porMatricula.set(r.matricula, [])
    porMatricula.get(r.matricula).push(r)
  }
  if (porMatricula.size === 0) return null

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const mesTxt = `${MESES[m - 1]} ${anio}`
  const fecha = `del ${d1} al ${d2} de ${MESES[m - 1]} de ${anio}`
  let primera = true
  for (const [matricula, entradas] of [...porMatricula].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (!primera) doc.addPage()
    primera = false
    pagina1(doc)
    pagina2(doc, { mesTxt, dias, estado: estadoPorDia(entradas) })
    const conductores = [...new Set(entradas.map((r) => r.conductor))].join(', ')
    pagina3(doc, { fecha, matricula, conductores })
  }
  return doc
}

export function generarInformeQuincenal(opts) {
  const doc = construirInformeQuincenal(opts)
  if (!doc) return false
  doc.save(`informe_${opts.mes}_quincena${opts.quincena}.pdf`)
  return true
}
