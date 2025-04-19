import { OAuth2Client } from 'google-auth-library'
import process from 'process'
import fetch from 'node-fetch'

// Cliente OAuth para verificar tokens de Google
const client = new OAuth2Client()

/**
 * Verifica un token de Google y devuelve la información del usuario
 * @param {Object} tokenData - Puede contener credential (ID token) o access_token
 * @returns {Promise<Object>} - Información del usuario (email, name, picture)
 */
export const verifyGoogleToken = async (tokenData) => {
  const { credential } = tokenData

  if (!credential) {
    throw new Error('Se requiere un id_token de Google')
  }

  // Validar que el token sea un JWT (tres segmentos separados por puntos)
  if (credential.split('.').length !== 3) {
    throw new Error('El token proporcionado no es un JWT válido')
  }

  try {
    // Verificar el id_token de Google
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    })

    const payload = ticket.getPayload()

    return {
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      picture: payload.picture,
      googleId: payload.sub // ID único de Google
    }
  } catch (error) {
    console.error('Error verificando token de Google:', error)
    throw error
  }
}

// Actualizar para manejar el intercambio de authorization_code por id_token
export const exchangeCodeForIdToken = async (code) => {
  const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_SECRET_ID,
        redirect_uri: 'postmessage', // Usar "postmessage" para aplicaciones de cliente
        grant_type: 'authorization_code'
      })
    })

    if (!response.ok) {
      throw new Error('Error al intercambiar el código por un token')
    }

    const data = await response.json()
    return data.id_token
  } catch (error) {
    console.error('Error al intercambiar el código por un id_token:', error)
    throw error
  }
}
