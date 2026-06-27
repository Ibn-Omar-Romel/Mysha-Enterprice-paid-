import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, type AdminSettings, type PaymentsConfig } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AdminGuard } from "./guard";
import { AdminNav } from "./nav";
import { toast } from "sonner";
import { Settings as SettingsIcon, Save, Truck, Wallet, Phone, Share2, FileText } from "lucide-react";
import { FaFacebookF, FaInstagram, FaYoutube } from "react-icons/fa";

const WALLETS: { key: keyof Omit<PaymentsConfig, "cod">; label: string; bg: string }[] = [
  { key: "bkash", label: "bKash", bg: "#e2136e" },
  { key: "nagad", label: "Nagad", bg: "#f7941d" },
  { key: "rocket", label: "Rocket", bg: "#8a2be2" },
];

function SettingsInner() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-settings"], queryFn: () => adminApi.getSettings() });
  const [form, setForm] = useState<AdminSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (data) setForm(data); }, [data]);

  if (isLoading || !form) {
    return (
      <div className="bg-gray-50 min-h-screen py-8">
        <div className="container mx-auto px-4 max-w-5xl"><AdminNav /><div className="text-center text-gray-400 py-16">Loading settings…</div></div>
      </div>
    );
  }

  const setWallet = (key: "bkash" | "nagad" | "rocket", patch: Partial<{ enabled: boolean; number: string }>) =>
    setForm((f) => f && ({ ...f, payments: { ...f.payments, [key]: { ...f.payments[key], ...patch } } }));

  const save = async () => {
    setSaving(true);
    try {
      await adminApi.updateSettings({
        ...form,
        codChargeDhaka: Number(form.codChargeDhaka) || 0,
        codChargeOutside: Number(form.codChargeOutside) || 0,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["store-settings"] });
      toast.success("Settings saved — applied across the website");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to save"); }
    finally { setSaving(false); }
  };

  const Section = ({ title, desc, icon, children }: { title: string; desc?: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
        <div><h2 className="font-bold text-gray-900">{title}</h2>{desc && <p className="text-xs text-gray-500">{desc}</p>}</div>
      </div>
      {children}
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <AdminNav />
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center"><SettingsIcon size={22} /></div>
            <div><h1 className="text-2xl font-bold text-gray-900">Store Settings</h1><p className="text-sm text-gray-500">Changes apply across the whole website.</p></div>
          </div>
          <Button onClick={save} disabled={saving} className="gap-2"><Save size={16} /> {saving ? "Saving…" : "Save"}</Button>
        </div>

        <div className="space-y-5">
          <Section title="Delivery / COD Charges" desc="Auto-added to each order based on the customer's city." icon={<Truck size={18} />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">Within Dhaka (৳)</Label>
                <Input type="number" min={0} value={form.codChargeDhaka} onChange={(e) => setForm({ ...form, codChargeDhaka: e.target.value as any })} />
              </div>
              <div>
                <Label className="mb-1.5 block">Outside Dhaka (৳)</Label>
                <Input type="number" min={0} value={form.codChargeOutside} onChange={(e) => setForm({ ...form, codChargeOutside: e.target.value as any })} />
              </div>
            </div>
          </Section>

          <Section title="Payment Methods" desc="Turn methods on/off and set the number customers send money to." icon={<Wallet size={18} />}>
            {/* COD toggle */}
            <div className="flex items-center justify-between py-3 border-b border-gray-50">
              <div><p className="font-medium text-gray-900">Cash on Delivery</p><p className="text-xs text-gray-500">Customer pays the delivery charge online, product cash on delivery.</p></div>
              <Switch checked={form.payments.cod.enabled} onCheckedChange={(v) => setForm({ ...form, payments: { ...form.payments, cod: { enabled: v } } })} />
            </div>
            {/* Wallets */}
            {WALLETS.map(({ key, label, bg }) => (
              <div key={key} className="py-3 border-b border-gray-50 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded text-white flex items-center justify-center text-xs font-bold" style={{ background: bg }}>{label[0]}</span>
                    <p className="font-medium text-gray-900">{label}</p>
                  </div>
                  <Switch checked={form.payments[key].enabled} onCheckedChange={(v) => setWallet(key, { enabled: v })} />
                </div>
                <Input
                  placeholder={`${label} number customers send to (e.g. 01XXXXXXXXX)`}
                  value={form.payments[key].number ?? ""}
                  onChange={(e) => setWallet(key, { number: e.target.value })}
                  disabled={!form.payments[key].enabled}
                />
              </div>
            ))}
            <p className="text-xs text-gray-400 mt-3">Tip: if a wallet account has an issue, just turn it off here — it disappears from checkout instantly, site-wide.</p>
          </Section>

          <Section title="Contact Information" desc="Shown in the footer and used for the WhatsApp buttons." icon={<Phone size={18} />}>
            <div className="space-y-4">
              <div><Label className="mb-1.5 block">WhatsApp number (with country code)</Label><Input value={form.whatsappNumber} onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })} placeholder="8801633800157" /></div>
              <div><Label className="mb-1.5 block">Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="support@myshaenterprise.com" /></div>
              <div><Label className="mb-1.5 block">Address</Label><Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div>
                <Label className="mb-1.5 block">SMS Sender ID / Number</Label>
                <Input value={form.smsSenderId} onChange={(e) => setForm({ ...form, smsSenderId: e.target.value })} placeholder="e.g. MyshaBD or your sender number" />
                <p className="text-xs text-gray-400 mt-1">Used as the sender for order-confirmed and payment-verified texts. Texts are sent once an SMS gateway key is configured.</p>
              </div>
            </div>
          </Section>

          <Section title="Social Media" desc="Paste full profile links. Icons appear in the footer automatically — leave blank to hide one." icon={<Share2 size={18} />}>
            <div className="space-y-4">
              <div>
                <Label className="mb-1.5 flex items-center gap-2"><FaFacebookF className="text-[#1877f2]" /> Facebook link</Label>
                <Input value={form.facebook ?? ""} onChange={(e) => setForm({ ...form, facebook: e.target.value })} placeholder="https://facebook.com/yourpage" />
              </div>
              <div>
                <Label className="mb-1.5 flex items-center gap-2"><FaInstagram className="text-[#e1306c]" /> Instagram link</Label>
                <Input value={form.instagram ?? ""} onChange={(e) => setForm({ ...form, instagram: e.target.value })} placeholder="https://instagram.com/yourpage" />
              </div>
              <div>
                <Label className="mb-1.5 flex items-center gap-2"><FaYoutube className="text-[#ff0000]" /> YouTube link</Label>
                <Input value={form.youtube ?? ""} onChange={(e) => setForm({ ...form, youtube: e.target.value })} placeholder="https://youtube.com/@yourchannel" />
              </div>
            </div>
          </Section>

          <Section title="Page Content" desc="Edit the About Us and Contact Us page text. Supports English and Bengali. Leave blank to keep the default page." icon={<FileText size={18} />}>
            <div className="space-y-4">
              <div>
                <Label className="mb-1.5 block">About Us</Label>
                <Textarea rows={6} value={form.aboutUs ?? ""} onChange={(e) => setForm({ ...form, aboutUs: e.target.value })} placeholder="Write your About Us text here (English or Bengali)…" />
              </div>
              <div>
                <Label className="mb-1.5 block">Contact Us</Label>
                <Textarea rows={5} value={form.contactUs ?? ""} onChange={(e) => setForm({ ...form, contactUs: e.target.value })} placeholder="Intro text shown on the Contact page (English or Bengali)…" />
                <p className="text-xs text-gray-400 mt-1">Phone, email and address on the Contact page come from the Contact Information section above.</p>
              </div>
            </div>
          </Section>

          <div className="flex justify-end pb-4">
            <Button onClick={save} disabled={saving} className="gap-2"><Save size={16} /> {saving ? "Saving…" : "Save Settings"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminSettings() {
  return <AdminGuard permission="settings"><SettingsInner /></AdminGuard>;
}
