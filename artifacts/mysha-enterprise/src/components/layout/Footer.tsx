import { Link } from "wouter";
import { FaFacebookF, FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa";
export function Footer() {
  return (
    <footer className="bg-[#0d1117] text-gray-300 pt-16 pb-8 border-t border-gray-800">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center font-bold text-lg text-white">M</div>
              <span className="text-xl font-bold tracking-tight text-white">Mysha<span className="text-primary">Enterprise</span></span>
            </Link>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
              Your premium destination for the latest electronics, gadgets, and home appliances. We offer the best deals and fastest delivery.
            </p>
            </div>
           <div className="flex items-center gap-4">
  <a
    href="https://facebook.com"
    target="_blank"
    rel="noreferrer"
    aria-label="Facebook"
    className="w-10 h-10 rounded-full bg-slate-800 hover:bg-orange-500 flex items-center justify-center text-white transition-colors"
  >
    <FaFacebookF size={18} />
  </a>

  <a
    href="https://instagram.com"
    target="_blank"
    rel="noreferrer"
    aria-label="Instagram"
    className="w-10 h-10 rounded-full bg-slate-800 hover:bg-orange-500 flex items-center justify-center text-white transition-colors"
  >
    <FaInstagram size={18} />
  </a>

  <a
    href="https://tiktok.com"
    target="_blank"
    rel="noreferrer"
    aria-label="TikTok"
    className="w-10 h-10 rounded-full bg-slate-800 hover:bg-orange-500 flex items-center justify-center text-white transition-colors"
  >
    <FaTiktok size={18} />
  </a>

  <a
    href="https://youtube.com"
    target="_blank"
    rel="noreferrer"
    aria-label="YouTube"
    className="w-10 h-10 rounded-full bg-slate-800 hover:bg-orange-500 flex items-center justify-center text-white transition-colors"
  >
    <FaYoutube size={18} />
  </a>
</div>
          
          <div>
            <h3 className="text-white font-semibold mb-6 uppercase tracking-wider text-sm">Quick Links</h3>
            <ul className="space-y-3 text-sm">
              <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link href="/category/all" className="hover:text-primary transition-colors">All Products</Link></li>
              <li><Link href="/wishlist" className="hover:text-primary transition-colors">My Wishlist</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-6 uppercase tracking-wider text-sm">Customer Service</h3>
            <ul className="space-y-3 text-sm">
              <li><Link href="/profile" className="hover:text-primary transition-colors">My Account</Link></li>
              <li><Link href="/orders" className="hover:text-primary transition-colors">Order History</Link></li>
              <li><Link href="/track" className="hover:text-primary transition-colors">Track Order</Link></li>
              <li><Link href="/wishlist" className="hover:text-primary transition-colors">My Wishlist</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">Support Center</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-6 uppercase tracking-wider text-sm">Contact Info</h3>
            <ul className="space-y-4 text-sm text-gray-400">
              <li className="flex gap-3">
                <MapPinIcon />
                <span>123 Tech Avenue, Dhaka 1212, Bangladesh</span>
              </li>
              <li className="flex gap-3">
                <PhoneIcon />
                <span>+880 1234-567890</span>
              </li>
              <li className="flex gap-3">
                <MailIcon />
                <span>support@myshaenterprise.com</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Mysha Enterprise. All rights reserved.
          </p>
          <div className="flex gap-2">
            <div className="h-8 w-12 bg-gray-800 rounded flex items-center justify-center text-xs font-bold">VISA</div>
            <div className="h-8 w-12 bg-gray-800 rounded flex items-center justify-center text-xs font-bold">MC</div>
            <div className="h-8 w-12 bg-[#e2136e] text-white rounded flex items-center justify-center text-xs font-bold">bKash</div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({ type }: { type: string }) {
  return (
    <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary hover:text-white transition-colors text-gray-400">
      <span className="sr-only">{type}</span>
      <div className="w-4 h-4 bg-current" style={{ maskImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Ccircle cx=\'12\' cy=\'12\' r=\'10\'/%3E%3C/svg%3E")', WebkitMaskImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Ccircle cx=\'12\' cy=\'12\' r=\'10\'/%3E%3C/svg%3E")' }} />
    </a>
  );
}

const MapPinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary flex-shrink-0 mt-0.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
const PhoneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary flex-shrink-0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const MailIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary flex-shrink-0"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>;
