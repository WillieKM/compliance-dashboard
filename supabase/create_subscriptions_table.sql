-- Run this in your Supabase SQL editor
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_customer_id TEXT UNIQUE NOT NULL,
  stripe_subscription_id TEXT,
  plan_id TEXT NOT NULL DEFAULT 'professional',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
