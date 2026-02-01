-- ============================================
-- Fix: breakdown 필드가 shouldCountTask를 체크하지 않는 버그 수정
-- 이 SQL을 Supabase SQL Editor에서 실행하세요
-- ============================================

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
    v_last_reset_date DATE;
BEGIN
    -- Use Korean timezone for all date calculations
    v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::DATE;
    v_current_hour := TO_CHAR(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul', 'HH24');

    -- 날짜가 바뀌었는지 확인하고 리셋
    SELECT COALESCE(last_reset_date, '1970-01-01'::DATE) INTO v_last_reset_date
    FROM agents
    WHERE id = p_agent_id;

    -- 날짜가 바뀌었으면 (자정이 지났으면) today 통계 리셋
    IF v_last_reset_date < v_today THEN
        -- agents 테이블의 today 통계 리셋
        UPDATE agents
        SET
            today_api_calls = 0,
            today_tasks = 0,
            last_reset_date = v_today
        WHERE id = p_agent_id;

        -- api_breakdown 테이블의 today_count 리셋
        UPDATE api_breakdown
        SET today_count = 0
        WHERE agent_id = p_agent_id;
    END IF;

    -- Update agent counters (리셋 후 증가)
    UPDATE agents
    SET
        last_active = NOW(),
        total_api_calls = total_api_calls + CASE WHEN p_should_count_api THEN 1 ELSE 0 END,
        today_api_calls = today_api_calls + CASE WHEN p_should_count_api THEN 1 ELSE 0 END,
        total_tasks = total_tasks + CASE WHEN p_should_count_task THEN 1 ELSE 0 END,
        today_tasks = today_tasks + CASE WHEN p_should_count_task THEN 1 ELSE 0 END,
        total_response_time = total_response_time + p_response_time,
        response_count = response_count + 1,
        avg_response_time = (total_response_time + p_response_time) / (response_count + 1),
        last_reset_date = v_today  -- 항상 오늘 날짜로 업데이트
    WHERE id = p_agent_id;

    -- Update API breakdown
    INSERT INTO api_breakdown (agent_id, api_type, today_count, total_count)
    VALUES (p_agent_id, p_api_type, 1, 1)
    ON CONFLICT (agent_id, api_type) DO UPDATE
    SET
        today_count = api_breakdown.today_count + 1,
        total_count = api_breakdown.total_count + 1;

    -- Update hourly stats (오늘 날짜 기준, 날짜가 바뀌면 리셋)
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
        -- updated_at이 오늘이 아니면 리셋 후 증가, 오늘이면 증가만
        tasks = CASE
            WHEN hourly_stats.updated_at < v_today THEN CASE WHEN p_should_count_task THEN 1 ELSE 0 END
            ELSE hourly_stats.tasks + CASE WHEN p_should_count_task THEN 1 ELSE 0 END
        END,
        api_calls = CASE
            WHEN hourly_stats.updated_at < v_today THEN CASE WHEN p_should_count_api THEN 1 ELSE 0 END
            ELSE hourly_stats.api_calls + CASE WHEN p_should_count_api THEN 1 ELSE 0 END
        END,
        updated_at = v_today;

    -- Update daily stats (using Korean timezone date)
    -- breakdown도 함께 업데이트 (api_breakdown 테이블의 today_count를 기반으로)
    INSERT INTO daily_stats (agent_id, date, tasks, api_calls, breakdown)
    VALUES (
        p_agent_id,
        v_today,
        CASE WHEN p_should_count_task THEN 1 ELSE 0 END,
        CASE WHEN p_should_count_api THEN 1 ELSE 0 END,
        jsonb_build_object(p_api_type, CASE WHEN p_should_count_task THEN 1 ELSE 0 END)
    )
    ON CONFLICT (agent_id, date) DO UPDATE
    SET
        tasks = daily_stats.tasks + CASE WHEN p_should_count_task THEN 1 ELSE 0 END,
        api_calls = daily_stats.api_calls + CASE WHEN p_should_count_api THEN 1 ELSE 0 END,
        breakdown = COALESCE(daily_stats.breakdown, '{}'::jsonb) || jsonb_build_object(
            p_api_type,
            COALESCE((daily_stats.breakdown->>p_api_type)::integer, 0) + CASE WHEN p_should_count_task THEN 1 ELSE 0 END
        );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_agent_stats TO authenticated, service_role;
