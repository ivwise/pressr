import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://iistydzmlafrxtzudlov.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlpc3R5ZHptbGFmcnh0enVkbG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MTUzNzYsImV4cCI6MjA5MjQ5MTM3Nn0.gbKUsEZmgBtcp6sSP6jskMyA_1j6-3glebY7Hj8n7_U';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          bio: string | null;
          avatar_url: string | null;
          created_at: string;
          current_streak: number;
          consistency_percentage: number;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          bio?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          current_streak?: number;
          consistency_percentage?: number;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          bio?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          current_streak?: number;
          consistency_percentage?: number;
        };
      };
      groups: {
        Row: {
          id: string;
          name: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_by?: string;
          created_at?: string;
        };
      };
      group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string;
          joined_at?: string;
        };
      };
      daily_logs: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          workout_data: any;
          nutrition_data: any;
          journal: string | null;
          photo_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          workout_data?: any;
          nutrition_data?: any;
          journal?: string | null;
          photo_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          workout_data?: any;
          nutrition_data?: any;
          journal?: string | null;
          photo_url?: string | null;
          created_at?: string;
        };
      };
      likes: {
        Row: {
          id: string;
          user_id: string;
          log_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          log_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          log_id?: string;
          created_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          user_id: string;
          log_id: string;
          text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          log_id: string;
          text: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          log_id?: string;
          text?: string;
          created_at?: string;
        };
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          content: string;
          related_user_id: string | null;
          related_log_id: string | null;
          related_group_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          content: string;
          related_user_id?: string | null;
          related_log_id?: string | null;
          related_group_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          content?: string;
          related_user_id?: string | null;
          related_log_id?: string | null;
          related_group_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
      };
    };
  };
}
