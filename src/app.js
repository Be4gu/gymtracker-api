import express from 'express'
import cors from 'cors'
import { corsOptions } from './config/index.js'

// Importar rutas
import authRoutes from './routes/authRoutes.js'
import muscleGroupRoutes from './routes/muscleGroupRoutes.js'
import exerciseRoutes from './routes/exerciseRoutes.js'
import workoutRoutes from './routes/workoutRoutes.js'

// Crear la aplicación Express
const app = express()

// Middleware
app.use(cors(corsOptions))
app.use(express.json())

// Configuración de rutas
app.use('/auth', authRoutes)
app.use('/muscle-groups', muscleGroupRoutes)
app.use('/exercises', exerciseRoutes)
app.use('/workouts', workoutRoutes)

// Ruta base
app.get('/', (req, res) => {
  res.json({
    message: 'GymTracker API',
    version: '1.0.0',
    endpoints: ['/auth', '/muscle-groups', '/exercises', '/workouts']
  })
})

// Middleware para manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    error: 'Error interno del servidor',
    message: err.message
  })
})

// Middleware para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' })
})

export default app
