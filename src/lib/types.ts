export type Id = number;

export type Profile = { id: string; full_name: string | null; email: string | null; role: "admin" | "usuario"; active: boolean };
export type Plan = { id: Id; name: string; price: number | null; description: string | null; active: boolean };
export type Status = { id: Id; name: string; color: string; sort_order: number; active: boolean; is_final?: boolean; is_won?: boolean };
export type CustomField = {
  id: Id;
  entity: "clients" | "calls";
  label: string;
  field_key: string;
  field_type: "texto" | "numero" | "fecha" | "lista" | "si_no";
  options: string | null;
  sort_order: number;
  active: boolean;
};
export type ClientLite = { id: Id; name: string; company: string | null; owner_id: string | null };
export type Call = {
  id: Id;
  client_id: Id | null;
  user_id: string | null;
  status_id: Id | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  duration_min: number | null;
  result: string | null;
  notes: string | null;
};
export type SocialAccount = { id: Id; network: string; handle: string; color: string; active: boolean };
export type SocialStat = {
  id: Id;
  account_id: Id | null;
  stat_date: string;
  followers: number | null;
  conversations: number | null;
  messages: number | null;
  posts: number | null;
  reach: number | null;
};

export type Option = { value: string | number; label: string; color?: string };
