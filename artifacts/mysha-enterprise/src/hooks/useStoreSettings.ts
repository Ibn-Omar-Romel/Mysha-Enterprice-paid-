import { useQuery } from "@tanstack/react-query";

export interface PublicSettings {
  codChargeDhaka: number;
  codChargeOutside: number;
  payments: {
    cod: { enabled: boolean };
    bkash: { enabled: boolean; number: string };
    nagad: { enabled: boolean; number: string };
    rocket: { enabled: boolean; number: string };
  };
  contact: { whatsapp: string; email: string; address: string };
  social: { facebook: string; instagram: string; youtube: string };
  content: { aboutUs: string; contactUs: string };
}

/** Public, store-wide settings (COD charges, enabled payment methods, contact). */
export function useStoreSettings() {
  return useQuery<PublicSettings>({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load settings");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}
