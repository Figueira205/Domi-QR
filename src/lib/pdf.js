import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ELEMENTOS, EMPRESA } from './config'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

const fmt = (iso) => new Date(iso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })

// Genera el checklist mensual de una moto con el formato del papel:
// una hoja por quincena (1-15 y 16-fin), columnas ✓ / X por día, más el listado de incidencias.
// `registros` = entradas y salidas de esa matrícula en ese mes. `mes` = 'YYYY-MM'.
export function generarPdfMensual({ registros, matricula, mes }) {
  const [anio, m] = mes.split('-').map(Number)
  const diasMes = new Date(anio, m, 0).getDate()
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const entradas = registros.filter((r) => r.tipo === 'entrada')

  // Último registro de entrada de cada día
  const porDia = {}
  for (const r of [...entradas].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    porDia[new Date(r.created_at).getDate()] = r
  }

  const quincenas = [[1, Math.min(15, diasMes)]]
  if (diasMes > 15) quincenas.push([16, diasMes])

  quincenas.forEach(([desde, hasta], idx) => {
    if (idx > 0) doc.addPage()
    cabecera(doc, matricula, `${MESES[m - 1]} ${anio}`, 'CHECKLIST DE REVISIÓN DIARIA')

    const dias = []
    for (let d = desde; d <= hasta; d++) dias.push(d)
    const head = [
      [{ content: 'Elemento', rowSpan: 2 }, ...dias.map((d) => ({ content: String(d), colSpan: 2 }))],
      dias.flatMap(() => ['✓', 'X']),
    ]
    // jsPDF (Helvetica) no dibuja ✓: usamos "OK" en la columna ✓ y "X" en la columna X
    head[1] = dias.flatMap(() => ['OK', 'X'])
    const body = ELEMENTOS.map((e) => [
      e.label,
      ...dias.flatMap((d) => {
        const v = porDia[d]?.checks?.[e.key]
        return [v === true ? 'OK' : '', v === false ? 'X' : '']
      }),
    ])
    autoTable(doc, {
      startY: 32,
      head,
      body,
      theme: 'grid',
      margin: { left: 8, right: 8 },
      styles: { fontSize: 7, cellPadding: 1.2, halign: 'center', lineColor: [60, 60, 60], lineWidth: 0.2, textColor: 20 },
      headStyles: { fillColor: [235, 235, 235], textColor: 20, fontStyle: 'bold' },
      columnStyles: { 0: { halign: 'left', cellWidth: 38, fontStyle: 'bold' } },
      didParseCell: (data) => {
        if (data.section === 'body' && data.cell.raw === 'X') data.cell.styles.textColor = [200, 16, 46]
      },
    })
    pie(doc, doc.lastAutoTable.finalY + 10)
  })

  // Listado de incidencias del mes (entrada y salida)
  const incidencias = registros.filter((r) => r.incidencia)
  doc.addPage()
  cabecera(doc, matricula, `${MESES[m - 1]} ${anio}`, 'REGISTRO DE INCIDENCIAS')
  if (incidencias.length === 0) {
    doc.setFontSize(10)
    doc.text('Sin incidencias registradas en este periodo.', 10, 36)
  } else {
    autoTable(doc, {
      startY: 32,
      head: [['Fecha', 'Momento', 'Incidencia detectada', 'Afecta a la seguridad', 'Actuación realizada', 'Responsable']],
      body: incidencias.map((r) => [
        fmt(r.created_at),
        r.tipo === 'entrada' ? 'Entrada' : 'Salida',
        r.incidencia,
        r.afecta_seguridad ? 'SÍ' : 'No',
        r.actuacion || '',
        r.conductor,
      ]),
      theme: 'grid',
      margin: { left: 8, right: 8 },
      styles: { fontSize: 8, cellPadding: 1.8, textColor: 20 },
      headStyles: { fillColor: [235, 235, 235], textColor: 20 },
    })
  }

  doc.save(`checklist_${matricula.replace(/\s+/g, '')}_${mes}.pdf`)
}

function cabecera(doc, matricula, mesTxt, titulo) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(EMPRESA, doc.internal.pageSize.getWidth() / 2, 10, { align: 'center' })
  doc.setTextColor(20)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(titulo, 8, 20)
  doc.setFontSize(10)
  doc.text(`Mes: ${mesTxt}`, 8, 27)
  doc.text(`Ciclomotor: ${matricula}`, 80, 27)
}

function pie(doc, y) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Fecha: ____________________   Ciclomotor: ____________________', 8, y)
  doc.text('Conductor: ____________________   Firma: ____________________', 8, y + 8)
  doc.setFontSize(8)
  doc.text('Nota: Cualquier incidencia que pueda comprometer el manejo o la seguridad deberá comunicarse al encargado de turno antes de utilizar el ciclomotor.', 8, y + 16)
}
