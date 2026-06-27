import { Link } from "wouter";
import { FaFacebookF, FaWhatsapp, FaInstagram, FaYoutube } from "react-icons/fa";
import { OWNER_WHATSAPP } from "@/lib/config";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useQuery } from "@tanstack/react-query";

interface PolicyLink { slug: string; title: string }

// Split policies into columns of at most 6 so the footer grows sideways
// instead of becoming one very long list.
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function Footer() {
  const { data: settings } = useStoreSettings();
  const { data: policyData } = useQuery<{ policies: PolicyLink[] }>({
    queryKey: ["policies-footer"],
    queryFn: async () => { const r = await fetch("/api/policies"); if (!r.ok) throw new Error("x"); return r.json(); },
    staleTime: 1000 * 60 * 5,
  });
  const policies = policyData?.policies ?? [];
  const policyColumns = chunk(policies, 6);

  const whatsapp = (settings?.contact.whatsapp || OWNER_WHATSAPP).replace(/\D/g, "");
  const email = settings?.contact.email || "support@myshaenterprise.com";
  const address = settings?.contact.address || "21 (Down Floor), Tota mia complex, Senpara Parbata, Mirpur-10, Dhaka-1216";

  const facebook = settings?.social.facebook?.trim() || "";
  const instagram = settings?.social.instagram?.trim() || "";
  const youtube = settings?.social.youtube?.trim() || "";

  const socials = [
    facebook && { href: facebook, label: "Facebook", icon: <FaFacebookF size={17} />, hover: "hover:bg-[#1877f2]" },
    instagram && { href: instagram, label: "Instagram", icon: <FaInstagram size={17} />, hover: "hover:bg-[#e1306c]" },
    youtube && { href: youtube, label: "YouTube", icon: <FaYoutube size={17} />, hover: "hover:bg-[#ff0000]" },
    whatsapp && { href: `https://wa.me/${whatsapp}`, label: "WhatsApp", icon: <FaWhatsapp size={17} />, hover: "hover:bg-green-600" },
  ].filter(Boolean) as { href: string; label: string; icon: React.ReactNode; hover: string }[];

  return (
    <footer className="bg-[#0d1117] text-gray-300 pt-16 pb-8 border-t border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap gap-x-12 gap-y-10 mb-12">

          {/* Brand + about + social */}
          <div className="min-w-[240px] flex-1 max-w-sm">
            <Link href="/" className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center font-bold text-lg text-white">M</div>
              <span className="text-xl font-bold tracking-tight text-white">Mysha<span className="text-primary">Enterprise</span></span>
            </Link>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
              Your premium destination for the latest electronics, gadgets, and home appliances. We offer the best deals and fastest delivery.
            </p>
            <div className="flex items-center gap-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className={`w-10 h-10 rounded-full bg-slate-800 ${s.hover} flex items-center justify-center text-white transition-colors`}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="min-w-[150px]">
            <h3 className="text-white font-semibold mb-6 uppercase tracking-wider text-sm">Quick Links</h3>
            <ul className="space-y-3 text-sm">
              <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link href="/category/all" className="hover:text-primary transition-colors">All Products</Link></li>
              <li><Link href="/track" className="hover:text-primary transition-colors">Track Order</Link></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div className="min-w-[150px]">
            <h3 className="text-white font-semibold mb-6 uppercase tracking-wider text-sm">Customer Service</h3>
            <ul className="space-y-3 text-sm">
              <li><Link href="/profile" className="hover:text-primary transition-colors">My Account</Link></li>
              <li><Link href="/orders" className="hover:text-primary transition-colors">Order History</Link></li>
              <li><Link href="/wishlist" className="hover:text-primary transition-colors">My Wishlist</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">Support Center</Link></li>
            </ul>
          </div>

          {/* Policies — one column per 6, so it spreads sideways */}
          {policyColumns.map((col, idx) => (
            <div key={idx} className="min-w-[150px]">
              <h3 className="text-white font-semibold mb-6 uppercase tracking-wider text-sm">
                {idx === 0 ? "Policies" : <span className="opacity-0 select-none">Policies</span>}
              </h3>
              <ul className="space-y-3 text-sm">
                {col.map((p) => (
                  <li key={p.slug}><Link href={`/policy/${p.slug}`} className="hover:text-primary transition-colors">{p.title}</Link></li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact Info */}
          <div className="min-w-[210px]">
            <h3 className="text-white font-semibold mb-6 uppercase tracking-wider text-sm">Contact Info</h3>
            <ul className="space-y-4 text-sm text-gray-400">
              <li className="flex gap-3">
                <MapPinIcon />
                <span>{address}</span>
              </li>
              <li className="flex gap-3">
                <PhoneIcon />
                <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">
                  +{whatsapp} (WhatsApp)
                </a>
              </li>
              <li className="flex gap-3">
                <MailIcon />
                <a href={`mailto:${email}`} className="hover:text-primary transition-colors">{email}</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Mysha Enterprise. All rights reserved.
          </p>
          <p className="text-sm text-gray-500">
            Developed by{" "}
            <a
              href="https://www.linkedin.com/in/farginanowar-b9a485324"
              target="_blank"
              rel="noreferrer"
              className="text-primary font-medium hover:underline"
            >
              Fargin Binta Anowar
            </a>
            {" "}&amp;{" "}
            <a
              href="https://www.linkedin.com/in/ibnomarromel/"
              target="_blank"
              rel="noreferrer"
              className="text-primary font-medium hover:underline"
            >
              Ibn Omar Romel
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

const MapPinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary flex-shrink-0 mt-0.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
const PhoneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary flex-shrink-0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const MailIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary flex-shrink-0"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>;
