// En una salida el estado de la moto es opcional: solo se guardan los elementos marcados.
// Devuelve null si no se marcó ninguno.
export function compactar(checks) {
  const marcados = Object.entries(checks).filter(([, v]) => v === true || v === false)
  return marcados.length ? Object.fromEntries(marcados) : null
}
