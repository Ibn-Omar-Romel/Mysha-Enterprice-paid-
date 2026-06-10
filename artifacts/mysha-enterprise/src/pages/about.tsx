import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Truck, Star, Users, Award, HeadphonesIcon, MapPin, Phone, Mail } from "lucide-react";

const stats = [
  { value: "50,000+", label: "Happy Customers" },
  { value: "10,000+", label: "Products" },
  { value: "6+", label: "Years in Business" },
  { value: "99.2%", label: "Satisfaction Rate" },
];

const team = [
  { name: "Tariq Rahman", role: "CEO & Founder", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face" },
  { name: "Nadia Islam", role: "Head of Operations", image: "https://images.unsplash.com/photo-1494790108755-2616b612b830?w=300&h=300&fit=crop&crop=face" },
  { name: "Karim Hossain", role: "Chief Technology Officer", image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&crop=face" },
  { name: "Sadia Akter", role: "Customer Success Lead", image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop&crop=face" },
];

const values = [
  { icon: <ShieldCheck size={28} />, title: "Authenticity", desc: "Every product we sell is 100% genuine with official brand warranty. No counterfeits, ever." },
  { icon: <Truck size={28} />, title: "Fast Delivery", desc: "Same-day dispatch for orders before 2PM. Delivered to your doorstep within 24–48 hours." },
  { icon: <Star size={28} />, title: "Best Prices", desc: "We work directly with brands and authorized distributors to offer you the most competitive prices." },
  { icon: <HeadphonesIcon size={28} />, title: "Expert Support", desc: "Our tech experts are available 7 days a week to help you pick the right product." },
];

export default function AboutPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative bg-[#0d1117] text-white overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1491933382434-500287f9b54b?q=80&w=1400&fit=crop"
            alt="Electronics store"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117] via-[#0d1117]/80 to-[#0d1117]/60" />
        </div>
        <div className="relative container mx-auto px-4 py-24 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-block px-3 py-1 bg-primary/20 text-primary font-medium text-sm rounded-full border border-primary/30 mb-6">
              Our Story
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Bangladesh's Most Trusted <span className="text-primary">Electronics Store</span>
            </h1>
            <p className="text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto">
              Founded in 2018, Mysha Enterprise has grown from a small shop in Dhaka to one of Bangladesh's leading premium electronics retailers, serving over 50,000 customers across the country.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-gray-50 border-y">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, i) => (
              <div key={i}>
                <p className="text-4xl font-bold text-primary mb-2">{stat.value}</p>
                <p className="text-gray-600 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We believe everyone in Bangladesh deserves access to the latest technology at fair prices. Our mission is to bridge the gap between global tech brands and Bangladeshi consumers — with authenticity, speed, and exceptional service.
              </p>
              <p className="text-gray-600 leading-relaxed mb-8">
                From Apple to Samsung, Dyson to Sony — we are an authorized retailer for all major brands, ensuring you always get genuine products with full warranty support.
              </p>
              <Link href="/category/all">
                <Button className="px-8">Shop Now</Button>
              </Link>
            </div>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1588508065123-287b28e013da?q=80&w=600&h=450&fit=crop"
                alt="Our electronics store"
                className="rounded-2xl shadow-xl w-full object-cover"
              />
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl p-4 shadow-lg border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                    <Award size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Authorized Retailer</p>
                    <p className="text-xs text-gray-500">All major brands</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Us</h2>
            <p className="text-gray-600 max-w-xl mx-auto">These aren't just words — they're the principles we live by every day.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v, i) => (
              <div key={i} className="bg-white rounded-xl border p-6">
                <div className="w-14 h-14 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
                  {v.icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{v.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Meet the Team</h2>
            <p className="text-gray-600 max-w-xl mx-auto">The passionate people behind Mysha Enterprise.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member, i) => (
              <div key={i} className="bg-white rounded-xl border p-6 text-center hover:shadow-md transition-shadow">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-20 h-20 rounded-full object-cover mx-auto mb-4 border-4 border-primary/10"
                />
                <h3 className="font-bold text-gray-900">{member.name}</h3>
                <p className="text-sm text-primary font-medium mt-1">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#0d1117] text-white">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <Users size={48} className="text-primary mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Join Our Growing Family</h2>
          <p className="text-gray-400 mb-8">50,000+ customers trust us. Ready to experience the Mysha difference?</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/category/all">
              <Button className="px-8 h-12">Browse Products</Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" className="px-8 h-12 border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white">Contact Us</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
