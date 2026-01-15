-- Update the update_agent_stats function to include daily_stats updates
-- Run this in your Supabase SQL Editor

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
