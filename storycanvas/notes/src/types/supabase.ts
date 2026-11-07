// Mirrors the REAL tables storycanvas's own code queries against (verified
// by reading src/lib/hooks/useSupabaseQuery.ts and useCollaboration.ts there,
// not the stale supabase-schema.sql comment or the old generated types file
// — both are out of date: `bio`/`palette`/`is_admin` aren't in either).
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          username: string | null;
          created_at: string;
          is_admin: boolean | null;
          classification: string | null;
        };
        Insert: { id: string; email?: string | null; username?: string | null; created_at?: string; is_admin?: boolean | null; classification?: string | null };
        Update: { id?: string; email?: string | null; username?: string | null; created_at?: string; is_admin?: boolean | null; classification?: string | null };
        Relationships: [];
      };
      stories: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          bio: string | null;
          created_at: string;
          updated_at: string;
          settings: Json;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
          settings?: Json;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
          settings?: Json;
        };
        Relationships: [];
      };
      canvas_data: {
        Row: {
          id: string;
          story_id: string;
          canvas_type: string;
          parent_id: string | null;
          nodes: Json;
          connections: Json;
          palette: Json;
          updated_at: string;
        };
        Insert: {
          id?: string;
          story_id: string;
          canvas_type: string;
          parent_id?: string | null;
          nodes?: Json;
          connections?: Json;
          palette?: Json;
          updated_at?: string;
        };
        Update: {
          id?: string;
          story_id?: string;
          canvas_type?: string;
          parent_id?: string | null;
          nodes?: Json;
          connections?: Json;
          palette?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      story_collaborators: {
        Row: {
          id: string;
          story_id: string;
          user_id: string;
          role: string;
          invited_by: string | null;
          invited_at: string;
          accepted_at: string | null;
        };
        Insert: {
          id?: string;
          story_id: string;
          user_id: string;
          role?: string;
          invited_by?: string | null;
          invited_at?: string;
          accepted_at?: string | null;
        };
        Update: {
          id?: string;
          story_id?: string;
          user_id?: string;
          role?: string;
          invited_by?: string | null;
          invited_at?: string;
          accepted_at?: string | null;
        };
        Relationships: [];
      };
      share_tokens: {
        Row: {
          id: string;
          story_id: string;
          token: string;
          created_by: string;
          role: string;
          expires_at: string | null;
          max_uses: number | null;
          use_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          story_id: string;
          token: string;
          created_by: string;
          role?: string;
          expires_at?: string | null;
          max_uses?: number | null;
          use_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          story_id?: string;
          token?: string;
          created_by?: string;
          role?: string;
          expires_at?: string | null;
          max_uses?: number | null;
          use_count?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      feedback: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          user_id: string | null;
          user_email: string | null;
          user_name: string | null;
          type: string;
          title: string;
          description: string;
          page_url: string | null;
          browser_info: string | null;
          screen_size: string | null;
          status: string | null;
          priority: string | null;
          admin_notes: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string | null;
          user_email?: string | null;
          user_name?: string | null;
          type: string;
          title: string;
          description: string;
          page_url?: string | null;
          browser_info?: string | null;
          screen_size?: string | null;
          status?: string | null;
          priority?: string | null;
          admin_notes?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string | null;
          user_email?: string | null;
          user_name?: string | null;
          type?: string;
          title?: string;
          description?: string;
          page_url?: string | null;
          browser_info?: string | null;
          screen_size?: string | null;
          status?: string | null;
          priority?: string | null;
          admin_notes?: string | null;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      accept_share_invite: {
        Args: { invite_token: string };
        Returns: Json;
      };
    };
    Enums: { [_ in never]: never };
  };
}
