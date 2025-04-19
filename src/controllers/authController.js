import { PrismaClient } from '@prisma/client'
import { hashPassword, generateToken } from '../utils/auth.js'
import { verifyGoogleToken } from '../utils/googleAuth.js'
import { exchangeCodeForIdToken } from '../utils/googleAuth.js'

const prisma = new PrismaClient()

// Eliminar funciones de registro e inicio de sesión por email/contraseña
export const register = (req, res) => res.status(404).json({ error: 'Método no soportado' })
export const login = (req, res) => res.status(404).json({ error: 'Método no soportado' })

// Obtener perfil del usuario
export const getProfile = async (req, res) => {
  try {
    const user = await prisma.$queryRaw`SELECT id, email FROM "User" WHERE id = ${req.user.id} LIMIT 1`

    if (!user || user.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    res.status(200).json(user[0])
  } catch (error) {
    console.error('Error al obtener perfil:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// Actualizar el controlador para manejar el intercambio de código por id_token
export const googleAuth = async (req, res) => {
  try {
    let idToken

    if (req.body.code) {
      // Intercambiar el código por un id_token
      idToken = await exchangeCodeForIdToken(req.body.code)
    } else if (req.body.credential) {
      // Usar directamente el id_token si está disponible
      idToken = req.body.credential
    } else {
      return res.status(400).json({ error: 'Se requiere un código o id_token de Google' })
    }

    // Verificar el id_token de Google
    const { email, name, googleId } = await verifyGoogleToken({ credential: idToken })

    // Buscar si el usuario ya existe
    let user = await prisma.$queryRaw`SELECT id, email, name, google_id FROM "User" WHERE email = ${email} LIMIT 1`

    if (!user || user.length === 0) {
      // El usuario no existe, crearlo
      const randomPassword = Math.random().toString(36).slice(-8) // Generar contraseña aleatoria
      const hashedPassword = await hashPassword(randomPassword)

      // Crear el nuevo usuario
      ;[user] = await prisma.$queryRaw`
        INSERT INTO "User" (email, password, name, google_id) 
        VALUES (${email}, ${hashedPassword}, ${name || email.split('@')[0]}, ${googleId}) 
        RETURNING id, email, name, google_id
      `

      // Crear grupos musculares por defecto para el usuario
      const defaultMuscleGroups = [
        { name: 'Pecho y Tríceps', userId: user.id, isPublic: true },
        { name: 'Espalda y Bíceps', userId: user.id, isPublic: true },
        { name: 'Pierna', userId: user.id, isPublic: true },
        { name: 'Hombros', userId: user.id, isPublic: true },
        { name: 'Otros', userId: user.id, isPublic: true }
      ]

      await Promise.all(
        defaultMuscleGroups.map((group) =>
          prisma.muscleGroup.create({
            data: group
          })
        )
      )
    } else {
      // Usuario ya existe
      user = user[0]
    }

    // Generar token
    const token = generateToken(user)

    // Devolver usuario y token
    res.status(200).json({ user, token })
  } catch (error) {
    console.error('Error en autenticación con Google:', error)
    res.status(500).json({ error: `Error en autenticación con Google: ${error.message}` })
  }
}
