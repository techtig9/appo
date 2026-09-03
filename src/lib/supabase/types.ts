export type PlanId = "free" | "starter" | "pro" | "business";

export interface UserRow {
  id: string;
  name: string | null;
  email: string;
  role: "user" | "admin";
  two_factor_enabled: boolean;
  theme_preference: "light" | "dark" | "system";
  onboarding_completed: boolean;
  avatar_url: string | null;
  email_security_alerts: boolean;
  email_product_updates: boolean;
  email_billing_alerts: boolean;
  marketing_opt_in: boolean;
  created_at: string;
}

export interface SubscriptionRow {
  id: string;
  user_id: string;
  plan: PlanId;
  status: string;
  provider: string;
  paddle_subscription_id: string | null;
  paddle_customer_id: string | null;
  credits_remaining: number;
  credits_granted: number;
  renews_at: string | null;
}

export interface AppRow {
  id: string;
  user_id: string;
  name: string;
  bundle_id: string | null;
  platforms: string[];
  version: string;
  build_number: number;
  folder: string | null;
  tags: string[];
  cloned_from: string | null;
  is_public_template: boolean;
  webhook_url: string | null;
  custom_subdomain: string | null;
  is_favorite: boolean;
  share_slug: string | null;
  created_at: string;
}

export interface TemplateRow {
  id: string;
  category: string;
  name: string;
  thumbnail: string | null;
  slug: string | null;
  description: string | null;
  tags: string[];
  platforms: string[];
  difficulty: "starter" | "intermediate" | "advanced" | null;
  is_featured: boolean;
  is_new: boolean;
  popularity: number;
  created_at: string;
  updated_at: string;
}

export interface AppVersionRow {
  id: string;
  app_id: string;
  version_number: number;
  storage_path: string;
  change_summary: string | null;
  artifact_checksum: string | null;
  artifact_size_bytes: number | null;
  created_at: string;
}

export interface DeploymentRow {
  id: string;
  app_id: string;
  platform: "ios" | "android" | "web";
  build_id: string | null;
  store_status: string;
  deployment_url: string | null;
  ota_channel: string | null;
  version_id: string | null;
  status: "queued" | "building" | "live" | "failed" | "rolled_back";
  is_current: boolean;
  released_at: string | null;
  rolled_back_at: string | null;
  previous_deployment_id: string | null;
  artifact_path: string | null;
  artifact_checksum: string | null;
  artifact_size_bytes: number | null;
}

export interface AppCollaboratorRow {
  id: string;
  app_id: string;
  user_id: string;
  role: "editor" | "viewer";
  created_at: string;
}

export interface AppInvitationRow {
  id: string;
  app_id: string;
  inviter_id: string;
  email: string;
  role: "editor" | "viewer";
  token_hash: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
}

export interface PaddleWebhookEventRow {
  event_id: string;
  event_type: string;
  subject_id: string | null;
  occurred_at: string | null;
  status: "received" | "processed" | "failed" | "ignored";
  error_detail: string | null;
  processed_at: string | null;
  received_at: string;
}

export type NotificationCategory =
  | "auth"
  | "generation"
  | "project"
  | "deployment"
  | "billing"
  | "team"
  | "system";

export interface NotificationRow {
  id: string;
  user_id: string;
  category: NotificationCategory;
  title: string;
  body: string | null;
  href: string | null;
  severity: "info" | "success" | "warning" | "error";
  read_at: string | null;
  created_at: string;
}

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  actor_email: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  ip_hash: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface EmailDeliveryRow {
  id: string;
  user_id: string | null;
  recipient: string;
  template: string;
  dedupe_key: string | null;
  provider_message_id: string | null;
  status: "queued" | "sent" | "failed" | "skipped";
  error_detail: string | null;
  created_at: string;
}

export interface PaymentRow {
  id: string;
  user_id: string;
  paddle_transaction_id: string | null;
  amount: number | null;
  status: string | null;
  created_at: string;
}

// Minimal Database shape for @supabase/ssr's generic client typing.
// A full generated version (via `supabase gen types typescript`) should
// replace this once the project is connected to a real Supabase instance.
export interface Database {
  public: {
    Tables: {
      users: { Row: UserRow; Insert: Partial<UserRow>; Update: Partial<UserRow> };
      subscriptions: { Row: SubscriptionRow; Insert: Partial<SubscriptionRow>; Update: Partial<SubscriptionRow> };
      apps: { Row: AppRow; Insert: Partial<AppRow>; Update: Partial<AppRow> };
      app_versions: { Row: AppVersionRow; Insert: Partial<AppVersionRow>; Update: Partial<AppVersionRow> };
      deployments: { Row: DeploymentRow; Insert: Partial<DeploymentRow>; Update: Partial<DeploymentRow> };
      payments: { Row: PaymentRow; Insert: Partial<PaymentRow>; Update: Partial<PaymentRow> };
      templates: { Row: TemplateRow; Insert: Partial<TemplateRow>; Update: Partial<TemplateRow> };
      app_collaborators: { Row: AppCollaboratorRow; Insert: Partial<AppCollaboratorRow>; Update: Partial<AppCollaboratorRow> };
      app_invitations: { Row: AppInvitationRow; Insert: Partial<AppInvitationRow>; Update: Partial<AppInvitationRow> };
      paddle_webhook_events: { Row: PaddleWebhookEventRow; Insert: Partial<PaddleWebhookEventRow>; Update: Partial<PaddleWebhookEventRow> };
      notifications: { Row: NotificationRow; Insert: Partial<NotificationRow>; Update: Partial<NotificationRow> };
      audit_logs: { Row: AuditLogRow; Insert: Partial<AuditLogRow>; Update: Partial<AuditLogRow> };
      email_deliveries: { Row: EmailDeliveryRow; Insert: Partial<EmailDeliveryRow>; Update: Partial<EmailDeliveryRow> };
    };
    Functions: {
      /**
       * Atomic credit decrement. Returns the new balance, or null when the
       * balance was insufficient. See supabase/phase-21-migration.sql.
       */
      consume_credits: { Args: { p_user_id: string; p_amount: number }; Returns: number | null };
      /** Atomic refund, capped at credits_granted. Returns the new balance. */
      refund_credits: { Args: { p_user_id: string; p_amount: number }; Returns: number | null };
    };
  };
}
