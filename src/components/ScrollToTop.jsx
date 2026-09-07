import { useEffect } from 'react'
import { useLocation } from 'react-router'

// Restablece la posicion del desplazamiento al inicio de la pagina.
function ScrollToTop() {
    const { pathname } = useLocation()

    useEffect(() => {
        window.scrollTo(0, 0)
    }, [pathname])

    return null
}

export default ScrollToTop