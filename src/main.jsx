import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'

import App from './App.jsx'
import { UsuarioProvider } from './context/UsuarioProvider.jsx'
import { UsuarioProviderPrueba } from './context/UsuarioProviderPrueba.jsx'
import './index.css'

/*
 * El modo de prueba solamente estará activo cuando:
 * 1. Vite ejecute la aplicación en desarrollo.
 * 2. VITE_USAR_DATOS_SIMULADOS tenga el texto "true".
 *
 * Durante una compilación de producción,
 * import.meta.env.DEV siempre será false.
 */
const usarDatosSimulados =
  import.meta.env.DEV &&
  import.meta.env.VITE_USAR_DATOS_SIMULADOS ===
    'true'

/*
 * Seleccionamos el Provider antes de renderizar la aplicación.
 *
 * Ambos entregan la misma estructura mediante UsuarioContext,
 * por lo que Dashboard, Profile y ProtectedRoute no necesitan
 * saber cuál de ellos está funcionando.
 */
const ProveedorUsuario = usarDatosSimulados
  ? UsuarioProviderPrueba
  : UsuarioProvider


createRoot(
  document.getElementById('root'),
).render(
  <StrictMode>
    <BrowserRouter>
      {/*
       * Todos los componentes podrán acceder al mismo usuario.
       *
       * En desarrollo puede ser el usuario ficticio.
       * En producción siempre será el usuario real.
       */}
      <ProveedorUsuario>
        <App />
      </ProveedorUsuario>
    </BrowserRouter>
  </StrictMode>,
)