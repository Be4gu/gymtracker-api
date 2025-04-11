import { PrismaClient } from '@prisma/client'
import { hashPassword, comparePassword, generateToken } from '../utils/auth.js'

const prisma = new PrismaClient()

// Registrar un nuevo usuario
export const register = async (req, res) => {
  const { email, password } = req.body // Omitimos 'name' intencionalmente

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' })
  }

  try {
    // Verificar si el usuario ya existe - usando una consulta que no incluye 'name'
    const existingUser = await prisma.$queryRaw`SELECT id, email, password FROM "User" WHERE email = ${email} LIMIT 1`

    if (existingUser && existingUser.length > 0) {
      return res.status(400).json({ error: 'El usuario ya existe' })
    }

    // Encriptar contraseña
    const hashedPassword = await hashPassword(password)

    // Crear usuario sin el campo name mediante una consulta raw
    const [user] = await prisma.$queryRaw`
      INSERT INTO "User" (email, password) 
      VALUES (${email}, ${hashedPassword}) 
      RETURNING id, email
    `

    // Crear grupos musculares por defecto para el usuario
    const defaultMuscleGroups = [
      { name: 'Pecho y Tríceps', userId: user.id, isPublic: true },
      { name: 'Espalda y Bíceps', userId: user.id, isPublic: true },
      { name: 'Pierna', userId: user.id, isPublic: true },
      { name: 'Hombros', userId: user.id, isPublic: true },
      { name: 'Otros', userId: user.id, isPublic: true }
    ]

    // Crear grupos musculares en una operación única
    const muscleGroupsCreated = await Promise.all(
      defaultMuscleGroups.map((group) =>
        prisma.muscleGroup.create({
          data: group
        })
      )
    )

    // Crear ejercicios por defecto para los grupos creados
    const exercises = [
      // Pecho y Tríceps
      { name: 'Press de banca', muscleGroupId: muscleGroupsCreated[0].id, userId: user.id, isPublic: true },
      { name: 'Press inclinado', muscleGroupId: muscleGroupsCreated[0].id, userId: user.id, isPublic: true },
      { name: 'Press declinado', muscleGroupId: muscleGroupsCreated[0].id, userId: user.id, isPublic: true },
      { name: 'Aperturas con mancuernas', muscleGroupId: muscleGroupsCreated[0].id, userId: user.id, isPublic: true },

      // Espalda y Bíceps
      { name: 'Dominadas', muscleGroupId: muscleGroupsCreated[1].id, userId: user.id, isPublic: true },
      { name: 'Remo', muscleGroupId: muscleGroupsCreated[1].id, userId: user.id, isPublic: true },
      { name: 'Jalón al pecho', muscleGroupId: muscleGroupsCreated[1].id, userId: user.id, isPublic: true },
      { name: 'Curl de bíceps', muscleGroupId: muscleGroupsCreated[1].id, userId: user.id, isPublic: true },

      // Pierna
      { name: 'Sentadillas', muscleGroupId: muscleGroupsCreated[2].id, userId: user.id, isPublic: true },
      { name: 'Peso muerto', muscleGroupId: muscleGroupsCreated[2].id, userId: user.id, isPublic: true },
      { name: 'Prensa', muscleGroupId: muscleGroupsCreated[2].id, userId: user.id, isPublic: true },
      { name: 'Extensiones de cuádriceps', muscleGroupId: muscleGroupsCreated[2].id, userId: user.id, isPublic: true },

      // Hombros
      { name: 'Press militar', muscleGroupId: muscleGroupsCreated[3].id, userId: user.id, isPublic: true },
      { name: 'Elevaciones laterales', muscleGroupId: muscleGroupsCreated[3].id, userId: user.id, isPublic: true },
      { name: 'Elevaciones frontales', muscleGroupId: muscleGroupsCreated[3].id, userId: user.id, isPublic: true },
      { name: 'Remo al mentón', muscleGroupId: muscleGroupsCreated[3].id, userId: user.id, isPublic: true },

      // Otros
      { name: 'Crunch abdominal', muscleGroupId: muscleGroupsCreated[4].id, userId: user.id, isPublic: true },
      { name: 'Plancha', muscleGroupId: muscleGroupsCreated[4].id, userId: user.id, isPublic: true },
      { name: 'Extensiones de espalda', muscleGroupId: muscleGroupsCreated[4].id, userId: user.id, isPublic: true },
      { name: 'Russian twist', muscleGroupId: muscleGroupsCreated[4].id, userId: user.id, isPublic: true }
    ]

    // Limitar el número de ejercicios para no sobrecargar
    const limitedExercises = exercises.slice(0, 20)

    // Crear ejercicios en una operación única
    await Promise.all(
      limitedExercises.map((exercise) =>
        prisma.exerciseTemplate.create({
          data: exercise
        })
      )
    )

    // Generar token de autenticación
    const token = generateToken(user)

    // Devolver usuario sin contraseña
    const { password: _, ...userWithoutPassword } = user
    res.status(201).json({ user: userWithoutPassword, token })
  } catch (error) {
    console.error('Error al registrar usuario:', error)
    res.status(500).json({ error: `Error interno del servidor: ${error.message}` })
  }
}

// Iniciar sesión
export const login = async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' })
  }

  try {
    // Buscar usuario por email
    const user = await prisma.$queryRaw`SELECT id, email, password FROM "User" WHERE email = ${email} LIMIT 1`

    if (!user || user.length === 0) {
      return res.status(400).json({ error: 'Usuario o contraseña incorrectos' })
    }

    // Verificar contraseña
    const validPassword = await comparePassword(password, user[0].password)
    if (!validPassword) {
      return res.status(400).json({ error: 'Usuario o contraseña incorrectos' })
    }

    // Generar token
    const token = generateToken(user[0])

    // Devolver usuario sin contraseña
    const { password: _, ...userWithoutPassword } = user[0]
    res.status(200).json({ user: userWithoutPassword, token })
  } catch (error) {
    console.error('Error al iniciar sesión:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

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
