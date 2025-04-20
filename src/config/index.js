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
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : process.env.NODE_ENV === 'production' ? ['https://gymtrack-client.vercel.app'] : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // Permitir cookies y encabezados de autenticación
  preflightContinue: false, // Evitar redirecciones en solicitudes preflight
  optionsSuccessStatus: 204 // Código de respuesta estándar para OPTIONS
}
