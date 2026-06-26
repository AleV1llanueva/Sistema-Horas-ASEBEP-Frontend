/* LOGIN ASEBEP - CONSUMO API REST CON FETCH */

const API_BASE_URL = "https://asebepunah.com/usuario";

const loginForm = document.getElementById("loginForm");
const accountNumberInput = document.getElementById("accountNumber");
const loginAlert = document.getElementById("loginAlert");
const loginButton = document.querySelector(".login-button");


/* Muestra mensajes de error dentro de la tarjeta */
function showLoginAlert(message) {
    if (!loginAlert) return;

    loginAlert.textContent = message;
    loginAlert.classList.add("show");
}


/* Oculta la alerta cuando el usuario vuelve a intentar */
function hideLoginAlert() {
    if (!loginAlert) return;

    loginAlert.classList.remove("show");
}


/* Cambia el estado visual del botón mientras se consulta la API */
function setLoadingState(isLoading) {
    if (!loginButton) return;

    if (isLoading) {
        loginButton.textContent = "Validando acceso...";
        loginButton.disabled = true;
        return;
    }

    loginButton.textContent = "Entrar al sistema";
    loginButton.disabled = false;
}


/* Validación básica antes de consultar la API */
function validateAccountNumber(accountNumber) {
    const ACCOUNT_NUMBER_LENGHT = 11;

    if (!accountNumber) {
        return "Ingresa tu número de cuenta para continuar.";
    }

    if (!/^\d+$/.test(accountNumber)) {
        return "El número de cuenta debe contener únicamente números.";
    }

    if (accountNumber.length < ACCOUNT_NUMBER_LENGHT) {
        return "Ingresa tu número de cuenta completo.";
    }

    if (accountNumber.length > ACCOUNT_NUMBER_LENGHT) {
        return "Ingresa tu número de cuenta de manera correcta.";
    }

    return null;
}


/* Extrae un mensaje entendible si la API devuelve un error */
function getApiErrorMessage(data) {
    if (!data || !data.detail) {
        return null;
    }

    if (typeof data.detail === "string") {
        return data.detail;
    }

    return "La API devolvió un error de validación.";
}


/* Consulta la API usando GET /usuario/{num_cuenta} */
async function loginWithAccountNumber(accountNumber) {
    const endpoint = `${API_BASE_URL}/${encodeURIComponent(accountNumber)}`;

    let response;

    try {
        response = await fetch(endpoint, {
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        });
    } catch (error) {
        throw new Error("No se pudo conectar con la API. Intenta nuevamente más tarde.");
    }

    let data = null;

    try {
        data = await response.json();
    } catch (error) {
        data = null;
    }

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error("No se encontró un becario con ese número de cuenta.");
        }

        if (response.status === 403) {
            throw new Error("El usuario no tiene permiso para acceder al sistema.");
        }

        if (response.status === 422) {
            throw new Error("El número de cuenta no tiene el formato esperado por la API.");
        }

        if (response.status === 500) {
            throw new Error("La API respondió con un error interno. Intenta más tarde.");
        }

        throw new Error(getApiErrorMessage(data) || "No se pudo validar el acceso.");
    }

    if (!data) {
        throw new Error("La API respondió correctamente, pero no devolvió datos.");
    }

    return data;
}


/* Revisión mínima de la respuesta recibida */
function validateUserData(userData) {
    if (!userData.credenciales) {
        throw new Error("La respuesta de la API no contiene credenciales.");
    }

    if (!userData.datos_personales) {
        throw new Error("La respuesta de la API no contiene datos personales.");
    }

    if (!userData.datos_becario) {
        throw new Error("La respuesta de la API no contiene datos del becario.");
    }

    if (userData.credenciales.active === false) {
        throw new Error("La cuenta existe, pero no se encuentra activa.");
    }
}


/* Guarda temporalmente los datos para el dashboard provisional */
function saveUserSession(userData) {
    localStorage.setItem("asebepUser", JSON.stringify(userData));
    localStorage.setItem("asebepLoggedIn", "true");
    localStorage.setItem("asebepLoginTime", new Date().toISOString());
}


/* Redirige al dashboard provisional */
function redirectToDashboard() {
    window.location.href = "dashboard-provisional.html";
}


/* Evento principal del formulario */
if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        hideLoginAlert();

        const accountNumber = accountNumberInput.value.trim();
        const validationError = validateAccountNumber(accountNumber);

        if (validationError) {
            showLoginAlert(validationError);
            return;
        }

        let loginSucceeded = false;

        try {
            setLoadingState(true);

            const userData = await loginWithAccountNumber(accountNumber);

            validateUserData(userData);
            saveUserSession(userData);

            loginSucceeded = true;
            loginButton.textContent = "Acceso concedido...";

            setTimeout(() => {
                redirectToDashboard();
            }, 500);

        } catch (error) {
            console.error("Error durante el login:", error);
            showLoginAlert(error.message || "No se pudo iniciar sesión.");

        } finally {
            if (!loginSucceeded) {
                setLoadingState(false);
            }
        }
    });
}