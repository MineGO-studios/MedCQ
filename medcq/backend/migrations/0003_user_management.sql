-- migrations/0003_user_management.sql

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  photo_url TEXT,
  bio TEXT,
  profession TEXT,
  specialization TEXT,
  year_of_study INTEGER,
  institution TEXT,
  location TEXT,
  website TEXT,
  social_links JSONB,
  roles TEXT[] NOT NULL DEFAULT '{student}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_active_at TIMESTAMP WITH TIME ZONE
);

-- User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'system',
  email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  push_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  study_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  show_score_immediately BOOLEAN NOT NULL DEFAULT TRUE,
  show_explanations_with_results BOOLEAN NOT NULL DEFAULT TRUE,
  default_quiz_time_limit INTEGER,
  default_subject_filter TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- User Statistics Table
CREATE TABLE IF NOT EXISTS user_stats (
  user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  quizzes_created INTEGER NOT NULL DEFAULT 0,
  quizzes_completed INTEGER NOT NULL DEFAULT 0,
  quizzes_passed INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  average_score NUMERIC(5, 2) NOT NULL DEFAULT 0,
  total_time_spent INTEGER NOT NULL DEFAULT 0, -- in seconds
  strongest_subject TEXT,
  weakest_subject TEXT,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL
);

-- User Activity Log Table
CREATE TABLE IF NOT EXISTS user_activities (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('login', 'quiz_start', 'quiz_complete', 'profile_update', 'content_create')),
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Add indices for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_roles ON user_profiles(roles);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_timestamp ON user_activities(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_profiles_institution ON user_profiles(institution);
CREATE INDEX IF NOT EXISTS idx_user_profiles_specialization ON user_profiles(specialization);