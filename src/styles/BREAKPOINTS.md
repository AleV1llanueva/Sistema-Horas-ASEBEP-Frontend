# Puntos de quiebre

El CSS existente usa unos 55 anchos distintos. No hace falta migrarlo todo.
**Todo CSS nuevo usa solo estos cuatro puntos:**

| Ancho | Qué representa |
|---|---|
| `560px` | Teléfono |
| `760px` | Teléfono grande / tablet vertical |
| `1024px` | Tablet horizontal / laptop pequeña |
| `1180px` | Escritorio |

## Reglas

- El uso principal es **celular**: escribe primero el diseño sin `@media`.
- Usa `max-width` (o `width <=`), nunca mezcles ambas sintaxis en un archivo nuevo.
- Las tablas de administración se convierten en tarjetas en `560px`:
  pon `data-label` en cada `td` y oculta `thead` con `clip-path`.
- Inputs, `select` y `textarea` nunca bajan de `1rem` en `560px`:
  iOS hace zoom al enfocarlos por debajo de 16px.
- Botones con solo un icono miden al menos `44x44px` en `560px` (WCAG 2.5.8).

Los puntos de quiebre antiguos se pueden borrar al tocar cada archivo; no cambies
el layout de una pantalla solo para cumplir esta tabla.
