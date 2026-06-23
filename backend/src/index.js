import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { authenticate } from './middleware/auth.js'
import budgetsRouter from './routes/budgets.js'
import categoriesRouter from './routes/categories.js'
import expensesRouter from './routes/expenses.js'
import logger from './lib/logger.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(helmet())

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))

app.use(express.json())

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
})

// HTTP request logging — stream into structured logger
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', {
  stream: {
    write: (message) => logger.info(message.trim(), { type: 'http' }),
  },
}))

app.get('/health', (_req, res) => {
  logger.info('Health check')
  res.json({ status: 'ok', time: new Date().toISOString() })
})

app.use('/api', apiLimiter, authenticate)
app.use('/api/budgets', budgetsRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/expenses', expensesRouter)

app.use((err, _req, res, _next) => {
  logger.error('Unhandled error', { message: err.message, stack: err.stack })
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  logger.info(`Budget Tracker API started`, { port: PORT, env: process.env.NODE_ENV || 'development' })
})
