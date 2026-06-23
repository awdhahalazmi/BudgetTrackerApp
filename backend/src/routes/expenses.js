import { Router } from 'express'

const router = Router()

// GET /api/expenses?budget_id=xxx&category_id=yyy
router.get('/', async (req, res) => {
  try {
    const { budget_id, category_id } = req.query
    const userId = req.user.id

    if (!budget_id) {
      return res.status(400).json({ error: 'budget_id is required' })
    }

    let query = req.db
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
    console.error('GET /expenses error:', err.message)
    res.status(500).json({ error: 'An internal error occurred' })
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

    // Verify the budget belongs to this user before inserting
    const { data: budget, error: budgetError } = await req.db
      .from('budgets')
      .select('id')
      .eq('id', budget_id)
      .eq('user_id', userId)
      .single()

    if (budgetError || !budget) {
      return res.status(403).json({ error: 'Budget not found or access denied' })
    }

    const { data, error } = await req.db
      .from('expenses')
      .insert({ user_id: userId, budget_id, category_id, title, amount, date })
      .select()
      .single()

    if (error) throw error

    res.status(201).json(data)
  } catch (err) {
    console.error('POST /expenses error:', err.message)
    res.status(500).json({ error: 'An internal error occurred' })
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

    const { data, error } = await req.db
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
    console.error('PUT /expenses error:', err.message)
    res.status(500).json({ error: 'An internal error occurred' })
  }
})

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    const { error } = await req.db
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error

    res.status(204).send()
  } catch (err) {
    console.error('DELETE /expenses error:', err.message)
    res.status(500).json({ error: 'An internal error occurred' })
  }
})

export default router
