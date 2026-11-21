"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { ClientLite, CustomField, OptionItem, Plan, Profile, SocialAccount, Status } from "@/lib/types";

type Lookups = {
  me: Profile | null;
  profiles: Profile[];
  plans: Plan[];
  callStatuses: Status[];
  clientStatuses: Status[];
  customFields: CustomField[];
  clients: ClientLite[];
  socialAccounts: SocialAccount[];
  options: OptionItem[];
  loading: boolean;
  reload: () => Promise<void>;
};

const Ctx = createContext<Lookups | null>(null);

export function useData() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useData debe usarse dentro de DataProvider");
  return v;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Omit<Lookups, "reload">>({
    me: null,
    profiles: [],
    plans: [],
    callStatuses: [],
    clientStatuses: [],
    customFields: [],
    clients: [],
    socialAccounts: [],
    options: [],
    loading: true,
  });

  const reload = useCallback(async () => {
    const sb = supabase();
    const [{ data: auth }, profiles, plans, callStatuses, clientStatuses, customFields, clients, socialAccounts, options] =
      await Promise.all([
        sb.auth.getUser(),
        sb.from("profiles").select("*").order("full_name"),
        sb.from("plans").select("*").order("name"),
        sb.from("call_statuses").select("*").order("sort_order"),
        sb.from("client_statuses").select("*").order("sort_order"),
        sb.from("custom_fields").select("*").order("sort_order"),
        sb.from("clients").select("id,name,company,owner_id").order("name"),
        sb.from("social_accounts").select("*").order("network"),
        sb.from("option_lists").select("*").order("sort_order"),
      ]);
    const allProfiles = (profiles.data ?? []) as Profile[];
    setState({
      me: allProfiles.find((p) => p.id === auth.user?.id) ?? null,
      profiles: allProfiles,
      plans: (plans.data ?? []) as Plan[],
      callStatuses: (callStatuses.data ?? []) as Status[],
      clientStatuses: (clientStatuses.data ?? []) as Status[],
      customFields: (customFields.data ?? []) as CustomField[],
      clients: (clients.data ?? []) as ClientLite[],
      socialAccounts: (socialAccounts.data ?? []) as SocialAccount[],
      options: (options.data ?? []) as OptionItem[],
      loading: false,
    });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  return <Ctx.Provider value={{ ...state, reload }}>{children}</Ctx.Provider>;
}
