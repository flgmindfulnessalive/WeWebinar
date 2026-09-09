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
export type VideoProvider = "youtube" | "direct_url" | "vimeo";
export type ChatMessageType = "message" | "question" | "host_reply";
export type ViewerEventType =
  | "join"
  | "heartbeat"
  | "leave"
  | "cta_click"
  | "poll_response"
  | "reaction";
export type EmailTemplateType =
  | "registration_confirmation"
  | "reminder"
  | "replay_missed";
export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";
export type LeadStatus = "new" | "contacted" | "converted" | "closed";

export type GrowthOperatorRole = "owner" | "growth_admin" | "growth_operator" | "viewer";
export type PartnerPipeline = "creator" | "ugc" | "distribution";
export type PartnerPlatform =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "linkedin"
  | "website"
  | "newsletter"
  | "other";
export type PartnerStage =
  | "discovered"
  | "qualified"
  | "high_fit"
  | "ready_to_contact"
  | "contacted"
  | "replied"
  | "interested"
  | "negotiating"
  | "agreed"
  | "active_partner"
  | "inactive"
  | "rejected";
export type PartnerActivityType =
  | "imported"
  | "analyzed"
  | "score_updated"
  | "stage_changed"
  | "note_added"
  | "message_generated"
  | "marked_contacted"
  | "task_created"
  | "task_completed";

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
          billing_customer_id: string | null;
          billing_subscription_id: string | null;
          subscription_status: SubscriptionStatus;
          plan_id: string | null;
          timezone_default: string;
          grace_period_days: number;
          suspended_at: string | null;
          canceled_at: string | null;
          deletion_warning_sent_at: string | null;
          trial_ends_at: string;
          trial_warning_sent_at: string | null;
          last_digest_sent_at: string | null;
          activation_nudge_sent_at: string | null;
          digest_unsubscribed_at: string | null;
          unsubscribe_token: string;
          brevo_api_key: string | null;
          whop_starter_kit_claimed_at: string | null;
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
          video_provider: VideoProvider | null;
          video_source: string | null;
          duration_seconds: number | null;
          schedule_mode: ScheduleMode;
          just_in_time_offsets_minutes: number[];
          status: WebinarStatus;
          attendee_count: number;
          fake_viewer_min: number;
          fake_viewer_max: number;
          ai_chat_enabled: boolean;
          ai_agent_training_info: string | null;
          ai_chat_use_emojis: boolean;
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
          promo_video_url: string | null;
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
          country: string | null;
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
      page_views: {
        Row: {
          id: string;
          webinar_id: string;
          occurred_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["page_views"]["Row"]> & {
          webinar_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["page_views"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "page_views_webinar_id_fkey";
            columns: ["webinar_id"];
            isOneToOne: false;
            referencedRelation: "webinars";
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
      webhook_deliveries: {
        Row: {
          id: string;
          endpoint_id: string;
          account_id: string;
          event_type: string;
          status_code: number | null;
          succeeded: boolean;
          error_message: string | null;
          created_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["webhook_deliveries"]["Row"]
        > & {
          endpoint_id: string;
          account_id: string;
          event_type: string;
          succeeded: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["webhook_deliveries"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_endpoint_id_fkey";
            columns: ["endpoint_id"];
            isOneToOne: false;
            referencedRelation: "webhook_endpoints";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "webhook_deliveries_account_id_fkey";
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
      support_ai_replies: {
        Row: {
          id: string;
          account_id: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["support_ai_replies"]["Row"]> & {
          account_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["support_ai_replies"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "support_ai_replies_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      custom_domains: {
        Row: {
          id: string;
          account_id: string;
          hostname: string;
          status: string;
          verification_txt: string;
          last_checked_at: string | null;
          last_error: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["custom_domains"]["Row"]> & {
          account_id: string;
          hostname: string;
        };
        Update: Partial<Database["public"]["Tables"]["custom_domains"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "custom_domains_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: true;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_metrics_snapshots: {
        Row: {
          id: string;
          snapshot_date: string;
          total_accounts: number;
          active_accounts: number;
          trial_accounts: number;
          mrr_usd: number;
          arr_usd: number;
          active_webinars: number;
          total_attendees: number;
          activation_rate_pct: number | null;
          avg_hours_to_first_webinar: number | null;
          conversion_actions_generated: number;
          monthly_automated_presentations_delivered: number;
          ai_summary: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["platform_metrics_snapshots"]["Row"]> & {
          snapshot_date: string;
          total_accounts: number;
          active_accounts: number;
          trial_accounts: number;
          mrr_usd: number;
          arr_usd: number;
          active_webinars: number;
          total_attendees: number;
          conversion_actions_generated: number;
          monthly_automated_presentations_delivered: number;
        };
        Update: Partial<Database["public"]["Tables"]["platform_metrics_snapshots"]["Row"]>;
        Relationships: [];
      };
      framework_definitions: {
        Row: {
          id: string;
          framework_key: string;
          stage_key:
            | "welcome"
            | "align"
            | "validate"
            | "engage"
            | "reframe"
            | "evidence"
            | "bridge"
            | "derisk"
            | "activate"
            | "learn";
          stage_order: number;
          name_es: string;
          name_en: string;
          strategic_purpose_es: string;
          strategic_purpose_en: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["framework_definitions"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["framework_definitions"]["Row"]>;
        Relationships: [];
      };
      readiness_assessments: {
        Row: {
          id: string;
          email: string;
          name: string;
          business_type:
            | "coaching"
            | "digital_product"
            | "membership"
            | "network_marketing"
            | "agency"
            | "saas"
            | "professional_services"
            | "other";
          presentation_status: "recorded" | "live_only" | "partial_structure" | "none";
          primary_goal:
            | "save_time"
            | "more_sales"
            | "scale_presentation"
            | "improve_conversion"
            | "follow_up_prospects"
            | "measure_audience";
          total_points: number;
          score_percentage: number;
          readiness_status: "not_ready" | "foundation_built" | "almost_ready" | "ready";
          weakest_category: "strategy" | "presentation" | "recording" | "evergreen" | "followup" | "measurement";
          strategy_score: number;
          presentation_score: number;
          recording_score: number;
          evergreen_score: number;
          followup_score: number;
          measurement_score: number;
          source: string | null;
          medium: string | null;
          campaign: string | null;
          content: string | null;
          affiliate: string | null;
          ref: string | null;
          marketing_consent: boolean;
          ip_hash: string | null;
          started_at: string;
          completed_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["readiness_assessments"]["Row"]> & {
          id: string;
          email: string;
          name: string;
          business_type: Database["public"]["Tables"]["readiness_assessments"]["Row"]["business_type"];
          presentation_status: Database["public"]["Tables"]["readiness_assessments"]["Row"]["presentation_status"];
          primary_goal: Database["public"]["Tables"]["readiness_assessments"]["Row"]["primary_goal"];
          total_points: number;
          score_percentage: number;
          readiness_status: Database["public"]["Tables"]["readiness_assessments"]["Row"]["readiness_status"];
          weakest_category: Database["public"]["Tables"]["readiness_assessments"]["Row"]["weakest_category"];
          strategy_score: number;
          presentation_score: number;
          recording_score: number;
          evergreen_score: number;
          followup_score: number;
          measurement_score: number;
          started_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["readiness_assessments"]["Row"]>;
        Relationships: [];
      };
      readiness_answers: {
        Row: {
          id: string;
          assessment_id: string;
          category: "strategy" | "presentation" | "recording" | "evergreen" | "followup" | "measurement";
          question_id: string;
          answer: "yes" | "partial" | "no";
          score: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["readiness_answers"]["Row"]> & {
          assessment_id: string;
          category: Database["public"]["Tables"]["readiness_answers"]["Row"]["category"];
          question_id: string;
          answer: Database["public"]["Tables"]["readiness_answers"]["Row"]["answer"];
          score: number;
        };
        Update: Partial<Database["public"]["Tables"]["readiness_answers"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "readiness_answers_assessment_id_fkey";
            columns: ["assessment_id"];
            isOneToOne: false;
            referencedRelation: "readiness_assessments";
            referencedColumns: ["id"];
          },
        ];
      };
      readiness_events: {
        Row: {
          id: string;
          assessment_id: string;
          event_type:
            | "readiness_viewed"
            | "readiness_started"
            | "readiness_context_completed"
            | "readiness_category_started"
            | "readiness_category_completed"
            | "readiness_progress_saved"
            | "readiness_lead_form_viewed"
            | "readiness_lead_submitted"
            | "readiness_completed"
            | "readiness_result_viewed"
            | "readiness_cta_clicked"
            | "readiness_blueprint_clicked"
            | "readiness_restarted";
          properties: Json;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["readiness_events"]["Row"]> & {
          assessment_id: string;
          event_type: Database["public"]["Tables"]["readiness_events"]["Row"]["event_type"];
        };
        Update: Partial<Database["public"]["Tables"]["readiness_events"]["Row"]>;
        Relationships: [];
      };
      webinar_projects: {
        Row: {
          id: string;
          account_id: string | null;
          readiness_assessment_id: string | null;
          lead_email: string | null;
          lead_name: string | null;
          project_name: string | null;
          status: "draft" | "profile_complete" | "prompt_generated";
          profile_completion: number;
          business_type: string | null;
          product_name: string | null;
          product_type: string | null;
          product_description: string | null;
          product_price: number | null;
          currency: string | null;
          offer_url: string | null;
          desired_duration: string | null;
          desired_duration_custom_minutes: number | null;
          target_audience: string | null;
          audience_awareness: string | null;
          current_situation: string | null;
          main_problem: string | null;
          frustrations: string | null;
          desired_result: string | null;
          current_belief: string | null;
          common_solution: string | null;
          why_common_solution_fails: string | null;
          root_cause: string | null;
          new_paradigm: string | null;
          mechanism_name: string | null;
          mechanism_description: string | null;
          mechanism_steps: Json;
          differentiators: string | null;
          founder_story: string | null;
          credentials: string | null;
          proof_points: Json;
          evidence_limitations: string | null;
          offer_name: string | null;
          deliverables: Json;
          benefits: Json;
          bonuses: Json;
          pricing_structure: string | null;
          guarantee: string | null;
          risk_reversal: string | null;
          legitimate_urgency: string | null;
          objections: Json;
          primary_cta: string | null;
          cta_type: string | null;
          cta_url: string | null;
          webinar_title: string | null;
          presentation_format: string | null;
          delivery_style: Json;
          script_detail: string | null;
          language: string;
          forbidden_words: Json;
          required_concepts: Json;
          additional_instructions: string | null;
          marketing_consent: boolean;
          source: string | null;
          medium: string | null;
          campaign: string | null;
          content: string | null;
          affiliate: string | null;
          ref: string | null;
          ip_hash: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["webinar_projects"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["webinar_projects"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "webinar_projects_readiness_assessment_id_fkey";
            columns: ["readiness_assessment_id"];
            isOneToOne: false;
            referencedRelation: "readiness_assessments";
            referencedColumns: ["id"];
          },
        ];
      };
      script_prompt_generations: {
        Row: {
          id: string;
          project_id: string;
          version: number;
          prompt_template_version: string;
          profile_completion: number;
          prompt_hash: string;
          copied_at: string | null;
          chatgpt_opened_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["script_prompt_generations"]["Row"]> & {
          project_id: string;
          version: number;
          prompt_template_version: string;
          profile_completion: number;
          prompt_hash: string;
        };
        Update: Partial<Database["public"]["Tables"]["script_prompt_generations"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "script_prompt_generations_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "webinar_projects";
            referencedColumns: ["id"];
          },
        ];
      };
      script_builder_events: {
        Row: {
          id: string;
          project_id: string;
          event_type:
            | "script_builder_viewed"
            | "script_builder_started"
            | "script_builder_resumed"
            | "script_builder_step_started"
            | "script_builder_step_completed"
            | "script_builder_progress_saved"
            | "script_builder_review_viewed"
            | "script_builder_lead_form_viewed"
            | "script_builder_lead_submitted"
            | "script_prompt_generated"
            | "script_prompt_viewed"
            | "script_prompt_copied"
            | "script_chatgpt_opened"
            | "script_answers_edited"
            | "script_project_restarted"
            | "script_wewebinars_cta_viewed"
            | "script_wewebinars_cta_clicked";
          properties: Json;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["script_builder_events"]["Row"]> & {
          project_id: string;
          event_type: Database["public"]["Tables"]["script_builder_events"]["Row"]["event_type"];
        };
        Update: Partial<Database["public"]["Tables"]["script_builder_events"]["Row"]>;
        Relationships: [];
      };
      launchpad_projects: {
        Row: {
          id: string;
          account_id: string;
          title: string;
          current_step: "cost" | "diagnosis" | "architecture" | "script" | "implementation" | "demo" | "create";
          status: "active" | "completed";
          readiness_assessment_id: string | null;
          webinar_project_id: string | null;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
          reminder_sent_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["launchpad_projects"]["Row"]> & {
          account_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["launchpad_projects"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "launchpad_projects_readiness_assessment_id_fkey";
            columns: ["readiness_assessment_id"];
            isOneToOne: false;
            referencedRelation: "readiness_assessments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "launchpad_projects_webinar_project_id_fkey";
            columns: ["webinar_project_id"];
            isOneToOne: false;
            referencedRelation: "webinar_projects";
            referencedColumns: ["id"];
          },
        ];
      };
      launchpad_step_progress: {
        Row: {
          id: string;
          project_id: string;
          step_key: "cost" | "diagnosis" | "architecture" | "script" | "implementation" | "demo" | "create";
          status: "not_started" | "in_progress" | "completed" | "needs_review";
          progress_percentage: number;
          started_at: string | null;
          completed_at: string | null;
          last_activity_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["launchpad_step_progress"]["Row"]> & {
          project_id: string;
          step_key: Database["public"]["Tables"]["launchpad_step_progress"]["Row"]["step_key"];
        };
        Update: Partial<Database["public"]["Tables"]["launchpad_step_progress"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "launchpad_step_progress_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "launchpad_projects";
            referencedColumns: ["id"];
          },
        ];
      };
      repetition_calculations: {
        Row: {
          id: string;
          project_id: string;
          inputs: Json;
          results: Json;
          calculation_version: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["repetition_calculations"]["Row"]> & {
          project_id: string;
          inputs: Json;
          results: Json;
        };
        Update: Partial<Database["public"]["Tables"]["repetition_calculations"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "repetition_calculations_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "launchpad_projects";
            referencedColumns: ["id"];
          },
        ];
      };
      launchpad_events: {
        Row: {
          id: string;
          project_id: string;
          event_type:
            | "launchpad_viewed"
            | "launchpad_step_started"
            | "launchpad_step_completed"
            | "repetition_calculation_completed"
            | "create_webinar_clicked"
            | "blueprint_slide_viewed"
            | "blueprint_completed"
            | "implementation_item_checked"
            | "implementation_completed"
            | "demo_completed"
            | "reward_unlocked"
            | "playbook_downloaded"
            | "discount_revealed";
          properties: Json;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["launchpad_events"]["Row"]> & {
          project_id: string;
          event_type: Database["public"]["Tables"]["launchpad_events"]["Row"]["event_type"];
        };
        Update: Partial<Database["public"]["Tables"]["launchpad_events"]["Row"]>;
        Relationships: [];
      };
      blueprint_progress: {
        Row: {
          id: string;
          project_id: string;
          slide_number: number;
          completed: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["blueprint_progress"]["Row"]> & {
          project_id: string;
          slide_number: number;
        };
        Update: Partial<Database["public"]["Tables"]["blueprint_progress"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "blueprint_progress_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "launchpad_projects";
            referencedColumns: ["id"];
          },
        ];
      };
      launchpad_rewards: {
        Row: {
          id: string;
          project_id: string;
          reward_type: "playbook" | "discount";
          status: "locked" | "unlocked" | "redeemed" | "expired";
          unlocked_at: string | null;
          redeemed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["launchpad_rewards"]["Row"]> & {
          project_id: string;
          reward_type: Database["public"]["Tables"]["launchpad_rewards"]["Row"]["reward_type"];
        };
        Update: Partial<Database["public"]["Tables"]["launchpad_rewards"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "launchpad_rewards_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "launchpad_projects";
            referencedColumns: ["id"];
          },
        ];
      };
      growth_operators: {
        Row: {
          user_id: string;
          role: GrowthOperatorRole;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["growth_operators"]["Row"]> & {
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["growth_operators"]["Row"]>;
        Relationships: [];
      };
      partner_prospects: {
        Row: {
          id: string;
          pipeline: PartnerPipeline;
          platform: PartnerPlatform;
          stage: PartnerStage;
          owner_id: string | null;
          priority: number;
          full_name: string | null;
          username: string | null;
          profile_url: string;
          normalized_profile_url: string;
          profile_image_url: string | null;
          bio: string | null;
          website: string | null;
          email: string | null;
          normalized_email: string | null;
          phone: string | null;
          country: string | null;
          city: string | null;
          language: string | null;
          audience_metrics: Json;
          content_profile: Json;
          business_profile: Json;
          follower_count: number | null;
          engagement_rate: number | null;
          next_action: string | null;
          next_action_date: string | null;
          last_contact_at: string | null;
          touches_count: number;
          source: string;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["partner_prospects"]["Row"]> & {
          pipeline: PartnerPipeline;
          platform: PartnerPlatform;
          profile_url: string;
          normalized_profile_url: string;
        };
        Update: Partial<Database["public"]["Tables"]["partner_prospects"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "partner_prospects_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "growth_operators";
            referencedColumns: ["user_id"];
          },
        ];
      };
      partner_notes: {
        Row: {
          id: string;
          prospect_id: string;
          author_id: string;
          body: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["partner_notes"]["Row"]> & {
          prospect_id: string;
          author_id: string;
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["partner_notes"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "partner_notes_prospect_id_fkey";
            columns: ["prospect_id"];
            isOneToOne: false;
            referencedRelation: "partner_prospects";
            referencedColumns: ["id"];
          },
        ];
      };
      partner_activity_log: {
        Row: {
          id: string;
          prospect_id: string;
          type: PartnerActivityType;
          payload: Json;
          actor_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["partner_activity_log"]["Row"]> & {
          prospect_id: string;
          type: PartnerActivityType;
        };
        Update: Partial<Database["public"]["Tables"]["partner_activity_log"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "partner_activity_log_prospect_id_fkey";
            columns: ["prospect_id"];
            isOneToOne: false;
            referencedRelation: "partner_prospects";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      custom_domain_lookup: {
        Row: {
          hostname: string;
          account_slug: string;
        };
        Relationships: [];
      };
      custom_domain_pending_lookup: {
        Row: {
          hostname: string;
          status: string;
        };
        Relationships: [];
      };
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
      is_growth_operator: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      growth_operator_role: {
        Args: Record<string, never>;
        Returns: GrowthOperatorRole | null;
      };
      can_edit_partner_engine: {
        Args: Record<string, never>;
        Returns: boolean;
      };
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
      get_cta_poll_results: {
        Args: { p_access_token: string; p_cta_id: string };
        Returns: { option: string | null; votes: number }[];
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
          p_country?: string | null;
        };
        Returns: {
          access_token: string;
          computed_session_start: string;
        }[];
      };
      get_webinar_country_breakdown: {
        Args: { p_webinar_id: string; p_start_date?: string | null; p_end_date?: string | null };
        Returns: {
          country: string | null;
          registrant_count: number;
          pct: number;
        }[];
      };
      get_webinar_summary: {
        Args: { p_webinar_id: string; p_start_date?: string | null; p_end_date?: string | null };
        Returns: {
          visit_count: number;
          registrant_count: number;
          attendee_count: number;
          avg_watch_seconds: number;
          duration_seconds: number | null;
        }[];
      };
      record_page_view: {
        Args: { p_webinar_id: string };
        Returns: undefined;
      };
      insert_readiness_assessment: {
        Args: {
          p_id: string;
          p_email: string;
          p_name: string;
          p_business_type: Database["public"]["Tables"]["readiness_assessments"]["Row"]["business_type"];
          p_presentation_status: Database["public"]["Tables"]["readiness_assessments"]["Row"]["presentation_status"];
          p_primary_goal: Database["public"]["Tables"]["readiness_assessments"]["Row"]["primary_goal"];
          p_total_points: number;
          p_score_percentage: number;
          p_readiness_status: Database["public"]["Tables"]["readiness_assessments"]["Row"]["readiness_status"];
          p_weakest_category: Database["public"]["Tables"]["readiness_assessments"]["Row"]["weakest_category"];
          p_strategy_score: number;
          p_presentation_score: number;
          p_recording_score: number;
          p_evergreen_score: number;
          p_followup_score: number;
          p_measurement_score: number;
          p_source: string | null;
          p_medium: string | null;
          p_campaign: string | null;
          p_content: string | null;
          p_affiliate: string | null;
          p_ref: string | null;
          p_marketing_consent: boolean;
          p_ip_hash: string | null;
          p_started_at: string;
          p_answers: Json;
        };
        Returns: undefined;
      };
      get_or_create_launchpad_project: {
        Args: { p_account_id: string };
        Returns: Database["public"]["Tables"]["launchpad_projects"]["Row"];
      };
      account_is_publishable: {
        Args: { p_account_id: string };
        Returns: boolean;
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
        Args: { p_webinar_id: string; p_start_date?: string | null; p_end_date?: string | null };
        Returns: {
          minute: number;
          viewers_remaining: number;
          pct: number;
        }[];
      };
      get_webinar_cta_stats: {
        Args: { p_webinar_id: string; p_start_date?: string | null; p_end_date?: string | null };
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
        Args: { p_webinar_id: string; p_start_date?: string | null; p_end_date?: string | null };
        Returns: {
          cta_id: string;
          question: string | null;
          option: string | null;
          votes: number;
        }[];
      };
      get_webinar_schedule_performance: {
        Args: { p_webinar_id: string; p_start_date?: string | null; p_end_date?: string | null };
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
        Args: { p_webinar_id: string; p_start_date?: string | null; p_end_date?: string | null };
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
        Args: { p_webinar_id: string; p_start_date?: string | null; p_end_date?: string | null };
        Returns: {
          cta_id: string;
          registrant_id: string;
          name: string;
          email: string;
          clicked_at: string;
          click_count: number;
        }[];
      };
      get_webinar_poll_voters: {
        Args: { p_webinar_id: string; p_start_date?: string | null; p_end_date?: string | null };
        Returns: {
          cta_id: string;
          option: string | null;
          registrant_id: string;
          name: string;
          email: string;
          voted_at: string;
        }[];
      };
      get_webinar_watch_positions: {
        Args: { p_webinar_id: string; p_start_date?: string | null; p_end_date?: string | null };
        Returns: {
          registrant_id: string;
          last_position_seconds: number | null;
        }[];
      };
      get_webinar_registrant_messages: {
        Args: { p_webinar_id: string; p_start_date?: string | null; p_end_date?: string | null };
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
      get_webinar_reactions: {
        Args: { p_webinar_id: string; p_start_date?: string | null; p_end_date?: string | null };
        Returns: {
          id: string;
          registrant_id: string;
          name: string;
          email: string;
          emoji: string;
          video_timestamp_seconds: number | null;
          occurred_at: string;
        }[];
      };
      count_registrant_ai_replies: {
        Args: { p_registrant_id: string };
        Returns: number;
      };
      get_webinar_lead_scores: {
        Args: { p_webinar_id: string; p_start_date?: string | null; p_end_date?: string | null };
        Returns: {
          registrant_id: string;
          attended: boolean;
          watch_pct: number;
          clicked_cta: boolean;
          answered_poll: boolean;
          sent_message: boolean;
          reacted: boolean;
          score: number;
          tier: string;
        }[];
      };
      get_account_health_scores: {
        Args: Record<string, never>;
        Returns: {
          account_id: string;
          published_webinar: boolean;
          ever_had_registrant: boolean;
          registrants_last_30_days: number;
          active_recently: boolean;
          score: number;
          tier: string;
        }[];
      };
      count_account_ai_replies_this_month: {
        Args: { p_account_id: string };
        Returns: number;
      };
      count_account_support_ai_replies_today: {
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
          trial_accounts: number;
          mrr_usd: number;
          arr_usd: number;
          active_webinars: number;
          total_attendees: number;
        }[];
      };
      get_platform_scorecard: {
        Args: Record<string, never>;
        Returns: {
          conversion_actions_generated: number;
          activation_rate_pct: number | null;
          avg_hours_to_first_webinar: number | null;
          monthly_automated_presentations_delivered: number;
        }[];
      };
      snapshot_platform_metrics: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      get_platform_metrics_brief: {
        Args: { p_compare_days?: number };
        Returns: {
          snapshot_date: string;
          total_accounts: number;
          active_accounts: number;
          trial_accounts: number;
          mrr_usd: number;
          arr_usd: number;
          active_webinars: number;
          total_attendees: number;
          activation_rate_pct: number | null;
          conversion_actions_generated: number;
          ai_summary: string | null;
          compare_snapshot_date: string | null;
          compare_total_accounts: number | null;
          compare_active_accounts: number | null;
          compare_mrr_usd: number | null;
          compare_activation_rate_pct: number | null;
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
      video_provider: VideoProvider;
      growth_operator_role: GrowthOperatorRole;
      partner_pipeline: PartnerPipeline;
      partner_platform: PartnerPlatform;
      partner_stage: PartnerStage;
      partner_activity_type: PartnerActivityType;
    };
    CompositeTypes: Record<string, never>;
  };
}
