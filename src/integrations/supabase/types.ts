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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      class_reports: {
        Row: {
          academic_year: string | null
          attachments: string[] | null
          class_hour: string | null
          course_id: string | null
          created_at: string
          department_id: string | null
          end_time: string | null
          id: string
          instructor_attended: boolean | null
          instructor_id: string | null
          instructor_name: string | null
          issues: string | null
          remarks: string | null
          report_date: string
          section_id: string | null
          section_name: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["report_status"]
          students_absent: number
          students_present: number
          students_total: number
          submitted_at: string | null
          teaching_method: Database["public"]["Enums"]["teaching_method"]
          topic_covered: string
          updated_at: string
        }
        Insert: {
          academic_year?: string | null
          attachments?: string[] | null
          class_hour?: string | null
          course_id?: string | null
          created_at?: string
          department_id?: string | null
          end_time?: string | null
          id?: string
          instructor_attended?: boolean | null
          instructor_id?: string | null
          instructor_name?: string | null
          issues?: string | null
          remarks?: string | null
          report_date?: string
          section_id?: string | null
          section_name?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          students_absent?: number
          students_present?: number
          students_total?: number
          submitted_at?: string | null
          teaching_method?: Database["public"]["Enums"]["teaching_method"]
          topic_covered: string
          updated_at?: string
        }
        Update: {
          academic_year?: string | null
          attachments?: string[] | null
          class_hour?: string | null
          course_id?: string | null
          created_at?: string
          department_id?: string | null
          end_time?: string | null
          id?: string
          instructor_attended?: boolean | null
          instructor_id?: string | null
          instructor_name?: string | null
          issues?: string | null
          remarks?: string | null
          report_date?: string
          section_id?: string | null
          section_name?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          students_absent?: number
          students_present?: number
          students_total?: number
          submitted_at?: string | null
          teaching_method?: Database["public"]["Enums"]["teaching_method"]
          topic_covered?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_reports_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_reports_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_reports_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      colleges: {
        Row: {
          address: string | null
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          code: string
          created_at: string
          credits: number
          description: string | null
          id: string
          is_active: boolean
          name: string
          program_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          credits?: number
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          program_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          credits?: number
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          program_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          college_id: string
          created_at: string
          description: string | null
          head_id: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          college_id: string
          created_at?: string
          description?: string | null
          head_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          college_id?: string
          created_at?: string
          description?: string | null
          head_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_links: {
        Row: {
          college_id: string | null
          created_at: string
          created_by: string
          department_id: string | null
          email: string | null
          expires_at: string
          id: string
          is_active: boolean
          role_id: string | null
          token: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          college_id?: string | null
          created_at?: string
          created_by: string
          department_id?: string | null
          email?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean
          role_id?: string | null
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          college_id?: string | null
          created_at?: string
          created_by?: string
          department_id?: string | null
          email?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean
          role_id?: string | null
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_links_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_links_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_links_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_id: string | null
          related_table: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_id?: string | null
          related_table?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_id?: string | null
          related_table?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          name: string
          resource: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          resource: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          resource?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          code: string
          created_at: string
          department_id: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          department_id: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          department_id?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      report_approvals: {
        Row: {
          comments: string | null
          created_at: string
          id: string
          report_id: string
          reviewed_at: string | null
          reviewer_id: string
          status: Database["public"]["Enums"]["approval_status"]
        }
        Insert: {
          comments?: string | null
          created_at?: string
          id?: string
          report_id: string
          reviewed_at?: string | null
          reviewer_id: string
          status?: Database["public"]["Enums"]["approval_status"]
        }
        Update: {
          comments?: string | null
          created_at?: string
          id?: string
          report_id?: string
          reviewed_at?: string | null
          reviewer_id?: string
          status?: Database["public"]["Enums"]["approval_status"]
        }
        Relationships: [
          {
            foreignKeyName: "report_approvals_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "class_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          level: number
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          level?: number
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          level?: number
          name?: string
        }
        Relationships: []
      }
      sections: {
        Row: {
          academic_year: string | null
          code: string
          course_id: string
          created_at: string
          id: string
          instructor_id: string
          is_active: boolean
          max_students: number | null
          name: string
          semester: string | null
          updated_at: string
        }
        Insert: {
          academic_year?: string | null
          code: string
          course_id: string
          created_at?: string
          id?: string
          instructor_id: string
          is_active?: boolean
          max_students?: number | null
          name: string
          semester?: string | null
          updated_at?: string
        }
        Update: {
          academic_year?: string | null
          code?: string
          course_id?: string
          created_at?: string
          id?: string
          instructor_id?: string
          is_active?: boolean
          max_students?: number | null
          name?: string
          semester?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_colleges: {
        Row: {
          college_id: string
          id: string
          user_id: string
        }
        Insert: {
          college_id: string
          id?: string
          user_id: string
        }
        Update: {
          college_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_colleges_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_departments: {
        Row: {
          department_id: string
          id: string
          user_id: string
        }
        Insert: {
          department_id: string
          id?: string
          user_id: string
        }
        Update: {
          department_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_college_department_ids: {
        Args: { _user_id: string }
        Returns: string[]
      }
      get_user_department_ids: { Args: { _user_id: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "college_admin"
        | "department_head"
        | "instructor"
        | "deputy_department_head"
      approval_status: "pending" | "approved" | "rejected"
      notification_type: "info" | "success" | "warning" | "error"
      report_status:
        | "draft"
        | "submitted"
        | "approved"
        | "rejected"
        | "dept_head_approved"
      teaching_method:
        | "lecture"
        | "lab"
        | "seminar"
        | "workshop"
        | "online"
        | "hybrid"
        | "tutorial"
        | "other"
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
      app_role: [
        "super_admin",
        "college_admin",
        "department_head",
        "instructor",
        "deputy_department_head",
      ],
      approval_status: ["pending", "approved", "rejected"],
      notification_type: ["info", "success", "warning", "error"],
      report_status: [
        "draft",
        "submitted",
        "approved",
        "rejected",
        "dept_head_approved",
      ],
      teaching_method: [
        "lecture",
        "lab",
        "seminar",
        "workshop",
        "online",
        "hybrid",
        "tutorial",
        "other",
      ],
    },
  },
} as const
