import {
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

/*
 * Cantidad máxima de números visibles alrededor de la página actual.
 * Al sumar los dos extremos y las elipsis, la barra nunca supera
 * siete controles, sin importar cuántas páginas existan.
 */
const PAGINAS_VECINAS = 1

const MAXIMO_BOTONES = PAGINAS_VECINAS * 2 + 5

/*
 * Construye la ventana de páginas visible.
 *
 * Ejemplo con totalPaginas = 40 y paginaActual = 20:
 * [1, 'inicio', 19, 20, 21, 'fin', 40]
 *
 * El valor 'inicio' y 'fin' representan las elipsis. Se usan cadenas
 * para distinguirlas de los números y poder generar una clave estable.
 */
function calcularPaginasVisibles(
  paginaActual,
  totalPaginas,
) {
  if (totalPaginas <= MAXIMO_BOTONES) {
    return Array.from(
      {
        length: totalPaginas,
      },
      (_, indice) => indice + 1,
    )
  }

  const inicio =
    Math.max(
      2,
      Math.min(
        paginaActual - PAGINAS_VECINAS,
        totalPaginas - PAGINAS_VECINAS * 2 - 2,
      ),
    )

  const fin =
    Math.min(
      totalPaginas - 1,
      Math.max(
        paginaActual + PAGINAS_VECINAS,
        PAGINAS_VECINAS * 2 + 3,
      ),
    )

  const paginas = [1]

  if (inicio > 2) {
    paginas.push('inicio')
  }

  for (
    let pagina = inicio;
    pagina <= fin;
    pagina += 1
  ) {
    paginas.push(pagina)
  }

  if (fin < totalPaginas - 1) {
    paginas.push('fin')
  }

  paginas.push(totalPaginas)

  return paginas
}

function AdminPagination({
  paginaActual,
  totalPaginas,
  cambiarPagina,
  etiqueta = 'Paginación',
}) {
  if (totalPaginas <= 1) {
    return null
  }

  const paginas =
    calcularPaginasVisibles(
      paginaActual,
      totalPaginas,
    )

  const paginaAnterior =
    paginaActual - 1

  const paginaSiguiente =
    paginaActual + 1

  return (
    <nav
      className="admin-pagination"
      aria-label={etiqueta}
    >
      <button
        className="admin-pagination__step"
        type="button"
        disabled={paginaActual === 1}
        aria-label="Ir a la página anterior"
        onClick={() =>
          cambiarPagina(paginaAnterior)
        }
      >
        <ChevronLeft aria-hidden="true" />

        <span className="admin-pagination__step-text">
          Anterior
        </span>
      </button>

      {/* Numeración para tabletas y computadoras. */}
      <div className="admin-pagination__pages">
        {paginas.map((pagina) =>
          typeof pagina === 'number' ? (
            <button
              key={pagina}
              className={
                pagina === paginaActual
                  ? 'admin-pagination__page admin-pagination__page--active'
                  : 'admin-pagination__page'
              }
              type="button"
              aria-current={
                pagina === paginaActual
                  ? 'page'
                  : undefined
              }
              aria-label={
                `Ir a la página ${pagina}`
              }
              onClick={() =>
                cambiarPagina(pagina)
              }
            >
              {pagina}
            </button>
          ) : (
            /*
             * La elipsis es decorativa: cada botón ya tiene su
             * etiqueta numérica, así que se oculta a lectores.
             */
            <span
              key={pagina}
              className="admin-pagination__ellipsis"
              aria-hidden="true"
            >
              …
            </span>
          ),
        )}
      </div>

      {/* En celular el número se sustituye por el resumen textual. */}
      <p className="admin-pagination__summary">
        Página {paginaActual} de {totalPaginas}
      </p>

      <button
        className="admin-pagination__step"
        type="button"
        disabled={paginaActual === totalPaginas}
        aria-label="Ir a la página siguiente"
        onClick={() =>
          cambiarPagina(paginaSiguiente)
        }
      >
        <span className="admin-pagination__step-text">
          Siguiente
        </span>

        <ChevronRight aria-hidden="true" />
      </button>
    </nav>
  )
}

export default AdminPagination
