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
      badges: {
        Row: {
          badge_key: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          badge_key: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          badge_key?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      food_items: {
        Row: {
          category: string
          consumed_at: string | null
          created_at: string
          estimated_cost_sgd: number | null
          estimated_weight_kg: number | null
          expiry_date: string
          id: string
          image_url: string | null
          is_flagged: boolean
          name: string
          status: Database["public"]["Enums"]["food_status"]
          updated_at: string
          user_id: string
          wasted_at: string | null
        }
        Insert: {
          category?: string
          consumed_at?: string | null
          created_at?: string
          estimated_cost_sgd?: number | null
          estimated_weight_kg?: number | null
          expiry_date: string
          id?: string
          image_url?: string | null
          is_flagged?: boolean
          name: string
          status?: Database["public"]["Enums"]["food_status"]
          updated_at?: string
          user_id: string
          wasted_at?: string | null
        }
        Update: {
          category?: string
          consumed_at?: string | null
          created_at?: string
          estimated_cost_sgd?: number | null
          estimated_weight_kg?: number | null
          expiry_date?: string
          id?: string
          image_url?: string | null
          is_flagged?: boolean
          name?: string
          status?: Database["public"]["Enums"]["food_status"]
          updated_at?: string
          user_id?: string
          wasted_at?: string | null
        }
        Relationships: []
      }
      ingestion_queue: {
        Row: {
          created_at: string
          error_message: string | null
          extracted_category: string | null
          extracted_cost_sgd: number | null
          extracted_date: string | null
          extracted_name: string | null
          extracted_weight_kg: number | null
          id: string
          image_path: string | null
          input_type: string
          is_flagged: boolean | null
          raw_payload: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          extracted_category?: string | null
          extracted_cost_sgd?: number | null
          extracted_date?: string | null
          extracted_name?: string | null
          extracted_weight_kg?: number | null
          id?: string
          image_path?: string | null
          input_type?: string
          is_flagged?: boolean | null
          raw_payload?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          extracted_category?: string | null
          extracted_cost_sgd?: number | null
          extracted_date?: string | null
          extracted_name?: string | null
          extracted_weight_kg?: number | null
          id?: string
          image_path?: string | null
          input_type?: string
          is_flagged?: boolean | null
          raw_payload?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      recipe_cache: {
        Row: {
          cache_key: string
          cached_at: string
          id: string
          image_url: string | null
          likes: number | null
          missed_ingredients: Json | null
          payload: Json | null
          ready_minutes: number | null
          servings: number | null
          source_url: string | null
          spoonacular_id: number
          title: string
          used_ingredients: Json | null
        }
        Insert: {
          cache_key: string
          cached_at?: string
          id?: string
          image_url?: string | null
          likes?: number | null
          missed_ingredients?: Json | null
          payload?: Json | null
          ready_minutes?: number | null
          servings?: number | null
          source_url?: string | null
          spoonacular_id: number
          title: string
          used_ingredients?: Json | null
        }
        Update: {
          cache_key?: string
          cached_at?: string
          id?: string
          image_url?: string | null
          likes?: number | null
          missed_ingredients?: Json | null
          payload?: Json | null
          ready_minutes?: number | null
          servings?: number | null
          source_url?: string | null
          spoonacular_id?: number
          title?: string
          used_ingredients?: Json | null
        }
        Relationships: []
      }
      recipe_history: {
        Row: {
          action: string
          created_at: string
          id: string
          image_url: string | null
          ingredients_used: Json | null
          spoonacular_id: number
          title: string | null
          user_id: string
          waste_saved_sgd: number | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          image_url?: string | null
          ingredients_used?: Json | null
          spoonacular_id: number
          title?: string | null
          user_id: string
          waste_saved_sgd?: number | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          image_url?: string | null
          ingredients_used?: Json | null
          spoonacular_id?: number
          title?: string | null
          user_id?: string
          waste_saved_sgd?: number | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          default_expiry_days: number
          household_size: number
          notify_days_before: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_expiry_days?: number
          household_size?: number
          notify_days_before?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_expiry_days?: number
          household_size?: number
          notify_days_before?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      analytics_overview: {
        Args: { p_end: string; p_start: string }
        Returns: {
          items_consumed: number
          items_wasted: number
          kg_avoided: number
          kg_wasted: number
          meals_cooked: number
          money_saved_sgd: number
          streak_days: number
          total_kg_avoided_all_time: number
          total_money_saved_all_time: number
        }[]
      }
      analytics_series: {
        Args: { p_bucket: string; p_end: string; p_start: string }
        Returns: {
          bucket_start: string
          kg_avoided: number
          kg_wasted: number
        }[]
      }
      commit_approved_items: { Args: never; Returns: number }
      expire_overdue_items: { Args: never; Returns: number }
    }
    Enums: {
      food_status: "active" | "consumed" | "wasted" | "expired"
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
      food_status: ["active", "consumed", "wasted", "expired"],
    },
  },
} as const
