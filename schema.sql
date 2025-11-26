-- 1. Teams Table
-- Stores the list of teams participating in the hackathon.
CREATE TABLE teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  visible boolean DEFAULT true,
  order_index integer,
  created_at timestamptz DEFAULT now()
);


-- 2. Event Config Table
-- A single-row table to store the global state of the event.
CREATE TABLE event_config (
  id int PRIMARY KEY DEFAULT 1,
  -- Timer settings
  timer_duration_seconds integer DEFAULT 28800, -- 8 hours
  timer_state text DEFAULT 'stopped' NOT NULL, -- 'stopped', 'running', 'paused'
  timer_ends_at timestamptz,
  timer_remaining integer,
  -- Display settings
  note text,
  layout jsonb,
  -- Shuffle settings
  shuffle_enabled boolean DEFAULT false,
  shuffle_interval_seconds integer DEFAULT 300, -- 5 minutes
  -- Real-time action settings
  action_counter integer DEFAULT 0,
  last_action_payload jsonb,
  CONSTRAINT single_row_constraint CHECK (id = 1)
);

-- Initialize the single configuration row.
INSERT INTO event_config (id) VALUES (1);


-- 3. Audit Logs Table
-- Records all actions performed by admins for accountability.
CREATE TABLE audit_logs (
  id bigserial PRIMARY KEY,
  admin_username text,
  action_type text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);


-- Grant basic read access to anon key for public-facing tables
GRANT SELECT ON teams TO anon;
GRANT SELECT ON event_config TO anon;
