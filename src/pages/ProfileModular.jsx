import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Bell,
  CalendarHeart,
  Home,
  Layers3,
  LogOut,
  Mail,
  Settings,
  Shield,
} from "lucide-react";

import { useAuth } from "@/lib/AuthContext";
import { useFamily } from "@/lib/FamilyContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ProfileOverview from "@/components/profile/ProfileOverview";
import ProfileFamiliesSection from "@/components/profile/ProfileFamiliesSection";
import ProfileMembersSection from "@/components/profile/ProfileMembersSection";
import ProfileCustodySection from "@/components/profile/ProfileCustodySection";
import ProfileInvitationsSection from "@/components/profile/ProfileInvitationsSection";
import ProfileSettingsSection from "@/components/profile/ProfileSettingsSection";
import NotificationInbox from "@/components/profile/NotificationInbox";
import ChildProfiles from "@/pages/ChildProfiles";
import NotificationPreferences from "@/pages/NotificationPreferences";

const tabs = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "families", label: "Family Space", icon: Layers3 },
  { id: "members", label: "People & Access", icon: Shield },
  { id: "invitations", label: "Invites", icon: Mail },
  { id: "custody", label: "Custody", icon: CalendarHeart },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings },
];

function normalizeTabId(tabId) {
  return tabId === "children" ? "members" : tabId;
}

function familyNameOf(profile) {
  return profile?.family_name || profile?.familyName || "Family Management";
}

function TabButton({ tab, active, onClick }) {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-[112px] snap-start items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-black transition md:min-w-fit md:px-4 md:text-sm ${
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
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const requestedTab = normalizeTabId(searchParams.get("tab"));
    if (tabs.some((tab) => tab.id === requestedTab)) return requestedTab;
    return profile ? "overview" : "invitations";
  });

  useEffect(() => {
    const requestedTab = normalizeTabId(searchParams.get("tab"));
    if (tabs.some((tab) => tab.id === requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, [searchParams]);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen kinely-gradient-bg p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white">
              <Home className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">{familyNameOf(profile)}</h1>
              <p className="text-sm font-semibold text-slate-500">
                Manage the active family space, people, roles, permissions, custody, notifications, and app preferences.
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

        <div className="mb-5 grid grid-flow-col auto-cols-max gap-2 overflow-x-auto overscroll-x-contain rounded-2xl border border-slate-200 bg-white p-2 shadow-sm snap-x">
          {tabs.map((tab) => (
            <TabButton key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />
          ))}
        </div>

        {activeTab === "overview" && <ProfileOverview />}
        {activeTab === "families" && <ProfileFamiliesSection />}
        {activeTab === "members" && (
          <div className="space-y-5">
            <ProfileMembersSection />
            <ChildProfiles embedded />
          </div>
        )}
        {activeTab === "invitations" && <ProfileInvitationsSection />}
        {activeTab === "custody" && <ProfileCustodySection />}
        {activeTab === "notifications" && (
          <div className="space-y-6">
            <NotificationInbox />
            <NotificationPreferences />
          </div>
        )}
        {activeTab === "settings" && <ProfileSettingsSection />}
      </div>
    </div>
  );
}
