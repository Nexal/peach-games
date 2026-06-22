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
      chapter_quest_links: {
        Row: {
          chapter_id: string
          id: string
          quest_id: string
        }
        Insert: {
          chapter_id: string
          id?: string
          quest_id: string
        }
        Update: {
          chapter_id?: string
          id?: string
          quest_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_quest_links_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "story_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_quest_links_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      chase_configs: {
        Row: {
          area: Json | null
          catch_distance_m: number
          quest_id: string
          speed_mps: number
          waypoint_count: number
        }
        Insert: {
          area?: Json | null
          catch_distance_m?: number
          quest_id: string
          speed_mps?: number
          waypoint_count?: number
        }
        Update: {
          area?: Json | null
          catch_distance_m?: number
          quest_id?: string
          speed_mps?: number
          waypoint_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "chase_configs_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: true
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      chase_sessions: {
        Row: {
          bearing: number
          catch_distance_m: number | null
          completed_at: string | null
          completed_by_player_id: string | null
          game_id: string | null
          id: string
          klan_id: string | null
          quest_id: string | null
          reward_points: number | null
          speed_mps: number
          start_lat: number
          start_lng: number
          started_at: string | null
          task_id: string | null
          trajectory: Json | null
        }
        Insert: {
          bearing: number
          catch_distance_m?: number | null
          completed_at?: string | null
          completed_by_player_id?: string | null
          game_id?: string | null
          id?: string
          klan_id?: string | null
          quest_id?: string | null
          reward_points?: number | null
          speed_mps?: number
          start_lat: number
          start_lng: number
          started_at?: string | null
          task_id?: string | null
          trajectory?: Json | null
        }
        Update: {
          bearing?: number
          catch_distance_m?: number | null
          completed_at?: string | null
          completed_by_player_id?: string | null
          game_id?: string | null
          id?: string
          klan_id?: string | null
          quest_id?: string | null
          reward_points?: number | null
          speed_mps?: number
          start_lat?: number
          start_lng?: number
          started_at?: string | null
          task_id?: string | null
          trajectory?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chase_sessions_completed_by_player_id_fkey"
            columns: ["completed_by_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chase_sessions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chase_sessions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chase_sessions_klan_id_fkey"
            columns: ["klan_id"]
            isOneToOne: false
            referencedRelation: "klans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chase_sessions_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chase_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
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
      god_positions: {
        Row: {
          accuracy: number | null
          game_id: string
          god_id: string
          lat: number
          lng: number
          updated_at: string | null
        }
        Insert: {
          accuracy?: number | null
          game_id: string
          god_id: string
          lat: number
          lng: number
          updated_at?: string | null
        }
        Update: {
          accuracy?: number | null
          game_id?: string
          god_id?: string
          lat?: number
          lng?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "god_positions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "god_positions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "god_positions_god_id_fkey"
            columns: ["god_id"]
            isOneToOne: true
            referencedRelation: "gods"
            referencedColumns: ["id"]
          },
        ]
      }
      gods: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          elevenlabs_api_key: string | null
          id: string
          klan_id: string | null
          name: string
          voice_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          elevenlabs_api_key?: string | null
          id?: string
          klan_id?: string | null
          name: string
          voice_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          elevenlabs_api_key?: string | null
          id?: string
          klan_id?: string | null
          name?: string
          voice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gods_klan_id_fkey"
            columns: ["klan_id"]
            isOneToOne: false
            referencedRelation: "klans"
            referencedColumns: ["id"]
          },
        ]
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
          qr_secret: string | null
          quest_id: string | null
          reward_points: number | null
          task_id: string | null
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
          qr_secret?: string | null
          quest_id?: string | null
          reward_points?: number | null
          task_id?: string | null
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
          qr_secret?: string | null
          quest_id?: string | null
          reward_points?: number | null
          task_id?: string | null
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
          {
            foreignKeyName: "map_markers_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
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
          god_id: string | null
          id: string
          image_url: string | null
          klan_id: string | null
          player_id: string | null
          sender: string
          sender_klan_id: string | null
          tts_requested: boolean | null
        }
        Insert: {
          audio_url?: string | null
          content: string
          created_at?: string | null
          game_id?: string | null
          god_id?: string | null
          id?: string
          image_url?: string | null
          klan_id?: string | null
          player_id?: string | null
          sender: string
          sender_klan_id?: string | null
          tts_requested?: boolean | null
        }
        Update: {
          audio_url?: string | null
          content?: string
          created_at?: string | null
          game_id?: string | null
          god_id?: string | null
          id?: string
          image_url?: string | null
          klan_id?: string | null
          player_id?: string | null
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
            foreignKeyName: "messages_god_id_fkey"
            columns: ["god_id"]
            isOneToOne: false
            referencedRelation: "gods"
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
            foreignKeyName: "messages_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
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
          avatar_url: string | null
          created_at: string | null
          game_id: string | null
          id: string
          is_test: boolean | null
          joined_at: string | null
          klan_id: string | null
          name: string
          role: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          game_id?: string | null
          id?: string
          is_test?: boolean | null
          joined_at?: string | null
          klan_id?: string | null
          name: string
          role?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          game_id?: string | null
          id?: string
          is_test?: boolean | null
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
      quest_activations: {
        Row: {
          activated_at: string | null
          completed_at: string | null
          completed_by_player_id: string | null
          deactivated_at: string | null
          game_id: string
          id: string
          klan_id: string
          quest_id: string
        }
        Insert: {
          activated_at?: string | null
          completed_at?: string | null
          completed_by_player_id?: string | null
          deactivated_at?: string | null
          game_id: string
          id?: string
          klan_id: string
          quest_id: string
        }
        Update: {
          activated_at?: string | null
          completed_at?: string | null
          completed_by_player_id?: string | null
          deactivated_at?: string | null
          game_id?: string
          id?: string
          klan_id?: string
          quest_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_activations_completed_by_player_id_fkey"
            columns: ["completed_by_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_activations_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_activations_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_activations_klan_id_fkey"
            columns: ["klan_id"]
            isOneToOne: false
            referencedRelation: "klans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_activations_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_completions: {
        Row: {
          completed_at: string | null
          completed_by_player_id: string | null
          game_id: string | null
          id: string
          klan_id: string | null
          metadata: Json | null
          points_awarded: number | null
          quest_id: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_by_player_id?: string | null
          game_id?: string | null
          id?: string
          klan_id?: string | null
          metadata?: Json | null
          points_awarded?: number | null
          quest_id?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_by_player_id?: string | null
          game_id?: string | null
          id?: string
          klan_id?: string | null
          metadata?: Json | null
          points_awarded?: number | null
          quest_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quest_completions_completed_by_player_id_fkey"
            columns: ["completed_by_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
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
          icon_url: string | null
          id: string
          klan_id: string | null
          qr_secret: string | null
          requires_chapter_id: string | null
          reward_points: number | null
          show_all_markers: boolean | null
          title: string
          trajectory: Json | null
          type: string
        }
        Insert: {
          description?: string | null
          game_id?: string | null
          icon_url?: string | null
          id?: string
          klan_id?: string | null
          qr_secret?: string | null
          requires_chapter_id?: string | null
          reward_points?: number | null
          show_all_markers?: boolean | null
          title: string
          trajectory?: Json | null
          type: string
        }
        Update: {
          description?: string | null
          game_id?: string | null
          icon_url?: string | null
          id?: string
          klan_id?: string | null
          qr_secret?: string | null
          requires_chapter_id?: string | null
          reward_points?: number | null
          show_all_markers?: boolean | null
          title?: string
          trajectory?: Json | null
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
          {
            foreignKeyName: "quests_klan_id_fkey"
            columns: ["klan_id"]
            isOneToOne: false
            referencedRelation: "klans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quests_requires_chapter_id_fkey"
            columns: ["requires_chapter_id"]
            isOneToOne: false
            referencedRelation: "story_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      story_chapters: {
        Row: {
          audio_url: string | null
          chapter_number: number
          created_at: string
          game_id: string
          id: string
          is_opened: boolean
          opened_at: string | null
          story_text: string
          title: string
          video_url: string | null
        }
        Insert: {
          audio_url?: string | null
          chapter_number: number
          created_at?: string
          game_id: string
          id?: string
          is_opened?: boolean
          opened_at?: string | null
          story_text?: string
          title: string
          video_url?: string | null
        }
        Update: {
          audio_url?: string | null
          chapter_number?: number
          created_at?: string
          game_id?: string
          id?: string
          is_opened?: boolean
          opened_at?: string | null
          story_text?: string
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "story_chapters_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_chapters_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games_status"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          admin_comment: string | null
          id: string
          klan_id: string
          media_type: string
          media_url: string
          player_id: string | null
          quest_activation_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          task_id: string
        }
        Insert: {
          admin_comment?: string | null
          id?: string
          klan_id: string
          media_type: string
          media_url: string
          player_id?: string | null
          quest_activation_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          task_id: string
        }
        Update: {
          admin_comment?: string | null
          id?: string
          klan_id?: string
          media_type?: string
          media_url?: string
          player_id?: string | null
          quest_activation_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_klan_id_fkey"
            columns: ["klan_id"]
            isOneToOne: false
            referencedRelation: "klans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_quest_activation_id_fkey"
            columns: ["quest_activation_id"]
            isOneToOne: false
            referencedRelation: "quest_activations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_completions: {
        Row: {
          completed_at: string | null
          completed_by_player_id: string | null
          id: string
          metadata: Json | null
          quest_activation_id: string
          task_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_by_player_id?: string | null
          id?: string
          metadata?: Json | null
          quest_activation_id: string
          task_id: string
        }
        Update: {
          completed_at?: string | null
          completed_by_player_id?: string | null
          id?: string
          metadata?: Json | null
          quest_activation_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_completions_completed_by_player_id_fkey"
            columns: ["completed_by_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completions_quest_activation_id_fkey"
            columns: ["quest_activation_id"]
            isOneToOne: false
            referencedRelation: "quest_activations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          correct_answer: string | null
          description: string | null
          id: string
          quest_id: string
          reward_points: number | null
          sort_order: number
          title: string
          type: string
        }
        Insert: {
          correct_answer?: string | null
          description?: string | null
          id?: string
          quest_id: string
          reward_points?: number | null
          sort_order?: number
          title: string
          type: string
        }
        Update: {
          correct_answer?: string | null
          description?: string | null
          id?: string
          quest_id?: string
          reward_points?: number | null
          sort_order?: number
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
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
      get_chase_position: {
        Args: { chase_id: string }
        Returns: {
          distance_m: number
          lat: number
          lng: number
        }[]
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
      insert_noc_kupaly_skrzaty_quests: {
        Args: { p_game_id: string }
        Returns: undefined
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
