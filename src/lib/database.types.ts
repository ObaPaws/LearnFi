export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      credentials: {
        Row: {
          created_at: string
          id: string
          issued_at: string | null
          pda_address: string | null
          revoked_at: string | null
          status: Database["public"]["Enums"]["credential_status"]
          transaction_signature: string | null
          type: Database["public"]["Enums"]["credential_type"]
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          issued_at?: string | null
          pda_address?: string | null
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["credential_status"]
          transaction_signature?: string | null
          type: Database["public"]["Enums"]["credential_type"]
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          issued_at?: string | null
          pda_address?: string | null
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["credential_status"]
          transaction_signature?: string | null
          type?: Database["public"]["Enums"]["credential_type"]
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credentials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_achievement_awards: {
        Row: {
          achievement_id: string
          awarded_at: string
          learner_id: string
        }
        Insert: {
          achievement_id: string
          awarded_at?: string
          learner_id: string
        }
        Update: {
          achievement_id?: string
          awarded_at?: string
          learner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learner_achievement_awards_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "learner_achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learner_achievement_awards_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learner_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      learner_achievements: {
        Row: {
          description: string
          id: string
          is_active: boolean
          milestone_days: number | null
          name: string
          slug: string
          xp_reward: number
        }
        Insert: {
          description: string
          id?: string
          is_active?: boolean
          milestone_days?: number | null
          name: string
          slug: string
          xp_reward?: number
        }
        Update: {
          description?: string
          id?: string
          is_active?: boolean
          milestone_days?: number | null
          name?: string
          slug?: string
          xp_reward?: number
        }
        Relationships: []
      }
      learner_profiles: {
        Row: {
          bio: string | null
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learner_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_teaching_preferences: {
        Row: {
          learner_id: string
          style_id: string
          weight: number
        }
        Insert: {
          learner_id: string
          style_id: string
          weight?: number
        }
        Update: {
          learner_id?: string
          style_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "learner_teaching_preferences_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learner_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "learner_teaching_preferences_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "teaching_styles"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_xp_rewards: {
        Row: {
          created_at: string
          id: string
          learner_id: string
          reward_type: string
          source_id: string
          xp_amount: number
        }
        Insert: {
          created_at?: string
          id?: string
          learner_id: string
          reward_type: string
          source_id: string
          xp_amount: number
        }
        Update: {
          created_at?: string
          id?: string
          learner_id?: string
          reward_type?: string
          source_id?: string
          xp_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "learner_xp_rewards_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learner_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      learning_activities: {
        Row: {
          event_type: Database["public"]["Enums"]["learning_event_type"]
          id: string
          idempotency_key: string
          learner_id: string
          occurred_at: string
          tutorial_id: string | null
        }
        Insert: {
          event_type: Database["public"]["Enums"]["learning_event_type"]
          id?: string
          idempotency_key: string
          learner_id: string
          occurred_at?: string
          tutorial_id?: string | null
        }
        Update: {
          event_type?: Database["public"]["Enums"]["learning_event_type"]
          id?: string
          idempotency_key?: string
          learner_id?: string
          occurred_at?: string
          tutorial_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_activities_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learner_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "learning_activities_tutorial_id_fkey"
            columns: ["tutorial_id"]
            isOneToOne: false
            referencedRelation: "tutorials"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_path_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          learner_id: string
          learning_path_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          learner_id: string
          learning_path_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          learner_id?: string
          learning_path_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_path_progress_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learner_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "learning_path_progress_learning_path_id_fkey"
            columns: ["learning_path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_path_tutorials: {
        Row: {
          learning_path_id: string
          position: number
          tutorial_id: string
        }
        Insert: {
          learning_path_id: string
          position: number
          tutorial_id: string
        }
        Update: {
          learning_path_id?: string
          position?: number
          tutorial_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_path_tutorials_learning_path_id_fkey"
            columns: ["learning_path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_path_tutorials_tutorial_id_fkey"
            columns: ["tutorial_id"]
            isOneToOne: false
            referencedRelation: "tutorials"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_paths: {
        Row: {
          category_id: string | null
          created_at: string
          description: string
          id: string
          is_published: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description: string
          id?: string
          is_published?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          is_published?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_paths_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tutorial_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      live_class_registrations: {
        Row: {
          learner_id: string
          live_class_id: string
          registered_at: string
          status: string
        }
        Insert: {
          learner_id: string
          live_class_id: string
          registered_at?: string
          status?: string
        }
        Update: {
          learner_id?: string
          live_class_id?: string
          registered_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_class_registrations_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learner_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "live_class_registrations_live_class_id_fkey"
            columns: ["live_class_id"]
            isOneToOne: false
            referencedRelation: "live_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      live_classes: {
        Row: {
          capacity: number | null
          category_id: string | null
          created_at: string
          description: string
          duration_minutes: number
          id: string
          meeting_url: string
          starts_at: string
          status: string
          title: string
          tutor_id: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          category_id?: string | null
          created_at?: string
          description: string
          duration_minutes: number
          id?: string
          meeting_url: string
          starts_at: string
          status?: string
          title: string
          tutor_id: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          category_id?: string | null
          created_at?: string
          description?: string
          duration_minutes?: number
          id?: string
          meeting_url?: string
          starts_at?: string
          status?: string
          title?: string
          tutor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_classes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tutorial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_classes_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "live_classes_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_reputation"
            referencedColumns: ["tutor_id"]
          },
        ]
      }
      moderation_violations: {
        Row: {
          created_at: string
          id: string
          reason: string
          resolved_at: string | null
          status: string
          tutor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          resolved_at?: string | null
          status?: string
          tutor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          resolved_at?: string | null
          status?: string
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_violations_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "moderation_violations_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_reputation"
            referencedColumns: ["tutor_id"]
          },
        ]
      }
      quiz_attempt_answers: {
        Row: {
          attempt_id: string
          is_correct: boolean
          question_id: string
          selected_option_id: string
        }
        Insert: {
          attempt_id: string
          is_correct: boolean
          question_id: string
          selected_option_id: string
        }
        Update: {
          attempt_id?: string
          is_correct?: boolean
          question_id?: string
          selected_option_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempt_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "tutorial_quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempt_answers_selected_option_id_question_id_fkey"
            columns: ["selected_option_id", "question_id"]
            isOneToOne: false
            referencedRelation: "tutorial_quiz_options"
            referencedColumns: ["id", "question_id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          completed_at: string
          id: string
          learner_id: string
          passed: boolean
          question_count: number
          quiz_id: string
          score: number | null
        }
        Insert: {
          completed_at?: string
          id?: string
          learner_id: string
          passed?: boolean
          question_count?: number
          quiz_id: string
          score?: number | null
        }
        Update: {
          completed_at?: string
          id?: string
          learner_id?: string
          passed?: boolean
          question_count?: number
          quiz_id?: string
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learner_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          id: string
          passing_score: number
          title: string
          tutorial_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          passing_score?: number
          title: string
          tutorial_id: string
        }
        Update: {
          created_at?: string
          id?: string
          passing_score?: number
          title?: string
          tutorial_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_tutorial_id_fkey"
            columns: ["tutorial_id"]
            isOneToOne: false
            referencedRelation: "tutorials"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          accuracy_score: number | null
          clarity_score: number | null
          created_at: string
          educational_score: number | null
          effectiveness_score: number | null
          eligible_at: string | null
          id: string
          learner_id: string
          teaching_feedback: string | null
          tutor_id: string
          tutorial_id: string | null
          updated_at: string
          usefulness_score: number | null
          would_learn_again: boolean | null
        }
        Insert: {
          accuracy_score?: number | null
          clarity_score?: number | null
          created_at?: string
          educational_score?: number | null
          effectiveness_score?: number | null
          eligible_at?: string | null
          id?: string
          learner_id: string
          teaching_feedback?: string | null
          tutor_id: string
          tutorial_id?: string | null
          updated_at?: string
          usefulness_score?: number | null
          would_learn_again?: boolean | null
        }
        Update: {
          accuracy_score?: number | null
          clarity_score?: number | null
          created_at?: string
          educational_score?: number | null
          effectiveness_score?: number | null
          eligible_at?: string | null
          id?: string
          learner_id?: string
          teaching_feedback?: string | null
          tutor_id?: string
          tutorial_id?: string | null
          updated_at?: string
          usefulness_score?: number | null
          would_learn_again?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learner_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_reputation"
            referencedColumns: ["tutor_id"]
          },
          {
            foreignKeyName: "reviews_tutorial_id_fkey"
            columns: ["tutorial_id"]
            isOneToOne: false
            referencedRelation: "tutorials"
            referencedColumns: ["id"]
          },
        ]
      }
      streak_days: {
        Row: {
          activity_date: string
          learner_id: string
        }
        Insert: {
          activity_date: string
          learner_id: string
        }
        Update: {
          activity_date?: string
          learner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "streak_days_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learner_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      streaks: {
        Row: {
          current_streak: number
          last_qualifying_activity: string | null
          learner_id: string
          longest_streak: number
          updated_at: string
        }
        Insert: {
          current_streak?: number
          last_qualifying_activity?: string | null
          learner_id: string
          longest_streak?: number
          updated_at?: string
        }
        Update: {
          current_streak?: number
          last_qualifying_activity?: string | null
          learner_id?: string
          longest_streak?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "streaks_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: true
            referencedRelation: "learner_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      subjects: {
        Row: {
          id: string
          name: string
          parent_id: string | null
          slug: string
        }
        Insert: {
          id?: string
          name: string
          parent_id?: string | null
          slug: string
        }
        Update: {
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      teaching_styles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      tutor_dashboard_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          live_class_id: string | null
          tutor_id: string
          tutorial_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          live_class_id?: string | null
          tutor_id: string
          tutorial_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          live_class_id?: string | null
          tutor_id?: string
          tutorial_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tutor_dashboard_events_live_class_id_fkey"
            columns: ["live_class_id"]
            isOneToOne: false
            referencedRelation: "live_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_dashboard_events_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tutor_dashboard_events_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_reputation"
            referencedColumns: ["tutor_id"]
          },
          {
            foreignKeyName: "tutor_dashboard_events_tutorial_id_fkey"
            columns: ["tutorial_id"]
            isOneToOne: false
            referencedRelation: "tutorials"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_engagement: {
        Row: {
          event_type: string
          id: string
          idempotency_key: string | null
          learner_id: string | null
          occurred_at: string
          tutor_id: string
          tutorial_id: string | null
        }
        Insert: {
          event_type: string
          id?: string
          idempotency_key?: string | null
          learner_id?: string | null
          occurred_at?: string
          tutor_id: string
          tutorial_id?: string | null
        }
        Update: {
          event_type?: string
          id?: string
          idempotency_key?: string | null
          learner_id?: string | null
          occurred_at?: string
          tutor_id?: string
          tutorial_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tutor_engagement_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learner_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tutor_engagement_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tutor_engagement_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_reputation"
            referencedColumns: ["tutor_id"]
          },
          {
            foreignKeyName: "tutor_engagement_tutorial_id_fkey"
            columns: ["tutorial_id"]
            isOneToOne: false
            referencedRelation: "tutorials"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_profiles: {
        Row: {
          areas_of_expertise: string[]
          bio: string | null
          created_at: string
          headline: string | null
          is_published: boolean
          technical_background: string | null
          updated_at: string
          user_id: string
          website_url: string | null
          x_profile_url: string | null
        }
        Insert: {
          areas_of_expertise?: string[]
          bio?: string | null
          created_at?: string
          headline?: string | null
          is_published?: boolean
          technical_background?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
          x_profile_url?: string | null
        }
        Update: {
          areas_of_expertise?: string[]
          bio?: string | null
          created_at?: string
          headline?: string | null
          is_published?: boolean
          technical_background?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
          x_profile_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tutor_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_publications: {
        Row: {
          price_type: string
          publication_number: number
          published_at: string
          tutor_id: string
          tutorial_id: string | null
          tutorial_title: string
        }
        Insert: {
          price_type: string
          publication_number: number
          published_at?: string
          tutor_id: string
          tutorial_id?: string | null
          tutorial_title: string
        }
        Update: {
          price_type?: string
          publication_number?: number
          published_at?: string
          tutor_id?: string
          tutorial_id?: string | null
          tutorial_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_publications_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tutor_publications_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_reputation"
            referencedColumns: ["tutor_id"]
          },
          {
            foreignKeyName: "tutor_publications_tutorial_id_fkey"
            columns: ["tutorial_id"]
            isOneToOne: true
            referencedRelation: "tutorials"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_reputation_settings: {
        Row: {
          prior_mean: number
          prior_review_weight: number
          recognized_min_rating: number
          recognized_min_reviews: number
          singleton: boolean
          updated_at: string
        }
        Insert: {
          prior_mean?: number
          prior_review_weight?: number
          recognized_min_rating?: number
          recognized_min_reviews?: number
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          prior_mean?: number
          prior_review_weight?: number
          recognized_min_rating?: number
          recognized_min_reviews?: number
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      tutor_subjects: {
        Row: {
          subject_id: string
          tutor_id: string
        }
        Insert: {
          subject_id: string
          tutor_id: string
        }
        Update: {
          subject_id?: string
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_subjects_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tutor_subjects_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_reputation"
            referencedColumns: ["tutor_id"]
          },
        ]
      }
      tutor_teaching_styles: {
        Row: {
          style_id: string
          tutor_id: string
        }
        Insert: {
          style_id: string
          tutor_id: string
        }
        Update: {
          style_id?: string
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_teaching_styles_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "teaching_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_teaching_styles_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tutor_teaching_styles_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_reputation"
            referencedColumns: ["tutor_id"]
          },
        ]
      }
      tutorial_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "tutorial_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "tutorial_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorial_comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutorial_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "tutorial_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutorial_comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorial_comment_reports: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          reason: string
          reporter_id: string
          status: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          status?: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutorial_comment_reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "tutorial_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutorial_comment_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorial_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          is_pinned: boolean
          parent_comment_id: string | null
          status: string
          tutor_response_to_id: string | null
          tutorial_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          parent_comment_id?: string | null
          status?: string
          tutor_response_to_id?: string | null
          tutorial_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          parent_comment_id?: string | null
          status?: string
          tutor_response_to_id?: string | null
          tutorial_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutorial_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutorial_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "tutorial_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutorial_comments_tutor_response_to_id_fkey"
            columns: ["tutor_response_to_id"]
            isOneToOne: false
            referencedRelation: "tutorial_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutorial_comments_tutorial_id_fkey"
            columns: ["tutorial_id"]
            isOneToOne: false
            referencedRelation: "tutorials"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorial_free_entitlements: {
        Row: {
          assigned_at: string
          slot: number
          tutor_id: string
          tutorial_id: string
        }
        Insert: {
          assigned_at?: string
          slot: number
          tutor_id: string
          tutorial_id: string
        }
        Update: {
          assigned_at?: string
          slot?: number
          tutor_id?: string
          tutorial_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutorial_free_entitlements_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tutorial_free_entitlements_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_reputation"
            referencedColumns: ["tutor_id"]
          },
          {
            foreignKeyName: "tutorial_free_entitlements_tutorial_id_fkey"
            columns: ["tutorial_id"]
            isOneToOne: true
            referencedRelation: "tutorials"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorial_progress: {
        Row: {
          assessment_passed: boolean
          completed_at: string | null
          id: string
          last_activity_at: string
          last_watched_at: string | null
          learner_id: string
          playback_position_seconds: number
          progress_percent: number
          started_at: string
          tutorial_id: string
          video_percent_watched: number
          watched_seconds: number
        }
        Insert: {
          assessment_passed?: boolean
          completed_at?: string | null
          id?: string
          last_activity_at?: string
          last_watched_at?: string | null
          learner_id: string
          playback_position_seconds?: number
          progress_percent?: number
          started_at?: string
          tutorial_id: string
          video_percent_watched?: number
          watched_seconds?: number
        }
        Update: {
          assessment_passed?: boolean
          completed_at?: string | null
          id?: string
          last_activity_at?: string
          last_watched_at?: string | null
          learner_id?: string
          playback_position_seconds?: number
          progress_percent?: number
          started_at?: string
          tutorial_id?: string
          video_percent_watched?: number
          watched_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "tutorial_progress_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learner_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tutorial_progress_tutorial_id_fkey"
            columns: ["tutorial_id"]
            isOneToOne: false
            referencedRelation: "tutorials"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorial_quiz_answers: {
        Row: {
          correct_option_id: string
          explanation: string | null
          question_id: string
        }
        Insert: {
          correct_option_id: string
          explanation?: string | null
          question_id: string
        }
        Update: {
          correct_option_id?: string
          explanation?: string | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutorial_quiz_answers_correct_option_id_question_id_fkey"
            columns: ["correct_option_id", "question_id"]
            isOneToOne: false
            referencedRelation: "tutorial_quiz_options"
            referencedColumns: ["id", "question_id"]
          },
          {
            foreignKeyName: "tutorial_quiz_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "tutorial_quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorial_quiz_options: {
        Row: {
          id: string
          option_text: string
          position: number
          question_id: string
        }
        Insert: {
          id?: string
          option_text: string
          position: number
          question_id: string
        }
        Update: {
          id?: string
          option_text?: string
          position?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutorial_quiz_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "tutorial_quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorial_quiz_questions: {
        Row: {
          created_at: string
          id: string
          position: number
          prompt: string
          quiz_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          position: number
          prompt: string
          quiz_id: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          prompt?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutorial_quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorials: {
        Row: {
          category_id: string | null
          content_url: string | null
          created_at: string
          description: string | null
          difficulty: string
          duration_seconds: number | null
          id: string
          is_published: boolean
          playback_id: string | null
          position: number
          price_amount: number | null
          price_type: string
          publication_number: number | null
          published_at: string | null
          slug: string
          status: string
          subcategory: string | null
          subject_id: string | null
          summary: string | null
          title: string
          tutor_id: string
          updated_at: string
          video_asset_id: string | null
          video_processing_status: string
          video_provider: string | null
          video_upload_id: string | null
        }
        Insert: {
          category_id?: string | null
          content_url?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string
          duration_seconds?: number | null
          id?: string
          is_published?: boolean
          playback_id?: string | null
          position: number
          price_amount?: number | null
          price_type?: string
          publication_number?: number | null
          published_at?: string | null
          slug: string
          status?: string
          subcategory?: string | null
          subject_id?: string | null
          summary?: string | null
          title: string
          tutor_id: string
          updated_at?: string
          video_asset_id?: string | null
          video_processing_status?: string
          video_provider?: string | null
          video_upload_id?: string | null
        }
        Update: {
          category_id?: string | null
          content_url?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string
          duration_seconds?: number | null
          id?: string
          is_published?: boolean
          playback_id?: string | null
          position?: number
          price_amount?: number | null
          price_type?: string
          publication_number?: number | null
          published_at?: string | null
          slug?: string
          status?: string
          subcategory?: string | null
          subject_id?: string | null
          summary?: string | null
          title?: string
          tutor_id?: string
          updated_at?: string
          video_asset_id?: string | null
          video_processing_status?: string
          video_provider?: string | null
          video_upload_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tutorials_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tutorial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutorials_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutorials_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tutorials_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_reputation"
            referencedColumns: ["tutor_id"]
          },
        ]
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          tutor_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          tutor_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_follows_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_reputation"
            referencedColumns: ["tutor_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string
          created_at: string
          display_name: string
          id: string
          updated_at: string
          username: string
          x_avatar_url: string | null
          x_display_name: string | null
          x_user_id: string
          x_username: string | null
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          display_name: string
          id?: string
          updated_at?: string
          username: string
          x_avatar_url?: string | null
          x_display_name?: string | null
          x_user_id: string
          x_username?: string | null
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
          username?: string
          x_avatar_url?: string | null
          x_display_name?: string | null
          x_user_id?: string
          x_username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      tutor_reputation: {
        Row: {
          adjusted_educational_rating: number | null
          educational_rating: number | null
          eligible_review_count: number | null
          engaged_learner_count: number | null
          is_recognized: boolean | null
          learner_count: number | null
          published_tutorial_count: number | null
          recent_publication_count: number | null
          tutor_id: string | null
          tutorial_completion_count: number | null
          unresolved_moderation_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tutor_profiles_user_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      finalize_learning_path: {
        Args: { p_learner_id: string; p_learning_path_id: string }
        Returns: boolean
      }
      finalize_tutorial_progress: {
        Args: {
          p_attempt_id: string
          p_learner_id: string
          p_quiz_id: string
          p_tutorial_id: string
        }
        Returns: boolean
      }
      publish_learner_xp: {
        Args: {
          p_learner_id: string
          p_reward_type: string
          p_source_id: string
        }
        Returns: number
      }
      publish_tutorial: {
        Args: {
          p_price_amount?: number
          p_price_type: string
          p_tutor_id: string
          p_tutorial_id: string
        }
        Returns: {
          price_amount: number
          price_type: string
          publication_number: number
        }[]
      }
      record_tutorial_watch: {
        Args: {
          p_learner_id: string
          p_playback_position_seconds: number
          p_tutorial_id: string
        }
        Returns: number
      }
      register_live_class: {
        Args: { p_learner_id: string; p_live_class_id: string }
        Returns: boolean
      }
      tutorial_is_free: { Args: { p_tutorial_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "learner" | "tutor"
      credential_status: "pending" | "active" | "revoked" | "failed"
      credential_type: "learner" | "tutor"
      learning_event_type:
        | "tutorial_completed"
        | "activity_completed"
        | "quiz_completed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["learner", "tutor"],
      credential_status: ["pending", "active", "revoked", "failed"],
      credential_type: ["learner", "tutor"],
      learning_event_type: [
        "tutorial_completed",
        "activity_completed",
        "quiz_completed",
      ],
    },
  },
} as const

