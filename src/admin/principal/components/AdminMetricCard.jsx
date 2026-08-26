function normalizarPorcentaje(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ''
  ) {
    return null
  }

  const porcentaje = Number(valor)

  if (!Number.isFinite(porcentaje)) {
    return null
  }

  return Math.min(
    100,
    Math.max(
      0,
      Math.round(porcentaje),
    ),
  )
}

function AdminMetricCard({
  titulo,
  valor,
  icono: Icono,
  variante = 'actividades',
  porcentaje,
}) {
  const porcentajeNormalizado =
    normalizarPorcentaje(porcentaje)

  const mostrarPorcentaje =
    porcentajeNormalizado !== null

  const estadoPorcentaje = porcentajeNormalizado === 100
    ? 'completo'
    : porcentajeNormalizado >= 51
    ? 'medio'
    : 'bajo'

  const etiquetaAccesible =
    mostrarPorcentaje
      ? `${titulo}: ${valor}. ${porcentajeNormalizado}% pendiente de aprobación.`
      : `${titulo}: ${valor}`

  return (
    <article
      className={
        'admin-metric-card ' +
        `admin-metric-card--${variante}`
      }
      aria-label={etiquetaAccesible}
    >
      <span
        className="admin-metric-card__icon"
        aria-hidden="true"
      >
        <Icono />
      </span>

      <div className="admin-metric-card__content">
        <span className="admin-metric-card__title">
          {titulo}
        </span>

        <strong className="admin-metric-card__value">
          {valor}
        </strong>
      </div>

      {mostrarPorcentaje && (
        <span
          className={
            'admin-metric-card__progress ' +
            `admin-metric-card__progress--${estadoPorcentaje}`
          }
          style={{
            '--admin-progress-angle':
              `${porcentajeNormalizado * 3.6}deg`,
          }}
          aria-hidden="true"
        >
          <span>
            {porcentajeNormalizado}%
          </span>
        </span>
      )}
    </article>
  )
}

export default AdminMetricCard