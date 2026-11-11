export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string
          priority: 'low' | 'medium' | 'high'
          category: string
          due_date: string | null
          status: 'pending' | 'completed'
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string
          priority?: 'low' | 'medium' | 'high'
          category?: string
          due_date?: string | null
          status?: 'pending' | 'completed'
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string
          priority?: 'low' | 'medium' | 'high'
          category?: string
          due_date?: string | null
          status?: 'pending' | 'completed'
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string
          category: string
          is_pinned: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          content?: string
          category?: string
          is_pinned?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: string
          category?: string
          is_pinned?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      nexora_demo_seed_records: {
        Row: {
          seed_key: string
          record_type: 'task' | 'note'
          record_id: string
          user_id: string
          expected_data: Record<string, unknown>
          created_at: string
        }
        Insert: {
          seed_key: string
          record_type: 'task' | 'note'
          record_id: string
          user_id: string
          expected_data: Record<string, unknown>
          created_at?: string
        }
        Update: {
          seed_key?: string
          record_type?: 'task' | 'note'
          record_id?: string
          user_id?: string
          expected_data?: Record<string, unknown>
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      seed_demo_record: {
        Args: {
          p_seed_key: string
          p_record_type: string
          p_record_id: string
          p_user_id: string
          p_record: Record<string, unknown>
        }
        Returns: string
      }
      cleanup_demo_record: {
        Args: {
          p_seed_key: string
          p_record_type: string
          p_record_id: string
          p_user_id: string
          p_expected_data: Record<string, unknown>
        }
        Returns: boolean
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
