// Roles reconocidos por ASEBEP.
export const ROL_BECARIO = 'Becario'

export const ROL_ADMIN_GENERAL = 'Admin General'

export const ROL_ADMIN_APORTACIONES = 'Admin Aportaciones'

export const ROL_ADMIN_HORAS = 'Admin Horas'

// Rutas principales de cada portal.
export const RUTA_PORTAL_PERSONAL = '/dashboard'

export const RUTAS_ADMINISTRATIVAS_POR_ROL =
  Object.freeze({
    [ROL_ADMIN_GENERAL]: '/admin-principal/dashboard',
    [ROL_ADMIN_APORTACIONES]: '/admin-aportaciones/dashboard',
    [ROL_ADMIN_HORAS]: '/admin-horas/dashboard',
  })

/*
* Relaciona todos los roles reconocidos con su destino
* inmediatamente despues del login.
*/
export const RUTAS_INICIALES_POR_ROL =
  Object.freeze({
    [ROL_BECARIO]:
      RUTA_PORTAL_PERSONAL,

    ...RUTAS_ADMINISTRATIVAS_POR_ROL,
  })

// Roles que pueden utilizar su portal personal.
export const ROLES_PORTAL_PERSONAL =
  Object.freeze([
    ROL_BECARIO,
    ROL_ADMIN_GENERAL,
    ROL_ADMIN_APORTACIONES,
    ROL_ADMIN_HORAS,
  ])

// Elimina espacios accidentales sin cambiar mayúsculas ni minúsculas del nombre oficial.
export function normalizarRol(rol) {
  return String(rol ?? '').trim()
}

// Devuelve la ruta inicial correspondiente al rol, si el rol es desconocido, devuelve null.
export function obtenerRutaInicialPorRol(rol) {
  const rolNormalizado = normalizarRol(rol)

  return (
    RUTAS_INICIALES_POR_ROL[
    rolNormalizado
    ] ?? null
  )
}

/* Devuelve exclusivamente el dashboard administrativo.
Un becario o rol desconocido obtiene null.
*/
export function obtenerRutaAdministrativaPorRol(
  rol,
) {
  const rolNormalizado = normalizarRol(rol)

  return (
    RUTAS_ADMINISTRATIVAS_POR_ROL[
    rolNormalizado
    ] ?? null
  )
}

// Comprueba si el rol pertenece al personal administrativo.
export function esRolAdministrativo(rol) {
  return Boolean(
    obtenerRutaAdministrativaPorRol(rol),
  )
}

/*
* Comprueba si el rol puede entrar al portal personal.
* Los administradores tambien son beneficiarios,
* por lo que pueden consultar sus propios datos.
*/
export function puedeAccederPortalPersonal(
  rol,
) {
  const rolNormalizado = normalizarRol(rol)

  return ROLES_PORTAL_PERSONAL.includes(
    rolNormalizado,
  )
}
