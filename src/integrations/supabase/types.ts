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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      assets: {
        Row: {
          asset_class_pro: Json | null
          buy_price: number
          created_at: string
          current_price: number
          geography: Json | null
          id: string
          name: string
          sectors: Json | null
          shares: number
          ticker: string
          type: string
          user_id: string | null
        }
        Insert: {
          asset_class_pro?: Json | null
          buy_price?: number
          created_at?: string
          current_price?: number
          geography?: Json | null
          id?: string
          name: string
          sectors?: Json | null
          shares?: number
          ticker: string
          type: string
          user_id?: string | null
        }
        Update: {
          asset_class_pro?: Json | null
          buy_price?: number
          created_at?: string
          current_price?: number
          geography?: Json | null
          id?: string
          name?: string
          sectors?: Json | null
          shares?: number
          ticker?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      portfolio_settings: {
        Row: {
          api_key: string | null
          cash_balance: number
          created_at: string
          historical_data: Json | null
          id: string
          user_id: string | null
        }
        Insert: {
          api_key?: string | null
          cash_balance?: number
          created_at?: string
          historical_data?: Json | null
          id?: string
          user_id?: string | null
        }
        Update: {
          api_key?: string | null
          cash_balance?: number
          created_at?: string
          historical_data?: Json | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      robo_advisors: {
        Row: {
          allocations: Json | null
          asset_class_pro: Json | null
          created_at: string
          geography: Json | null
          id: string
          invested_value: number
          last_updated: string | null
          movements: Json | null
          name: string
          sector_allocations: Json | null
          sectors: Json | null
          sub_funds: Json | null
          total_value: number
          user_id: string | null
        }
        Insert: {
          allocations?: Json | null
          asset_class_pro?: Json | null
          created_at?: string
          geography?: Json | null
          id?: string
          invested_value?: number
          last_updated?: string | null
          movements?: Json | null
          name: string
          sector_allocations?: Json | null
          sectors?: Json | null
          sub_funds?: Json | null
          total_value?: number
          user_id?: string | null
        }
        Update: {
          allocations?: Json | null
          asset_class_pro?: Json | null
          created_at?: string
          geography?: Json | null
          id?: string
          invested_value?: number
          last_updated?: string | null
          movements?: Json | null
          name?: string
          sector_allocations?: Json | null
          sectors?: Json | null
          sub_funds?: Json | null
          total_value?: number
          user_id?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          asset_id: string | null
          created_at: string
          date: string
          description: string | null
          id: string
          robo_advisor_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          asset_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          robo_advisor_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          asset_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          robo_advisor_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_robo_advisor_id_fkey"
            columns: ["robo_advisor_id"]
            isOneToOne: false
            referencedRelation: "robo_advisors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
