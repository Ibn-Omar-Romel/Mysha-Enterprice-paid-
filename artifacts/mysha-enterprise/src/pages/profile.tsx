import { useState } from "react";
import { useGetProfile, useUpdateProfile, getGetProfileQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User, Mail, Phone, MapPin, Edit2, Check, X,
  LogOut, Package, Heart, Truck, HeadphonesIcon, ChevronRight, LogIn,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

// ─── Safe initials ────────────────────────────────────────────────────────────
function getInitials(name: string | null | undefined): string {
  if (!name || name.trim() === "") return "U";
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0] ?? "")
    .filter(Boolean)
    .join("")
    .substring(0, 2)
    .toUpperCase() || "U";
}

// ─── Not logged in screen ─────────────────────────────────────────────────────
function NotLoggedIn() {
  return (
    <div className="bg-gray-50 min-h-screen flex items-center justify-center py-16 px-4">
      <div className="bg-white rounded-2xl border shadow-sm p-10 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-orange-100">
          <User size={36} className="text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in to your account</h2>
        <p className="text-gray-500 mb-8 text-sm leading-relaxed">
          Please sign in to view and manage your profile, orders, and saved addresses.
        </p>
        <div className="flex flex-col gap-3">
          <Link href="/signin">
            <Button className="w-full h-11 text-base font-semibold gap-2">
              <LogIn size={18} /> Sign In
            </Button>
          </Link>
          <Link href="/signup">
            <Button variant="outline" className="w-full h-11 text-base gap-2">
              <User size={18} /> Create Account
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function ProfileSkeleton() {
  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton className="h-64 w-full rounded-xl" />
          <div className="md:col-span-2">
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Profile page ─────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user: authUser, loading: authLoading, signOut } = useAuth();
  const [, setLocation] = useLocation();

  // Only fetch profile from API once we know the user is logged in.
  // "enabled: false" while authLoading prevents a premature 401.
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useGetProfile({
    query: {
      enabled: !authLoading && !!authUser,
      retry: false,
    },
  });

  const updateProfile = useUpdateProfile();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    street: "",
    city: "",
    country: "Bangladesh",
  });

  // ── Still checking auth ────────────────────────────────────────────────────
  if (authLoading) return <ProfileSkeleton />;

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!authUser) return <NotLoggedIn />;

  // ── Profile is loading from API ────────────────────────────────────────────
  if (profileLoading) return <ProfileSkeleton />;

  // ── Profile API returned an error (e.g. 401 race) ─────────────────────────
  if (profileError && !profile) return <NotLoggedIn />;

  // ── Safe field access — fall back to authUser if profile not yet loaded ────
  const name     = profile?.name    ?? authUser.name  ?? "User";
  const email    = profile?.email   ?? authUser.email ?? "";
  const phone    = profile?.phone   ?? "";
  const avatar   = profile?.avatar  ?? undefined;
  const address  = (profile?.address ?? null) as Record<string, string> | null;
  const joinedAt = profile?.joinedAt ?? null;
  const initials = getInitials(name);

  const startEditing = () => {
    setFormData({
      name,
      email,
      phone,
      street:  address?.street  ?? "",
      city:    address?.city    ?? "",
      country: address?.country ?? "Bangladesh",
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    updateProfile.mutate(
      {
        data: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: {
            name:    formData.name,
            phone:   formData.phone,
            street:  formData.street,
            city:    formData.city,
            country: formData.country,
          },
        },
      },
      {
        onSuccess: () => {
          setIsEditing(false);
          queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
          toast.success("Profile updated successfully");
        },
        onError: () => {
          toast.error("Failed to update profile");
        },
      }
    );
  };

  const handleSignOut = async () => {
    await signOut();
    setLocation("/");
  };

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Account</h1>

        <div className="grid md:grid-cols-3 gap-6">
          {/* ── Sidebar ──────────────────────────────────────────────── */}
          <div className="space-y-6">
            {/* Avatar card */}
            <div className="bg-white rounded-xl border p-6 text-center">
              <Avatar className="w-24 h-24 mx-auto mb-4 border-2 border-primary/20">
                <AvatarImage src={avatar ?? ""} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold text-gray-900">{name}</h2>
              <p className="text-sm text-gray-500 mb-4">{email}</p>

              <div className="flex justify-center mb-6">
                <div className="bg-orange-50 text-primary px-3 py-1 rounded-full text-xs font-bold border border-orange-100">
                  Premium Member
                </div>
              </div>

              <div className="border-t pt-4 text-sm text-gray-500 text-left space-y-2">
                <div className="flex justify-between">
                  <span>Joined</span>
                  <span className="font-medium text-gray-900">
                    {joinedAt
                      ? format(new Date(joinedAt), "MMM yyyy")
                      : "Recently"}
                  </span>
                </div>
              </div>
            </div>

            {/* Nav */}
            <div className="bg-white rounded-xl border overflow-hidden">
              <Button
                variant="ghost"
                className="w-full justify-start rounded-none h-12 px-6 font-normal hover:bg-gray-50 hover:text-primary text-gray-600"
              >
                <User size={18} className="mr-3" /> Account Details
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start rounded-none h-12 px-6 font-normal hover:bg-gray-50 hover:text-primary text-gray-600"
                onClick={() => setLocation("/orders")}
              >
                <Package size={18} className="mr-3" /> Order History
              </Button>
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="w-full justify-start rounded-none h-12 px-6 font-normal text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <LogOut size={18} className="mr-3" /> Sign Out
              </Button>
            </div>

            {/* Customer service */}
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                  <HeadphonesIcon size={13} /> Customer Service
                </h3>
              </div>
              {[
                { href: "/orders",   icon: Package,        label: "Order History"  },
                { href: "/track",    icon: Truck,          label: "Track Order"    },
                { href: "/wishlist", icon: Heart,          label: "My Wishlist"    },
                { href: "/contact",  icon: HeadphonesIcon, label: "Support Center" },
              ].map(({ href, icon: Icon, label }) => (
                <Link key={href} href={href}>
                  <button className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-primary transition-colors border-b last:border-0">
                    <span className="flex items-center gap-3">
                      <Icon size={15} className="text-primary" />
                      {label}
                    </span>
                    <ChevronRight size={14} className="text-gray-400" />
                  </button>
                </Link>
              ))}
            </div>

            {/* Contact */}
            <div className="bg-white rounded-xl border p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                Contact Us
              </h3>
              <div className="flex items-start gap-3 text-sm text-gray-600">
                <Phone size={14} className="text-primary mt-0.5 flex-shrink-0" />
                <span>+880 1234-567890</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-gray-600">
                <Mail size={14} className="text-primary mt-0.5 flex-shrink-0" />
                <span className="break-all">support@myshaenterprise.com</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-gray-600">
                <MapPin size={14} className="text-primary mt-0.5 flex-shrink-0" />
                <span>123 Tech Avenue, Dhaka 1212, Bangladesh</span>
              </div>
            </div>
          </div>

          {/* ── Main content ─────────────────────────────────────────── */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-900">Personal Information</h3>
                {!isEditing ? (
                  <Button variant="outline" size="sm" onClick={startEditing} className="h-8">
                    <Edit2 size={14} className="mr-2" /> Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="h-8">
                      <X size={14} className="mr-1" /> Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={updateProfile.isPending} className="h-8">
                      <Check size={14} className="mr-1" /> Save
                    </Button>
                  </div>
                )}
              </div>

              <div className="p-6">
                {!isEditing ? (
                  <div className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                          <User size={14} /> Full Name
                        </p>
                        <p className="font-medium text-gray-900">{name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                          <Mail size={14} /> Email Address
                        </p>
                        <p className="font-medium text-gray-900">{email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                          <Phone size={14} /> Phone Number
                        </p>
                        <p className="font-medium text-gray-900">
                          {phone || (
                            <span className="text-gray-400 italic text-sm">Not set</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="pt-6 border-t">
                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <MapPin size={18} className="text-primary" /> Default Shipping Address
                      </h4>
                      {address ? (
                        <div className="bg-gray-50 p-4 rounded-lg border">
                          <p className="font-medium text-gray-900 mb-1">{name}</p>
                          {phone && <p className="text-gray-600 text-sm">{phone}</p>}
                          {address.street && (
                            <p className="text-gray-600 text-sm mt-2">{address.street}</p>
                          )}
                          {address.city && (
                            <p className="text-gray-600 text-sm">
                              {address.city}
                              {address.country ? `, ${address.country}` : ""}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm italic">
                          No default address saved. Click "Edit Profile" to add one.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+880 1700-000000"
                        />
                      </div>
                    </div>

                    <div className="pt-4">
                      <h4 className="font-medium text-gray-900 mb-4">Shipping Address</h4>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="street">Street Address</Label>
                          <Input
                            id="street"
                            value={formData.street}
                            onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                            placeholder="House 12, Road 5, Block C"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="city">City</Label>
                          <Input
                            id="city"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            placeholder="Dhaka"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="country">Country</Label>
                          <Input
                            id="country"
                            value={formData.country}
                            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
