// Configuración de la aplicación
import dotenv from 'dotenv'
import process from 'process'

// Cargar variables de entorno
dotenv.config()

export const PORT = process.env.PORT || 3000
export const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key'
export const DATABASE_URL = process.env.DATABASE_URL

// Configuración de CORS
export const corsOptions = {
  origin:
    process.env.NODE_ENV === 'production'
      ? ['https://gymtracker-client.vercel.app', 'http://localhost:5173'] // Permitir producción y desarrollo
      : '*', // En desarrollo, permitir todas las conexiones
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true // Permitir cookies y encabezados de autenticación
}
