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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      coach_availability: {
        Row: {
          available_date: string
          coach_id: string
          end_time: string
          id: string
          is_booked: boolean | null
          start_time: string
        }
        Insert: {
          available_date: string
          coach_id: string
          end_time: string
          id?: string
          is_booked?: boolean | null
          start_time: string
        }
        Update: {
          available_date?: string
          coach_id?: string
          end_time?: string
          id?: string
          is_booked?: boolean | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_availability_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_sessions: {
        Row: {
          coach_id: string
          coach_notes: string | null
          created_at: string | null
          ended_at: string | null
          id: string
          scheduled_at: string
          status: Database["public"]["Enums"]["coaching_session_status"] | null
          user_id: string
          video_room_id: string | null
        }
        Insert: {
          coach_id: string
          coach_notes?: string | null
          created_at?: string | null
          ended_at?: string | null
          id?: string
          scheduled_at: string
          status?: Database["public"]["Enums"]["coaching_session_status"] | null
          user_id: string
          video_room_id?: string | null
        }
        Update: {
          coach_id?: string
          coach_notes?: string | null
          created_at?: string | null
          ended_at?: string | null
          id?: string
          scheduled_at?: string
          status?: Database["public"]["Enums"]["coaching_session_status"] | null
          user_id?: string
          video_room_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coaching_sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_logs: {
        Row: {
          ai_feedback: string | null
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          is_completed: boolean | null
          log_date: string
          log_type: Database["public"]["Enums"]["daily_log_type"]
          points_earned: number | null
          user_id: string
        }
        Insert: {
          ai_feedback?: string | null
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_completed?: boolean | null
          log_date?: string
          log_type: Database["public"]["Enums"]["daily_log_type"]
          points_earned?: number | null
          user_id: string
        }
        Update: {
          ai_feedback?: string | null
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_completed?: boolean | null
          log_date?: string
          log_type?: Database["public"]["Enums"]["daily_log_type"]
          points_earned?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_connections: {
        Row: {
          code_expires_at: string | null
          connected_at: string | null
          connection_code: string | null
          guardian_id: string
          id: string
          user_id: string
        }
        Insert: {
          code_expires_at?: string | null
          connected_at?: string | null
          connection_code?: string | null
          guardian_id: string
          id?: string
          user_id: string
        }
        Update: {
          code_expires_at?: string | null
          connected_at?: string | null
          connection_code?: string | null
          guardian_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardian_connections_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      health_records: {
        Row: {
          coach_comment: string | null
          created_at: string | null
          health_age: number | null
          health_tags: string[] | null
          id: string
          parsed_data: Json | null
          raw_image_urls: string[]
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["health_record_status"] | null
          user_id: string
        }
        Insert: {
          coach_comment?: string | null
          created_at?: string | null
          health_age?: number | null
          health_tags?: string[] | null
          id?: string
          parsed_data?: Json | null
          raw_image_urls: string[]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["health_record_status"] | null
          user_id: string
        }
        Update: {
          coach_comment?: string | null
          created_at?: string | null
          health_age?: number | null
          health_tags?: string[] | null
          id?: string
          parsed_data?: Json | null
          raw_image_urls?: string[]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["health_record_status"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_records_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_templates: {
        Row: {
          coach_id: string | null
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          points: number | null
          user_id: string
        }
        Insert: {
          coach_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          points?: number | null
          user_id: string
        }
        Update: {
          coach_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          points?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_templates_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      point_history: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string | null
          description: string | null
          health_tags: string[] | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price: number
          purchase_link: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          health_tags?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price: number
          purchase_link?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          health_tags?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price?: number
          purchase_link?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          assigned_coach_id: string | null
          created_at: string | null
          current_points: number | null
          id: string
          nickname: string | null
          phone: string | null
          subscription_tier:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at: string | null
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Insert: {
          assigned_coach_id?: string | null
          created_at?: string | null
          current_points?: number | null
          id: string
          nickname?: string | null
          phone?: string | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Update: {
          assigned_coach_id?: string | null
          created_at?: string | null
          current_points?: number | null
          id?: string
          nickname?: string | null
          phone?: string | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_assigned_coach_id_fkey"
            columns: ["assigned_coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          payer_id: string
          payment_method: string | null
          plan_type: string
          price: number
          started_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          payer_id: string
          payment_method?: string | null
          plan_type: string
          price: number
          started_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          payer_id?: string
          payment_method?: string | null
          plan_type?: string
          price?: number
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "coach" | "guardian" | "user"
      coaching_session_status:
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled"
      daily_log_type: "food" | "mission"
      health_record_status:
        | "uploading"
        | "analyzing"
        | "pending_review"
        | "completed"
        | "rejected"
      subscription_tier: "basic" | "premium"
      user_type: "user" | "guardian" | "coach" | "admin"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "coach", "guardian", "user"],
      coaching_session_status: [
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
      ],
      daily_log_type: ["food", "mission"],
      health_record_status: [
        "uploading",
        "analyzing",
        "pending_review",
        "completed",
        "rejected",
      ],
      subscription_tier: ["basic", "premium"],
      user_type: ["user", "guardian", "coach", "admin"],
    },
  },
} as const
