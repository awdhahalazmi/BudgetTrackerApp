import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { authenticate } from './middleware/auth.js'
import budgetsRouter from './routes/budgets.js'
import categoriesRouter from './routes/categories.js'
import expensesRouter from './routes/expenses.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))

app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api', authenticate)
app.use('/api/budgets', budgetsRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/expenses', expensesRouter)

app.use((err, _req, res, _next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Budget Tracker API running on http://localhost:${PORT}`)
})
