-- migrations/functions/get_quiz_attempt_stats.sql
CREATE OR REPLACE FUNCTION get_quiz_attempt_stats()
RETURNS TABLE (
    quiz_id UUID,
    attempt_count BIGINT,
    unique_user_count BIGINT,
    avg_score NUMERIC(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        qa.quiz_id,
        COUNT(qa.id) AS attempt_count,
        COUNT(DISTINCT qa.user_id) AS unique_user_count,
        AVG(qa.score) AS avg_score
    FROM 
        quiz_attempts qa
    GROUP BY 
        qa.quiz_id
    ORDER BY 
        attempt_count DESC;
END;
$$ LANGUAGE plpgsql;