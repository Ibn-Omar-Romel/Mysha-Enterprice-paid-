import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Phone, Mail, Clock, CheckCircle2, MessageSquare, Headphones, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const contactMethods = [
  {
    icon: <Phone size={22} />,
    title: "Phone Support",
    desc: "Talk directly with our team",
    value: "+880 1234-567890",
    sub: "Available 9AM – 9PM, 7 days",
    href: "tel:+8801234567890",
  },
  {
    icon: <MessageSquare size={22} />,
    title: "WhatsApp",
    desc: "Quick responses guaranteed",
    value: "+880 1234-567890",
    sub: "Typically replies within minutes",
    href: "https://wa.me/8801234567890",
  },
  {
    icon: <Mail size={22} />,
    title: "Email Support",
    desc: "For detailed inquiries",
    value: "support@myshaenterprise.com",
    sub: "Response within 24 hours",
    href: "mailto:support@myshaenterprise.com",
  },
  {
    icon: <Headphones size={22} />,
    title: "Live Chat",
    desc: "Chat with us on the website",
    value: "Start Live Chat",
    sub: "Available during business hours",
    href: "#",
  },
];

export default function ContactPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 1000));
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero */}
      <section className="relative bg-[#0d1117] text-white overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1534536281715-e28d76689b4d?q=80&w=1400&fit=crop"
            alt="Customer support team"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117] via-[#0d1117]/70 to-[#0d1117]/50" />
        </div>
        <div className="relative container mx-auto px-4 py-20 md:py-28 text-center max-w-2xl">
          <div className="inline-block px-3 py-1 bg-primary/20 text-primary font-medium text-sm rounded-full border border-primary/30 mb-5">
            Support
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Get in Touch</h1>
          <p className="text-gray-400 text-lg">We're here to help. Reach out through any channel below and our team will get back to you promptly.</p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Contact Methods */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {contactMethods.map((method, i) => (
            <a
              key={i}
              href={method.href}
              className="bg-white rounded-xl border p-5 hover:border-primary hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-all">
                {method.icon}
              </div>
              <h3 className="font-bold text-gray-900 mb-1">{method.title}</h3>
              <p className="text-xs text-gray-500 mb-3">{method.desc}</p>
              <p className="text-sm font-medium text-primary break-all">{method.value}</p>
              <p className="text-xs text-gray-400 mt-1">{method.sub}</p>
            </a>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border p-6 md:p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Send Us a Message</h2>

              {isSubmitted ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-green-500">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Message Sent!</h3>
                  <p className="text-gray-500 mb-6">Thank you for reaching out. We'll get back to you within 24 hours.</p>
                  <Button variant="outline" onClick={() => { setIsSubmitted(false); setForm({ name: "", email: "", phone: "", subject: "", message: "" }); }}>
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
                      <Input id="name" placeholder="John Doe" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
                      <Input id="email" type="email" placeholder="john@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" placeholder="01XXXXXXXXX" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input id="subject" placeholder="Order inquiry, product question..." value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message <span className="text-red-500">*</span></Label>
                    <Textarea
                      id="message"
                      placeholder="Tell us how we can help you..."
                      rows={5}
                      value={form.message}
                      onChange={e => setForm({ ...form, message: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <AlertCircle size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-700">For order-related issues, please include your order number for faster resolution.</p>
                  </div>
                  <Button type="submit" className="w-full h-12 text-base" disabled={isSubmitting}>
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              )}
            </div>
          </div>

          {/* Store Info */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><MapPin size={18} className="text-primary" /> Our Location</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div>
                  <p className="font-semibold text-gray-900">Dhaka Showroom (Main)</p>
                  <p>123 Tech Avenue, Bashundhara City</p>
                  <p>Dhaka 1212, Bangladesh</p>
                </div>
                <div className="pt-3 border-t">
                  <p className="font-semibold text-gray-900">Chittagong Branch</p>
                  <p>45 Electronics Market, Agrabad</p>
                  <p>Chittagong 4100, Bangladesh</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Clock size={18} className="text-primary" /> Business Hours</h3>
              <div className="space-y-2 text-sm">
                {[
                  { day: "Saturday – Thursday", time: "9:00 AM – 9:00 PM" },
                  { day: "Friday", time: "2:00 PM – 9:00 PM" },
                ].map((h, i) => (
                  <div key={i} className="flex justify-between text-gray-600">
                    <span>{h.day}</span>
                    <span className="font-medium text-gray-900">{h.time}</span>
                  </div>
                ))}
                <div className="pt-2 mt-2 border-t">
                  <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full inline-block" /> Online support available 24/7
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
              <h3 className="font-bold text-gray-900 mb-2">Fast Track Support</h3>
              <p className="text-sm text-gray-600 mb-4">For urgent issues, WhatsApp us directly for the fastest response.</p>
              <a href="https://wa.me/8801234567890" className="flex items-center justify-center gap-2 w-full bg-[#25d366] text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-[#22c55e] transition-colors">
                <MessageSquare size={16} /> WhatsApp Us Now
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
