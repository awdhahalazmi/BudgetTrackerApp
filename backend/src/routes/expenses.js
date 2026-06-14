import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

// GET /api/expenses?budget_id=xxx&category_id=yyy
router.get('/', async (req, res) => {
  try {
    const { budget_id, category_id } = req.query
    const userId = req.user.id

    if (!budget_id) {
      return res.status(400).json({ error: 'budget_id is required' })
    }

    let query = supabase
      .from('expenses')
      .select('*')
      .eq('budget_id', budget_id)
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (category_id) {
      query = query.eq('category_id', category_id)
    }

    const { data, error } = await query

    if (error) throw error

    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/expenses
router.post('/', async (req, res) => {
  try {
    const { budget_id, category_id, title, amount, date } = req.body
    const userId = req.user.id

    if (!budget_id || !category_id || !title || !amount || !date) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert({ user_id: userId, budget_id, category_id, title, amount, date })
      .select()
      .single()

    if (error) throw error

    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/expenses/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { category_id, title, amount, date } = req.body
    const userId = req.user.id

    const updates = {}
    if (category_id !== undefined) updates.category_id = category_id
    if (title !== undefined) updates.title = title
    if (amount !== undefined) updates.amount = amount
    if (date !== undefined) updates.date = date

    const { data, error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Expense not found' })

    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error

    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
