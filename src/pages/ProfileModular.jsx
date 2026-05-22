import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Baby,
  Bell,
  CalendarHeart,
  Home,
  LogOut,
  Settings,
  Shield,
  Users,
} from "lucide-react";

import { useAuth } from "@/lib/AuthContext";
import { useFamily } from "@/lib/FamilyContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ProfileOverview from "@/components/profile/ProfileOverview";
import ProfileFamiliesSection from "@/components/profile/ProfileFamiliesSection";
import ProfileMembersSection from "@/components/profile/ProfileMembersSection";
import ProfileCustodySection from "@/components/profile/ProfileCustodySection";
import ProfileSettingsSection from "@/components/profile/ProfileSettingsSection";
import ChildProfiles from "@/pages/ChildProfiles";
import NotificationPreferences from "@/pages/NotificationPreferences";

const tabs = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "families", label: "Families", icon: Users },
  { id: "children", label: "Children", icon: Baby },
  { id: "members", label: "Members", icon: Shield },
  { id: "custody", label: "Custody", icon: CalendarHeart },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings },
];

function familyNameOf(profile) {
  return profile?.family_name || profile?.familyName || "Family Management";
}

function TabButton({ tab, active, onClick }) {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-fit items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition ${
        active
          ? "bg-indigo-600 text-white"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
      }`}
    >
      <Icon className="h-4 w-4" />
      {tab.label}
    </button>
  );
}

export default function ProfileModular() {
  const { logout } = useAuth();
  const { profile, familyId, isOwner, isAdmin } = useFamily();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-[#f8fbff] p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white">
              <Home className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">{familyNameOf(profile)}</h1>
              <p className="text-sm font-semibold text-slate-500">
                Manage your family space, members, children, custody settings, notifications, and app preferences.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {isOwner && <Badge variant="secondary" className="gap-1"><Shield className="h-3 w-3" /> Owner</Badge>}
                {isAdmin && <Badge variant="outline" className="gap-1"><Shield className="h-3 w-3" /> Admin</Badge>}
                {familyId && <Badge variant="outline" className="text-[10px]">Family ID: {familyId.slice(0, 8)}...</Badge>}
              </div>
            </div>
          </div>

          <Button variant="outline" onClick={handleLogout} className="gap-2 border-red-200 text-red-500 hover:text-red-600">
            <LogOut className="h-4 w-4" /> Log out
          </Button>
        </div>

        <div className="mb-5 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {tabs.map((tab) => (
            <TabButton key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />
          ))}
        </div>

        {activeTab === "overview" && <ProfileOverview />}
        {activeTab === "families" && <ProfileFamiliesSection />}
        {activeTab === "children" && <ChildProfiles />}
        {activeTab === "members" && <ProfileMembersSection />}
        {activeTab === "custody" && <ProfileCustodySection />}
        {activeTab === "notifications" && <NotificationPreferences />}
        {activeTab === "settings" && <ProfileSettingsSection />}
      </div>
    </div>
  );
}
