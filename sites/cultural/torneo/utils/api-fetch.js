/*
 * Archivo: api-fetch.js
 * Utilidades para la obtención de datos de APIs externas con reintentos (backoff).
 */

/**
 * Función genérica para obtener datos con reintentos.
 * @param {string} url - URL de la API.
 * @param {number} retries - Número de reintentos.
 * @param {number} delay - Retraso inicial en ms.
 * @returns {Promise<any>}
 */
export const fetchWithBackoff = async (url, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            if (i < retries - 1) {
                // Espera exponencial antes del reintento
                await new Promise(resolve => setTimeout(resolve, delay * (2 ** i)));
            } else {
                throw error;
            }
        }
    }
};
