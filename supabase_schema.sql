-- ============================================
-- Dashboard Agent Monitoring System
-- PostgreSQL Schema for Supabase
-- ============================================

-- Enable UUID extension (optional, but recommended for future use)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table: agents
-- ============================================
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    model TEXT,
    client_name TEXT,
    client_id TEXT,
    status TEXT DEFAULT 'offline',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ,
    total_api_calls INTEGER DEFAULT 0,
    today_api_calls INTEGER DEFAULT 0,
    total_tasks INTEGER DEFAULT 0,
    today_tasks INTEGER DEFAULT 0,
    error_rate REAL DEFAULT 0,
    avg_response_time REAL DEFAULT 0,
    total_response_time INTEGER DEFAULT 0,
    response_count INTEGER DEFAULT 0,
    api_status TEXT DEFAULT 'unknown',
    base_url TEXT,
    account TEXT,
    api_key TEXT
);

-- ============================================
-- Table: api_breakdown
-- ============================================
CREATE TABLE IF NOT EXISTS api_breakdown (
    agent_id TEXT NOT NULL,
    api_type TEXT NOT NULL,
    today_count INTEGER DEFAULT 0,
    total_count INTEGER DEFAULT 0,
    PRIMARY KEY (agent_id, api_type),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- ============================================
-- Table: daily_stats
-- ============================================
CREATE TABLE IF NOT EXISTS daily_stats (
    id BIGSERIAL PRIMARY KEY,
    agent_id TEXT NOT NULL,
    date DATE NOT NULL,
    tasks INTEGER DEFAULT 0,
    api_calls INTEGER DEFAULT 0,
    breakdown JSONB,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    UNIQUE(agent_id, date)
);

-- ============================================
-- Table: hourly_stats
-- ============================================
CREATE TABLE IF NOT EXISTS hourly_stats (
    agent_id TEXT NOT NULL,
    hour TEXT NOT NULL,
    tasks INTEGER DEFAULT 0,
    api_calls INTEGER DEFAULT 0,
    updated_at DATE,
    PRIMARY KEY (agent_id, hour),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- ============================================
-- Table: activity_logs
-- ============================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGSERIAL PRIMARY KEY,
    agent_id TEXT NOT NULL,
    action TEXT,
    type TEXT,
    status TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    response_time INTEGER,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_agent_timestamp 
    ON activity_logs(agent_id, timestamp DESC);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_breakdown ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE hourly_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read all data
CREATE POLICY "Allow authenticated read access on agents"
    ON agents FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated read access on api_breakdown"
    ON api_breakdown FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated read access on daily_stats"
    ON daily_stats FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated read access on hourly_stats"
    ON hourly_stats FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated read access on activity_logs"
    ON activity_logs FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Allow service role (backend) to insert/update
CREATE POLICY "Allow service role full access on agents"
    ON agents FOR ALL
    TO service_role
    USING (true);

CREATE POLICY "Allow service role full access on api_breakdown"
    ON api_breakdown FOR ALL
    TO service_role
    USING (true);

CREATE POLICY "Allow service role full access on daily_stats"
    ON daily_stats FOR ALL
    TO service_role
    USING (true);

CREATE POLICY "Allow service role full access on hourly_stats"
    ON hourly_stats FOR ALL
    TO service_role
    USING (true);

CREATE POLICY "Allow service role full access on activity_logs"
    ON activity_logs FOR ALL
    TO service_role
    USING (true);

-- Policy: Allow authenticated users (server) to insert/update
CREATE POLICY "Allow authenticated full access on agents"
    ON agents FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated full access on api_breakdown"
    ON api_breakdown FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated full access on daily_stats"
    ON daily_stats FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated full access on hourly_stats"
    ON hourly_stats FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated full access on activity_logs"
    ON activity_logs FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================
-- Seed Data (Optional - for testing)
-- ============================================

-- Insert sample agent (World Locker)
INSERT INTO agents (id, name, model, client_name, client_id, status, base_url)
VALUES (
    'agent-worldlocker-001',
    '견적 에이전트',
    'gpt-4',
    'World Locker',
    'client-worldlocker',
    'offline',
    'http://localhost:3001'
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Functions for Real-time Updates
-- ============================================

-- Function to update agent stats
CREATE OR REPLACE FUNCTION update_agent_stats(
    p_agent_id TEXT,
    p_api_type TEXT,
    p_response_time INTEGER DEFAULT 0,
    p_is_error BOOLEAN DEFAULT false,
    p_should_count_api BOOLEAN DEFAULT true,
    p_should_count_task BOOLEAN DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_today DATE;
    v_current_hour TEXT;
BEGIN
    -- Use Korean timezone for all date calculations
    v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::DATE;
    v_current_hour := TO_CHAR(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul', 'HH24');

    -- Update agent counters
    UPDATE agents
    SET 
        last_active = NOW(),
        total_api_calls = total_api_calls + CASE WHEN p_should_count_api THEN 1 ELSE 0 END,
        today_api_calls = today_api_calls + CASE WHEN p_should_count_api THEN 1 ELSE 0 END,
        total_tasks = total_tasks + CASE WHEN p_should_count_task THEN 1 ELSE 0 END,
        today_tasks = today_tasks + CASE WHEN p_should_count_task THEN 1 ELSE 0 END,
        total_response_time = total_response_time + p_response_time,
        response_count = response_count + 1,
        avg_response_time = (total_response_time + p_response_time) / (response_count + 1)
    WHERE id = p_agent_id;

    -- Update API breakdown
    INSERT INTO api_breakdown (agent_id, api_type, today_count, total_count)
    VALUES (p_agent_id, p_api_type, 1, 1)
    ON CONFLICT (agent_id, api_type) DO UPDATE
    SET 
        today_count = api_breakdown.today_count + 1,
        total_count = api_breakdown.total_count + 1;

    -- Update hourly stats
    INSERT INTO hourly_stats (agent_id, hour, tasks, api_calls, updated_at)
    VALUES (
        p_agent_id,
        v_current_hour,
        CASE WHEN p_should_count_task THEN 1 ELSE 0 END,
        CASE WHEN p_should_count_api THEN 1 ELSE 0 END,
        v_today
    )
    ON CONFLICT (agent_id, hour) DO UPDATE
    SET 
        tasks = hourly_stats.tasks + CASE WHEN p_should_count_task THEN 1 ELSE 0 END,
        api_calls = hourly_stats.api_calls + CASE WHEN p_should_count_api THEN 1 ELSE 0 END,
        updated_at = v_today;

    -- Update daily stats (using Korean timezone date)
    INSERT INTO daily_stats (agent_id, date, tasks, api_calls)
    VALUES (
        p_agent_id,
        (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::DATE,
        CASE WHEN p_should_count_task THEN 1 ELSE 0 END,
        CASE WHEN p_should_count_api THEN 1 ELSE 0 END
    )
    ON CONFLICT (agent_id, date) DO UPDATE
    SET 
        tasks = daily_stats.tasks + CASE WHEN p_should_count_task THEN 1 ELSE 0 END,
        api_calls = daily_stats.api_calls + CASE WHEN p_should_count_api THEN 1 ELSE 0 END;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_agent_stats TO authenticated, service_role;
