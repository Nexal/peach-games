Initialising login role...
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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      clan_items: {
        Row: {
          activated_at: string | null
          active: boolean | null
          cooldown_seconds: number | null
          created_at: string | null
          description: string | null
          duration_seconds: number | null
          effect: Json
          id: string
          klan_id: string | null
          name: string
          target_type: string
          type: string
          uses_remaining: number | null
        }
        Insert: {
          activated_at?: string | null
          active?: boolean | null
          cooldown_seconds?: number | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          effect: Json
          id?: string
          klan_id?: string | null
          name: string
          target_type: string
          type: string
          uses_remaining?: number | null
        }
        Update: {
          activated_at?: string | null
          active?: boolean | null
          cooldown_seconds?: number | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          effect?: Json
          id?: string
          klan_id?: string | null
          name?: string
          target_type?: string
          type?: string
          uses_remaining?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clan_items_klan_id_fkey"
            columns: ["klan_id"]
            isOneToOne: false
            referencedRelation: "klans"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          created_at: string | null
          description: string | null
          ends_at: string | null
          id: string
          name: string
          starts_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          name: string
          starts_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          name?: string
          starts_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      klans: {
        Row: {
          game_id: string | null
          id: string
          name: string
          points: number | null
          theme_color: string
        }
        Insert: {
          game_id?: string | null
          id?: string
          name: string
          points?: number | null
          theme_color: string
        }
        Update: {
          game_id?: string | null
          id?: string
          name?: string
          points?: number | null
          theme_color?: string
        }
        Relationships: [
          {
            foreignKeyName: "klans_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "klans_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games_status"
            referencedColumns: ["id"]
          },
        ]
      }
      map_markers: {
        Row: {
          created_at: string | null
          description: string | null
          game_id: string | null
          icon_url: string | null
          id: string
          is_active: boolean | null
          klan_id: string | null
          lat: number
          lng: number
          quest_id: string | null
          reward_points: number | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          game_id?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          klan_id?: string | null
          lat: number
          lng: number
          quest_id?: string | null
          reward_points?: number | null
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          game_id?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          klan_id?: string | null
          lat?: number
          lng?: number
          quest_id?: string | null
          reward_points?: number | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "map_markers_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_markers_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_markers_klan_id_fkey"
            columns: ["klan_id"]
            isOneToOne: false
            referencedRelation: "klans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_markers_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          audio_url: string | null
          content: string
          created_at: string | null
          game_id: string | null
          id: string
          image_url: string | null
          klan_id: string | null
          sender: string
          sender_klan_id: string | null
          tts_requested: boolean | null
        }
        Insert: {
          audio_url?: string | null
          content: string
          created_at?: string | null
          game_id?: string | null
          id?: string
          image_url?: string | null
          klan_id?: string | null
          sender: string
          sender_klan_id?: string | null
          tts_requested?: boolean | null
        }
        Update: {
          audio_url?: string | null
          content?: string
          created_at?: string | null
          game_id?: string | null
          id?: string
          image_url?: string | null
          klan_id?: string | null
          sender?: string
          sender_klan_id?: string | null
          tts_requested?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_klan_id_fkey"
            columns: ["klan_id"]
            isOneToOne: false
            referencedRelation: "klans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_klan_id_fkey"
            columns: ["sender_klan_id"]
            isOneToOne: false
            referencedRelation: "klans"
            referencedColumns: ["id"]
          },
        ]
      }
      player_positions: {
        Row: {
          accuracy: number | null
          game_id: string
          lat: number
          lng: number
          player_id: string
          updated_at: string | null
        }
        Insert: {
          accuracy?: number | null
          game_id: string
          lat: number
          lng: number
          player_id: string
          updated_at?: string | null
        }
        Update: {
          accuracy?: number | null
          game_id?: string
          lat?: number
          lng?: number
          player_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_positions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_positions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_positions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string | null
          game_id: string | null
          id: string
          joined_at: string | null
          klan_id: string | null
          name: string
          role: string | null
        }
        Insert: {
          created_at?: string | null
          game_id?: string | null
          id?: string
          joined_at?: string | null
          klan_id?: string | null
          name: string
          role?: string | null
        }
        Update: {
          created_at?: string | null
          game_id?: string | null
          id?: string
          joined_at?: string | null
          klan_id?: string | null
          name?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_klan_id_fkey"
            columns: ["klan_id"]
            isOneToOne: false
            referencedRelation: "klans"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_completions: {
        Row: {
          completed_at: string | null
          game_id: string | null
          id: string
          klan_id: string | null
          metadata: Json | null
          quest_id: string | null
        }
        Insert: {
          completed_at?: string | null
          game_id?: string | null
          id?: string
          klan_id?: string | null
          metadata?: Json | null
          quest_id?: string | null
        }
        Update: {
          completed_at?: string | null
          game_id?: string | null
          id?: string
          klan_id?: string | null
          metadata?: Json | null
          quest_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quest_completions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_completions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_completions_klan_id_fkey"
            columns: ["klan_id"]
            isOneToOne: false
            referencedRelation: "klans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_completions_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quests: {
        Row: {
          description: string | null
          game_id: string | null
          id: string
          reward_points: number | null
          title: string
          type: string
        }
        Insert: {
          description?: string | null
          game_id?: string | null
          id?: string
          reward_points?: number | null
          title: string
          type: string
        }
        Update: {
          description?: string | null
          game_id?: string | null
          id?: string
          reward_points?: number | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "quests_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quests_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games_status"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      game_status: {
        Row: {
          gracze_count: number | null
          klany_count: number | null
          questy_count: number | null
          ukonczone_count: number | null
          wiadomosci_count: number | null
        }
        Relationships: []
      }
      games_status: {
        Row: {
          created_at: string | null
          ends_at: string | null
          gracze_count: number | null
          id: string | null
          klany_count: number | null
          name: string | null
          starts_at: string | null
          status: string | null
          ukonczone_questy: number | null
        }
        Insert: {
          created_at?: string | null
          ends_at?: string | null
          gracze_count?: never
          id?: string | null
          klany_count?: never
          name?: string | null
          starts_at?: string | null
          status?: string | null
          ukonczone_questy?: never
        }
        Update: {
          created_at?: string | null
          ends_at?: string | null
          gracze_count?: never
          id?: string | null
          klany_count?: never
          name?: string | null
          starts_at?: string | null
          status?: string | null
          ukonczone_questy?: never
        }
        Relationships: []
      }
    }
    Functions: {
      create_game: {
        Args: { game_description?: string; game_name: string }
        Returns: string
      }
      get_game_player_positions: {
        Args: { p_game_id: string }
        Returns: {
          accuracy: number
          klan_id: string
          klan_name: string
          lat: number
          lng: number
          player_id: string
          player_name: string
          updated_at: string
        }[]
      }
      insert_sample_map_markers: {
        Args: {
          p_game_id: string
          p_klan_mokosz_id: string
          p_klan_perun_id: string
          p_klan_weles_id: string
        }
        Returns: undefined
      }
      reset_game: { Args: never; Returns: undefined }
      update_player_position: {
        Args: {
          p_accuracy?: number
          p_game_id: string
          p_lat: number
          p_lng: number
          p_player_id: string
        }
        Returns: undefined
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
A new version of Supabase CLI is available: v2.90.0 (currently installed v2.89.1)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
