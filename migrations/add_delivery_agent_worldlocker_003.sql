-- Migration: Add 납품일정 에이전트 (agent-worldlocker-003)
-- Date: 2026-02-10

-- Insert new agent record
INSERT INTO agents (
    id,
    name,
    model,
    client_name,
    client_id,
    status,
    created_at,
    last_active,
    total_api_calls,
    today_api_calls,
    total_tasks,
    today_tasks,
    total_errors,
    today_errors,
    error_rate,
    avg_response_time,
    base_url
) VALUES (
    'agent-worldlocker-003',
    '납품일정 에이전트',
    'gemini-2.0-flash',
    '(주)월드락커',
    'client-worldlocker',
    'online',
    NOW(),
    NOW(),
    0, 0, 0, 0,
    0, 0, 0, 0,
    'https://agent-world-schedule.vercel.app'
);

-- Initialize api_breakdown for the new agent
INSERT INTO api_breakdown (
    agent_id,
    api_type,
    today_count,
    total_count
) VALUES
    ('agent-worldlocker-003', 'ai-coach', 0, 0),
    ('agent-worldlocker-003', 'teams-read', 0, 0),
    ('agent-worldlocker-003', 'teams-send', 0, 0);

-- Update base_url if agent already exists
UPDATE agents
SET base_url = 'https://agent-world-schedule.vercel.app',
    model = 'gemini-2.0-flash'
WHERE id = 'agent-worldlocker-003';

-- Update api_breakdown: rename ai-summary to ai-coach
UPDATE api_breakdown
SET api_type = 'ai-coach'
WHERE agent_id = 'agent-worldlocker-003' AND api_type = 'ai-summary';
