// Hand-written to mirror supabase/migrations/*.sql exactly.
// Regenerate with `supabase gen types typescript` once a live project exists,
// and diff against this file rather than blindly overwriting it.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "owner" | "editor" | "viewer";
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "suspended"
  | "canceled";
export type WebinarStatus = "draft" | "published" | "archived";
export type ScheduleMode = "fixed" | "just_in_time" | "both";
export type CtaType = "link" | "poll" | "overlay";
export type ChatMessageType = "message" | "question" | "host_reply";
export type ViewerEventType =
  | "join"
  | "heartbeat"
  | "leave"
  | "cta_click"
  | "poll_response";
export type EmailTemplateType =
  | "registration_confirmation"
  | "reminder"
  | "replay_missed";
export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";
export type LeadStatus = "new" | "contacted" | "converted" | "closed";

export interface Database {
  public: {
    Tables: {
      plans: {
        Row: {
          id: string;
          key: "core" | "pro" | "business" | "enterprise";
          name: string;
          price_annual_usd: number | null;
          price_monthly_usd: number | null;
          max_active_webinars: number | null;
          max_users: number | null;
          max_attendees_per_webinar: number | null;
          max_ai_replies_per_month: number | null;
          max_registrants_per_month: number | null;
          features: Json;
          is_self_serve: boolean;
          stripe_price_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["plans"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["plans"]["Row"]>;
        Relationships: [];
      };
      accounts: {
        Row: {
          id: string;
          name: string;
          slug: string;
          branding: Json;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          subscription_status: SubscriptionStatus;
          plan_id: string | null;
          timezone_default: string;
          grace_period_days: number;
          suspended_at: string | null;
          trial_ends_at: string;
          trial_warning_sent_at: string | null;
          last_digest_sent_at: string | null;
          activation_nudge_sent_at: string | null;
          digest_unsubscribed_at: string | null;
          unsubscribe_token: string;
          brevo_api_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["accounts"]["Row"]> & {
          name: string;
          slug: string;
        };
        Update: Partial<Database["public"]["Tables"]["accounts"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "accounts_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          id: string;
          account_id: string | null;
          email: string;
          role: UserRole;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["users"]["Row"]> & {
          id: string;
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "users_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_admins: {
        Row: { user_id: string; created_at: string };
        Insert: { user_id: string; created_at?: string };
        Update: Partial<{ user_id: string; created_at: string }>;
        Relationships: [];
      };
      account_invitations: {
        Row: {
          id: string;
          account_id: string;
          email: string;
          role: UserRole;
          invited_by: string;
          token: string;
          status: InvitationStatus;
          expires_at: string;
          created_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["account_invitations"]["Row"]
        > & {
          account_id: string;
          email: string;
          invited_by: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["account_invitations"]["Row"]
        >;
        Relationships: [
          {
            foreignKeyName: "account_invitations_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      webinars: {
        Row: {
          id: string;
          account_id: string;
          presenter_user_id: string | null;
          presenter_name: string | null;
          presenter_avatar_url: string | null;
          presenter_bio: string | null;
          facebook_pixel_id: string | null;
          brevo_list_id: number | null;
          title: string;
          slug: string;
          description: string | null;
          category: string | null;
          youtube_video_id: string | null;
          duration_seconds: number | null;
          schedule_mode: ScheduleMode;
          just_in_time_offsets_minutes: number[];
          status: WebinarStatus;
          attendee_count: number;
          fake_viewer_min: number;
          fake_viewer_max: number;
          ai_chat_enabled: boolean;
          ai_agent_training_info: string | null;
          published_at: string | null;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["webinars"]["Row"]> & {
          account_id: string;
          title: string;
          slug: string;
        };
        Update: Partial<Database["public"]["Tables"]["webinars"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "webinars_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      webinar_schedules: {
        Row: {
          id: string;
          webinar_id: string;
          day_of_week: number | null;
          time_of_day: string;
          timezone: string;
          is_active: boolean;
          exclude_weekends: boolean;
          created_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["webinar_schedules"]["Row"]
        > & {
          webinar_id: string;
          time_of_day: string;
          timezone: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["webinar_schedules"]["Row"]
        >;
        Relationships: [
          {
            foreignKeyName: "webinar_schedules_webinar_id_fkey";
            columns: ["webinar_id"];
            isOneToOne: false;
            referencedRelation: "webinars";
            referencedColumns: ["id"];
          },
        ];
      };
      waiting_room_config: {
        Row: {
          id: string;
          webinar_id: string;
          template_id: string;
          background_url: string | null;
          background_type: "image" | "video" | null;
          headline: string | null;
          subheadline: string | null;
          bullets: Json;
          show_calendar_button: boolean;
          show_fake_counter: boolean;
          testimonials: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["waiting_room_config"]["Row"]
        > & {
          webinar_id: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["waiting_room_config"]["Row"]
        >;
        Relationships: [
          {
            foreignKeyName: "waiting_room_config_webinar_id_fkey";
            columns: ["webinar_id"];
            isOneToOne: true;
            referencedRelation: "webinars";
            referencedColumns: ["id"];
          },
        ];
      };
      webinar_sessions: {
        Row: {
          id: string;
          webinar_id: string;
          schedule_id: string | null;
          starts_at: string;
          created_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["webinar_sessions"]["Row"]
        > & {
          webinar_id: string;
          starts_at: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["webinar_sessions"]["Row"]
        >;
        Relationships: [
          {
            foreignKeyName: "webinar_sessions_webinar_id_fkey";
            columns: ["webinar_id"];
            isOneToOne: false;
            referencedRelation: "webinars";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "webinar_sessions_schedule_id_fkey";
            columns: ["schedule_id"];
            isOneToOne: false;
            referencedRelation: "webinar_schedules";
            referencedColumns: ["id"];
          },
        ];
      };
      registrants: {
        Row: {
          id: string;
          webinar_id: string;
          session_id: string | null;
          email: string;
          name: string;
          phone: string | null;
          custom_fields: Json;
          computed_session_start: string;
          access_token: string;
          visitor_timezone: string | null;
          unsubscribed_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["registrants"]["Row"]> & {
          webinar_id: string;
          email: string;
          name: string;
          computed_session_start: string;
        };
        Update: Partial<Database["public"]["Tables"]["registrants"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "registrants_webinar_id_fkey";
            columns: ["webinar_id"];
            isOneToOne: false;
            referencedRelation: "webinars";
            referencedColumns: ["id"];
          },
        ];
      };
      registrant_messages: {
        Row: {
          id: string;
          webinar_id: string;
          registrant_id: string;
          message_text: string;
          video_timestamp_seconds: number;
          host_replied: boolean;
          ai_reply_text: string | null;
          ai_replied_at: string | null;
          created_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["registrant_messages"]["Row"]
        > & {
          webinar_id: string;
          registrant_id: string;
          message_text: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["registrant_messages"]["Row"]
        >;
        Relationships: [
          {
            foreignKeyName: "registrant_messages_registrant_id_fkey";
            columns: ["registrant_id"];
            isOneToOne: false;
            referencedRelation: "registrants";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_messages: {
        Row: {
          id: string;
          webinar_id: string;
          timestamp_seconds: number;
          fake_name: string;
          message_text: string;
          message_type: ChatMessageType;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["chat_messages"]["Row"]> & {
          webinar_id: string;
          timestamp_seconds: number;
          fake_name: string;
          message_text: string;
        };
        Update: Partial<Database["public"]["Tables"]["chat_messages"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "chat_messages_webinar_id_fkey";
            columns: ["webinar_id"];
            isOneToOne: false;
            referencedRelation: "webinars";
            referencedColumns: ["id"];
          },
        ];
      };
      ctas: {
        Row: {
          id: string;
          webinar_id: string;
          type: CtaType;
          timestamp_start_seconds: number;
          timestamp_end_seconds: number | null;
          config: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["ctas"]["Row"]> & {
          webinar_id: string;
          type: CtaType;
          timestamp_start_seconds: number;
        };
        Update: Partial<Database["public"]["Tables"]["ctas"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "ctas_webinar_id_fkey";
            columns: ["webinar_id"];
            isOneToOne: false;
            referencedRelation: "webinars";
            referencedColumns: ["id"];
          },
        ];
      };
      viewer_events: {
        Row: {
          id: string;
          registrant_id: string;
          webinar_id: string;
          event_type: ViewerEventType;
          occurred_at: string;
          video_timestamp_seconds: number | null;
          metadata: Json;
        };
        Insert: Partial<Database["public"]["Tables"]["viewer_events"]["Row"]> & {
          registrant_id: string;
          webinar_id: string;
          event_type: ViewerEventType;
        };
        Update: Partial<Database["public"]["Tables"]["viewer_events"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "viewer_events_registrant_id_fkey";
            columns: ["registrant_id"];
            isOneToOne: false;
            referencedRelation: "registrants";
            referencedColumns: ["id"];
          },
        ];
      };
      email_templates: {
        Row: {
          id: string;
          account_id: string;
          webinar_id: string | null;
          type: EmailTemplateType;
          reminder_offset_minutes: number | null;
          subject: string;
          body: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["email_templates"]["Row"]
        > & {
          account_id: string;
          type: EmailTemplateType;
          subject: string;
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["email_templates"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "email_templates_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      enterprise_leads: {
        Row: {
          id: string;
          name: string;
          email: string;
          company: string | null;
          phone: string | null;
          message: string | null;
          status: LeadStatus;
          created_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["enterprise_leads"]["Row"]
        > & {
          name: string;
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["enterprise_leads"]["Row"]>;
        Relationships: [];
      };
      webhook_endpoints: {
        Row: {
          id: string;
          account_id: string;
          url: string;
          secret: string;
          event_types: string[];
          is_active: boolean;
          created_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["webhook_endpoints"]["Row"]
        > & {
          account_id: string;
          url: string;
        };
        Update: Partial<Database["public"]["Tables"]["webhook_endpoints"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      email_sends: {
        Row: {
          id: string;
          registrant_id: string;
          webinar_id: string;
          kind: string;
          sent_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["email_sends"]["Row"]> & {
          registrant_id: string;
          webinar_id: string;
          kind: string;
        };
        Update: Partial<Database["public"]["Tables"]["email_sends"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "email_sends_registrant_id_fkey";
            columns: ["registrant_id"];
            isOneToOne: false;
            referencedRelation: "registrants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_sends_webinar_id_fkey";
            columns: ["webinar_id"];
            isOneToOne: false;
            referencedRelation: "webinars";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      account_public_profile: {
        Row: {
          id: string;
          name: string;
          slug: string;
          branding: Json;
          timezone_default: string;
          plan_id: string | null;
        };
        Relationships: [];
      };
      presenter_public_profile: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      create_account_with_owner: {
        Args: {
          p_name: string;
          p_slug: string;
          p_plan_key?: string;
          p_timezone_default?: string;
        };
        Returns: Database["public"]["Tables"]["accounts"]["Row"];
      };
      record_viewer_event: {
        Args: {
          p_access_token: string;
          p_event_type: ViewerEventType;
          p_video_timestamp_seconds?: number | null;
          p_metadata?: Json;
        };
        Returns: Database["public"]["Tables"]["viewer_events"]["Row"];
      };
      post_registrant_message: {
        Args: {
          p_access_token: string;
          p_message_text: string;
          p_video_timestamp_seconds?: number;
        };
        Returns: Database["public"]["Tables"]["registrant_messages"]["Row"];
      };
      get_registrant_playback_state: {
        Args: { p_access_token: string };
        Returns: {
          webinar_id: string;
          elapsed_seconds: number;
          duration_seconds: number | null;
          is_ended: boolean;
        }[];
      };
      get_registrant_messages: {
        Args: { p_access_token: string };
        Returns: {
          id: string;
          message_text: string;
          video_timestamp_seconds: number;
          ai_reply_text: string | null;
          ai_replied_at: string | null;
          created_at: string;
        }[];
      };
      get_registrant_session: {
        Args: { p_access_token: string };
        Returns: {
          registrant_id: string;
          webinar_id: string;
          name: string;
          email: string;
          computed_session_start: string;
          server_now: string;
          session_id: string | null;
        }[];
      };
      register_for_webinar: {
        Args: {
          p_webinar_id: string;
          p_name: string;
          p_email: string;
          p_visitor_timezone?: string | null;
          p_schedule_id?: string | null;
          p_session_starts_at?: string | null;
          p_offset_minutes?: number | null;
          p_phone?: string | null;
        };
        Returns: {
          access_token: string;
          computed_session_start: string;
        }[];
      };
      get_webinar_summary: {
        Args: { p_webinar_id: string };
        Returns: {
          registrant_count: number;
          attendee_count: number;
          avg_watch_seconds: number;
          duration_seconds: number | null;
        }[];
      };
      get_account_summary: {
        Args: { p_account_id: string };
        Returns: {
          registrant_count: number;
          attendee_count: number;
          avg_watch_pct: number;
        }[];
      };
      get_account_recent_registrants: {
        Args: { p_account_id: string; p_limit?: number; p_offset?: number };
        Returns: {
          id: string;
          name: string;
          email: string;
          webinar_title: string;
          created_at: string;
        }[];
      };
      get_account_period_summary: {
        Args: { p_account_id: string; p_period_start: string; p_period_end: string };
        Returns: {
          registrant_count: number;
          attendee_count: number;
          avg_watch_pct: number;
          top_webinar_title: string | null;
          top_webinar_registrants: number;
        }[];
      };
      get_webinar_retention_curve: {
        Args: { p_webinar_id: string };
        Returns: {
          minute: number;
          viewers_remaining: number;
          pct: number;
        }[];
      };
      get_webinar_cta_stats: {
        Args: { p_webinar_id: string };
        Returns: {
          cta_id: string;
          cta_type: CtaType;
          timestamp_start_seconds: number;
          config: Json;
          clicks: number;
          conversion_pct: number;
        }[];
      };
      get_webinar_poll_results: {
        Args: { p_webinar_id: string };
        Returns: {
          cta_id: string;
          question: string | null;
          option: string | null;
          votes: number;
        }[];
      };
      get_webinar_schedule_performance: {
        Args: { p_webinar_id: string };
        Returns: {
          kind: string;
          schedule_id: string | null;
          day_of_week: number | null;
          time_of_day: string | null;
          timezone: string | null;
          offset_minutes: number | null;
          registrant_count: number;
          attendee_count: number;
          attendance_pct: number;
        }[];
      };
      get_webinar_concurrent_viewers: {
        Args: { p_webinar_id: string };
        Returns: {
          session_starts_at: string;
          session_registrant_count: number;
          minute: number;
          concurrent_viewers: number;
        }[];
      };
      get_webinar_registrants: {
        Args: { p_webinar_id: string };
        Returns: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          computed_session_start: string;
          created_at: string;
          unsubscribed_at: string | null;
        }[];
      };
      get_webinar_cta_clickers: {
        Args: { p_webinar_id: string };
        Returns: {
          cta_id: string;
          registrant_id: string;
          name: string;
          email: string;
          clicked_at: string;
          click_count: number;
        }[];
      };
      get_webinar_watch_positions: {
        Args: { p_webinar_id: string };
        Returns: {
          registrant_id: string;
          last_position_seconds: number | null;
        }[];
      };
      get_webinar_registrant_messages: {
        Args: { p_webinar_id: string };
        Returns: {
          id: string;
          registrant_id: string;
          name: string;
          email: string;
          message_text: string;
          video_timestamp_seconds: number;
          ai_reply_text: string | null;
          ai_replied_at: string | null;
          host_replied: boolean;
          created_at: string;
        }[];
      };
      count_registrant_ai_replies: {
        Args: { p_registrant_id: string };
        Returns: number;
      };
      count_account_ai_replies_this_month: {
        Args: { p_account_id: string };
        Returns: number;
      };
      get_due_reminder_recipients: {
        Args: { p_tolerance_minutes?: number };
        Returns: {
          registrant_id: string;
          webinar_id: string;
          account_id: string;
          access_token: string;
          email: string;
          name: string;
          computed_session_start: string;
          visitor_timezone: string | null;
          offset_minutes: number;
          webinar_title: string;
          webinar_slug: string;
          account_slug: string;
          account_name: string;
          account_branding: Json;
        }[];
      };
      get_due_replay_recipients: {
        Args: { p_lookback_hours?: number };
        Returns: {
          registrant_id: string;
          webinar_id: string;
          account_id: string;
          access_token: string;
          email: string;
          name: string;
          computed_session_start: string;
          visitor_timezone: string | null;
          webinar_title: string;
          webinar_slug: string;
          account_slug: string;
          account_name: string;
          account_branding: Json;
        }[];
      };
      is_platform_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      get_platform_metrics: {
        Args: Record<string, never>;
        Returns: {
          total_accounts: number;
          active_accounts: number;
          mrr_usd: number;
          arr_usd: number;
          active_webinars: number;
          total_attendees: number;
        }[];
      };
    };
    Enums: {
      user_role: UserRole;
      subscription_status: SubscriptionStatus;
      webinar_status: WebinarStatus;
      schedule_mode: ScheduleMode;
      cta_type: CtaType;
      chat_message_type: ChatMessageType;
      viewer_event_type: ViewerEventType;
      email_template_type: EmailTemplateType;
      invitation_status: InvitationStatus;
      lead_status: LeadStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
