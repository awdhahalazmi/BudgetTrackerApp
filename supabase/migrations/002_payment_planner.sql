-- ============================================================
-- PLANNED PAYMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.planned_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  amount DECIMAL(12,3) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL DEFAULT 'Other',
  due_date DATE NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  recurring_interval TEXT CHECK (
    recurring_interval IS NULL OR
    recurring_interval IN ('weekly', 'monthly', 'yearly')
  ),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.planned_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "planned_payments_select" ON public.planned_payments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "planned_payments_insert" ON public.planned_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "planned_payments_update" ON public.planned_payments
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "planned_payments_delete" ON public.planned_payments
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- PLANNER SUBSCRIPTIONS TABLE
-- (one record per user — service role writes, users only read)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.planner_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('active', 'pending', 'failed')),
  invoice_id TEXT,
  payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.planner_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only read their own subscription status
CREATE POLICY "planner_subscriptions_select" ON public.planner_subscriptions
  FOR SELECT USING (auth.uid() = user_id);
-- All writes are done by edge functions with service_role key (bypasses RLS)
