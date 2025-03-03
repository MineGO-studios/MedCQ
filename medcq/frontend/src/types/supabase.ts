// frontend/src/types/supabase.ts

export type Database = {
    public: {
      Tables: {
        users: {
          Row: {
            id: string
            email: string
            display_name: string | null
            photo_url: string | null
            created_at: string
            updated_at: string
          }
          Insert: {
            id: string
            email: string
            display_name?: string | null
            photo_url?: string | null
            created_at?: string
            updated_at?: string
          }
          Update: {
            id?: string
            email?: string
            display_name?: string | null
            photo_url?: string | null
            created_at?: string
            updated_at?: string
          }
        }
        quizzes: {
          Row: {
            id: string
            title: string
            description: string | null
            subject_id: string | null
            year_level: number | null
            time_limit_minutes: number | null
            created_by: string | null
            created_at: string
            updated_at: string
          }
          Insert: {
            id?: string
            title: string
            description?: string | null
            subject_id?: string | null
            year_level?: number | null
            time_limit_minutes?: number | null
            created_by?: string | null
            created_at?: string
            updated_at?: string
          }
          Update: {
            id?: string
            title?: string
            description?: string | null
            subject_id?: string | null
            year_level?: number | null
            time_limit_minutes?: number | null
            created_by?: string | null
            created_at?: string
            updated_at?: string
          }
        }
        // Define the rest of the tables similarly...
      }
      Views: {
        [_ in never]: never
      }
      Functions: {
        [_ in never]: never
      }
    }
  }