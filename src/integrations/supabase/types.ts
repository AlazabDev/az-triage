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
  public: {
    Tables: {
      document_embeddings: {
        Row: {
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          metadata: Json | null
          session_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          session_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_embeddings_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "receipt_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_embeddings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "reconciliation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      excel_snapshots: {
        Row: {
          columns: Json
          created_at: string
          id: string
          original_filename: string
          row_count: number
          rows: Json
          session_id: string
          storage_path: string | null
        }
        Insert: {
          columns?: Json
          created_at?: string
          id?: string
          original_filename: string
          row_count?: number
          rows?: Json
          session_id: string
          storage_path?: string | null
        }
        Update: {
          columns?: Json
          created_at?: string
          id?: string
          original_filename?: string
          row_count?: number
          rows?: Json
          session_id?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "excel_snapshots_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "reconciliation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      image_comments: {
        Row: {
          created_at: string
          id: string
          image_id: string
          position_x: number | null
          position_y: number | null
          project_id: string
          session_id: string | null
          status: string
          text: string
          visitor_name: string
          visitor_phone: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_id: string
          position_x?: number | null
          position_y?: number | null
          project_id: string
          session_id?: string | null
          status?: string
          text: string
          visitor_name: string
          visitor_phone?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_id?: string
          position_x?: number | null
          position_y?: number | null
          project_id?: string
          session_id?: string | null
          status?: string
          text?: string
          visitor_name?: string
          visitor_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "image_comments_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "project_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      item_embeddings: {
        Row: {
          content: string
          created_at: string
          embedding: string | null
          id: string
          item_id: string
          metadata: Json | null
          session_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          item_id: string
          metadata?: Json | null
          session_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          item_id?: string
          metadata?: Json | null
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_embeddings_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "receipt_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_embeddings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "reconciliation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          job_title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          job_title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          job_title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_images: {
        Row: {
          caption: string | null
          captured_at: string | null
          created_at: string
          id: string
          image_url: string
          phase: string | null
          project_id: string
          sort_order: number
        }
        Insert: {
          caption?: string | null
          captured_at?: string | null
          created_at?: string
          id?: string
          image_url: string
          phase?: string | null
          project_id: string
          sort_order?: number
        }
        Update: {
          caption?: string | null
          captured_at?: string | null
          created_at?: string
          id?: string
          image_url?: string
          phase?: string | null
          project_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_images_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          location: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          location?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          location?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      receipt_documents: {
        Row: {
          created_at: string
          document_number: number
          id: string
          original_filename: string
          page_count: number
          session_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          document_number: number
          id?: string
          original_filename: string
          page_count?: number
          session_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          document_number?: number
          id?: string
          original_filename?: string
          page_count?: number
          session_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_documents_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "reconciliation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_items: {
        Row: {
          ai_raw: Json | null
          corrected_description: string | null
          created_at: string
          description: string
          id: string
          item_code: string
          item_index: number
          match_score: number | null
          match_status: string
          matched_excel_row: Json | null
          page_id: string
          quantity: number | null
          reviewer_note: string | null
          session_id: string
          total: number | null
          unit: string | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          ai_raw?: Json | null
          corrected_description?: string | null
          created_at?: string
          description: string
          id?: string
          item_code: string
          item_index: number
          match_score?: number | null
          match_status?: string
          matched_excel_row?: Json | null
          page_id: string
          quantity?: number | null
          reviewer_note?: string | null
          session_id: string
          total?: number | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          ai_raw?: Json | null
          corrected_description?: string | null
          created_at?: string
          description?: string
          id?: string
          item_code?: string
          item_index?: number
          match_score?: number | null
          match_status?: string
          matched_excel_row?: Json | null
          page_id?: string
          quantity?: number | null
          reviewer_note?: string | null
          session_id?: string
          total?: number | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_items_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "receipt_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "reconciliation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_pages: {
        Row: {
          branch: string | null
          created_at: string
          document_id: string
          extraction_error: string | null
          extraction_status: string
          id: string
          image_path: string
          invoice_number: string | null
          page_index: number
          receipt_code: string
          receipt_date: string | null
          review_status: string
          reviewer_note: string | null
          session_id: string
          supplier: string | null
          updated_at: string
        }
        Insert: {
          branch?: string | null
          created_at?: string
          document_id: string
          extraction_error?: string | null
          extraction_status?: string
          id?: string
          image_path: string
          invoice_number?: string | null
          page_index: number
          receipt_code: string
          receipt_date?: string | null
          review_status?: string
          reviewer_note?: string | null
          session_id: string
          supplier?: string | null
          updated_at?: string
        }
        Update: {
          branch?: string | null
          created_at?: string
          document_id?: string
          extraction_error?: string | null
          extraction_status?: string
          id?: string
          image_path?: string
          invoice_number?: string | null
          page_index?: number
          receipt_code?: string
          receipt_date?: string | null
          review_status?: string
          reviewer_note?: string | null
          session_id?: string
          supplier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_pages_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "receipt_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_pages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "reconciliation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_sessions: {
        Row: {
          branch: string | null
          client_approved_at: string | null
          client_approved_by: string | null
          created_at: string
          id: string
          is_public: boolean
          name: string
          notes: string | null
          owner_id: string
          session_date: string | null
          share_token: string | null
          status: string
          updated_at: string
        }
        Insert: {
          branch?: string | null
          client_approved_at?: string | null
          client_approved_by?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          name: string
          notes?: string | null
          owner_id: string
          session_date?: string | null
          share_token?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          branch?: string | null
          client_approved_at?: string | null
          client_approved_by?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          name?: string
          notes?: string | null
          owner_id?: string
          session_date?: string | null
          share_token?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      supcloud_keepalive: {
        Row: {
          id: number
          marker: string
        }
        Insert: {
          id: number
          marker?: string
        }
        Update: {
          id?: number
          marker?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
