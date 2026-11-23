export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type ForeignKey<Name extends string, Column extends string, Relation extends string, ReferenceColumn extends string> = {
  foreignKeyName: Name;
  columns: [Column];
  isOneToOne: false;
  referencedRelation: Relation;
  referencedColumns: [ReferenceColumn];
};

type TableShape<Row, Insert, Relationships extends Relationship[] = [], Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationships;
};

export type Database = {
  public: {
    Tables: {
      profiles: TableShape<
        {
          id: string;
          email: string | null;
          full_name: string | null;
          gender: 'male' | 'female' | 'other' | 'undisclosed' | null;
          age_group: 'under_18' | '18_24' | '25_34' | '35_44' | '45_54' | '55_plus' | 'undisclosed' | null;
          role: 'customer' | 'admin';
          created_at: string;
          updated_at: string;
        },
        {
          id: string;
          email?: string | null;
          full_name?: string | null;
          gender?: 'male' | 'female' | 'other' | 'undisclosed' | null;
          age_group?: 'under_18' | '18_24' | '25_34' | '35_44' | '45_54' | '55_plus' | 'undisclosed' | null;
          role?: 'customer' | 'admin';
          created_at?: string;
          updated_at?: string;
        }
      >;
      devices: TableShape<
        {
          id: string;
          customer_id: string;
          device_fingerprint: string;
          device_type: 'iphone' | 'android' | 'laptop' | 'tablet' | 'unknown';
          user_agent: string | null;
          first_seen: string;
          last_seen: string;
        },
        {
          id?: string;
          customer_id: string;
          device_fingerprint: string;
          device_type?: 'iphone' | 'android' | 'laptop' | 'tablet' | 'unknown';
          user_agent?: string | null;
          first_seen?: string;
          last_seen?: string;
        },
        [ForeignKey<'devices_customer_id_fkey', 'customer_id', 'profiles', 'id'>]
      >;
      locations: TableShape<
        { id: string; name: string; address: string; timezone: string; created_at: string },
        { id?: string; name: string; address: string; timezone?: string; created_at?: string }
      >;
      hotspots: TableShape<
        { id: string; location_id: string; name: string; ssid: string; created_at: string },
        { id?: string; location_id: string; name: string; ssid: string; created_at?: string },
        [ForeignKey<'hotspots_location_id_fkey', 'location_id', 'locations', 'id'>]
      >;
      wifi_sessions: TableShape<
        {
          id: string;
          customer_id: string;
          device_id: string;
          hotspot_id: string;
          login_method: 'google' | 'facebook' | 'email';
          started_at: string;
          ended_at: string | null;
          last_seen: string;
          download_bytes: number | null;
          upload_bytes: number | null;
          status: 'online' | 'offline' | 'expired';
          end_reason: string | null;
        },
        {
          id?: string;
          customer_id: string;
          device_id: string;
          hotspot_id: string;
          login_method: 'google' | 'facebook' | 'email';
          started_at?: string;
          ended_at?: string | null;
          last_seen?: string;
          download_bytes?: number | null;
          upload_bytes?: number | null;
          status?: 'online' | 'offline' | 'expired';
          end_reason?: string | null;
        },
        [
          ForeignKey<'wifi_sessions_customer_id_fkey', 'customer_id', 'profiles', 'id'>,
          ForeignKey<'wifi_sessions_device_id_fkey', 'device_id', 'devices', 'id'>,
          ForeignKey<'wifi_sessions_hotspot_id_fkey', 'hotspot_id', 'hotspots', 'id'>
        ]
      >;
      marketing_consents: TableShape<
        { id: string; customer_id: string; consented: boolean; source: string; consent_version: string; created_at: string },
        { id?: string; customer_id: string; consented: boolean; source: string; consent_version: string; created_at?: string },
        [ForeignKey<'marketing_consents_customer_id_fkey', 'customer_id', 'profiles', 'id'>]
      >;
      email_campaigns: TableShape<
        {
          id: string;
          name: string;
          subject: string;
          html_content: string;
          voucher_id: string | null;
          status: 'draft' | 'sending' | 'sent' | 'failed';
          created_at: string;
          sent_at: string | null;
        },
        {
          id?: string;
          name: string;
          subject: string;
          html_content: string;
          voucher_id?: string | null;
          status?: 'draft' | 'sending' | 'sent' | 'failed';
          created_at?: string;
          sent_at?: string | null;
        },
        [ForeignKey<'email_campaigns_voucher_id_fkey', 'voucher_id', 'vouchers', 'id'>]
      >;
      email_recipients: TableShape<
        {
          id: string;
          campaign_id: string;
          customer_id: string;
          email: string;
          status: 'pending' | 'sent' | 'failed' | 'skipped';
          error_message: string | null;
          created_at: string;
        },
        {
          id?: string;
          campaign_id: string;
          customer_id: string;
          email: string;
          status?: 'pending' | 'sent' | 'failed' | 'skipped';
          error_message?: string | null;
          created_at?: string;
        },
        [
          ForeignKey<'email_recipients_campaign_id_fkey', 'campaign_id', 'email_campaigns', 'id'>,
          ForeignKey<'email_recipients_customer_id_fkey', 'customer_id', 'profiles', 'id'>
        ]
      >;
      email_logs: TableShape<
        { id: string; recipient_id: string; provider_message_id: string | null; status: string; sent_at: string | null },
        { id?: string; recipient_id: string; provider_message_id?: string | null; status: string; sent_at?: string | null },
        [ForeignKey<'email_logs_recipient_id_fkey', 'recipient_id', 'email_recipients', 'id'>]
      >;
      vouchers: TableShape<
        {
          id: string;
          code: string;
          description: string | null;
          discount_value: number;
          discount_type: 'percent' | 'fixed';
          max_uses: number | null;
          used_count: number;
          expires_at: string | null;
          active: boolean;
          created_at: string;
        },
        {
          id?: string;
          code: string;
          description?: string | null;
          discount_value: number;
          discount_type: 'percent' | 'fixed';
          max_uses?: number | null;
          used_count?: number;
          expires_at?: string | null;
          active?: boolean;
          created_at?: string;
        }
      >;
      voucher_redemptions: TableShape<
        { id: string; voucher_id: string; customer_id: string; redeemed_at: string },
        { id?: string; voucher_id: string; customer_id: string; redeemed_at?: string },
        [
          ForeignKey<'voucher_redemptions_voucher_id_fkey', 'voucher_id', 'vouchers', 'id'>,
          ForeignKey<'voucher_redemptions_customer_id_fkey', 'customer_id', 'profiles', 'id'>
        ]
      >;
    };
    Views: {
      admin_customer_overview: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          gender: 'male' | 'female' | 'other' | 'undisclosed' | null;
          age_group: 'under_18' | '18_24' | '25_34' | '35_44' | '45_54' | '55_plus' | 'undisclosed' | null;
          registered_at: string;
          latest_login_method: 'google' | 'facebook' | 'email' | null;
          last_visit_at: string | null;
          total_sessions: number;
          total_duration_min: number | null;
          marketing_consented: boolean | null;
          is_returning: boolean;
        };
        Relationships: [];
      };
    };
    Functions: {
      get_dashboard_summary: { Args: { from_ts: string; to_ts: string }; Returns: Json };
      get_dashboard_total_duration: { Args: { from_ts: string; to_ts: string }; Returns: number | null };
      get_session_time_by_date: { Args: { from_ts: string; to_ts: string }; Returns: Json };
      get_new_vs_returning: { Args: { from_ts: string; to_ts: string }; Returns: Json };
      get_login_method_distribution: { Args: { from_ts: string; to_ts: string }; Returns: Json };
      get_demographics: { Args: Record<string, never>; Returns: Json };
      get_peak_hours: { Args: { from_ts: string; to_ts: string }; Returns: Json };
      get_session_duration_distribution: { Args: { from_ts: string; to_ts: string }; Returns: Json };
      get_consent_rate: { Args: Record<string, never>; Returns: Json };
      redeem_voucher: { Args: { p_code: string; p_customer_id: string }; Returns: Json };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
