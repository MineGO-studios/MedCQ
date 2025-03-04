-- migrations/0002_quiz_attempts.sql

-- Quiz Attempts Table
ALTER TABLE quiz_attempts
ADD COLUMN status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'expired')),
ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN points_earned NUMERIC(10, 2),
ADD COLUMN points_possible NUMERIC(10, 2),
ADD COLUMN passed BOOLEAN;

-- Question Results Table
ALTER TABLE question_results
ADD COLUMN points_earned NUMERIC(10, 2),
ADD COLUMN points_possible NUMERIC(10, 2),
ADD COLUMN selected_option_ids JSONB,
ADD COLUMN correct_option_ids JSONB;

-- Add indices for performance
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id_status ON quiz_attempts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id_status ON quiz_attempts(quiz_id, status);
CREATE INDEX IF NOT EXISTS idx_question_results_attempt_id ON question_results(attempt_id);
CREATE INDEX IF NOT EXISTS idx_question_results_question_id ON question_results(question_id);