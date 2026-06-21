import { Router } from 'express'

const router = Router()

// GET /api/categories?budget_id=xxx
router.get('/', async (req, res) => {
  try {
    const { budget_id } = req.query
    const userId = req.user.id

    if (!budget_id) {
      return res.status(400).json({ error: 'budget_id is required' })
    }

    const { data: categories, error: catError } = await req.db
      .from('categories')
      .select('*')
      .eq('budget_id', budget_id)
      .eq('user_id', userId)
      .order('created_at')

    if (catError) throw catError

    // Compute spent amounts from expenses
    const { data: expenses, error: expError } = await req.db
      .from('expenses')
      .select('category_id, amount')
      .eq('budget_id', budget_id)
      .eq('user_id', userId)

    if (expError) throw expError

    const spentMap = {}
    expenses.forEach(e => {
      spentMap[e.category_id] = (spentMap[e.category_id] || 0) + parseFloat(e.amount)
    })

    const result = categories.map(cat => ({
      ...cat,
      spent: spentMap[cat.id] || 0,
      remaining: parseFloat(cat.allocated_amount) - (spentMap[cat.id] || 0),
      percentage: parseFloat(cat.allocated_amount) > 0
        ? ((spentMap[cat.id] || 0) / parseFloat(cat.allocated_amount)) * 100
        : 0,
    }))

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/categories
router.post('/', async (req, res) => {
  try {
    const { budget_id, name, allocated_amount } = req.body
    const userId = req.user.id

    const { data, error } = await req.db
      .from('categories')
      .insert({ user_id: userId, budget_id, name, allocated_amount })
      .select()
      .single()

    if (error) throw error

    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/categories/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, allocated_amount } = req.body
    const userId = req.user.id

    const updates = {}
    if (name !== undefined) updates.name = name
    if (allocated_amount !== undefined) updates.allocated_amount = allocated_amount

    const { data, error } = await req.db
      .from('categories')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Category not found' })

    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/categories/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    const { error } = await req.db
      .from('categories')
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
