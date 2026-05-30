import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Baby, Check, HeartHandshake, Home, Lock, Mail, Shield, Sparkles, UserRound, Users } from "lucide-react";

import { useAuth } from "@/lib/AuthContext";
import {
  FAMILY_ROLE_OPTIONS,
  getMemberRoleMeta,
  roleDefaultLivesHere,
  roleDefaultShowOnHomeDashboard,
  roleToPersonType,
  roleToRelationship,
} from "@/lib/memberRoles";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const steps = [
  { id: "account", label: "Account" },
  { id: "role", label: "Role" },
  { id: "mode", label: "Setup" },
  { id: "family", label: "Family" },
  { id: "review", label: "Review" },
];

const roleIconMap = {
  parent: HeartHandshake,
  dad: UserRound,
  mom: UserRound,
  child: Baby,
  grandmother: Users,
  grandfather: Users,
  babysitter: Users,
  caregiver: HeartHandshake,
  family: Users,
};

const roleOptions = FAMILY_ROLE_OPTIONS.map((roleOption) => ({
  ...roleOption,
  id: roleOption.value,
  icon: roleIconMap[roleOption.value] || Users,
  note: roleOption.inviteRecommended ? "Best with a family invitation" : "",
}));

const roleGroups = [
  {
    id: "parents",
    label: "Parents & guardians",
    caption: "Full household control",
    roles: ["parent", "dad", "mom"],
  },
  {
    id: "children",
    label: "Children & teens",
    caption: "Invite-first access",
    roles: ["child"],
  },
  {
    id: "helpers",
    label: "Trusted helpers",
    caption: "Scoped module access",
    roles: ["grandmother", "grandfather", "babysitter", "caregiver", "family"],
  },
];

const roleOptionById = new Map(roleOptions.map((option) => [option.id, option]));

const modeOptions = [
  {
    id: "create",
    label: "Create a new family space",
    description: "Start a private household space for your family, children, tasks, meals, and shared calendars.",
    icon: Home,
  },
  {
    id: "join",
    label: "Join with an invitation",
    description: "Use this if another parent or family admin already invited you by email.",
    icon: Mail,
  },
];

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function Progress({ currentStep }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {steps.map((step, index) => {
        const active = index === currentStep;
        const complete = index < currentStep;
        return (
          <div key={step.id} className="min-w-0">
            <div className={`h-2 rounded-full ${complete || active ? "bg-indigo-600" : "bg-slate-200"}`} />
            <p className={`mt-1 truncate text-[10px] font-black uppercase tracking-wide ${active ? "text-indigo-600" : complete ? "text-slate-700" : "text-slate-400"}`}>
              {step.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function RoleButton({ option, active, onClick }) {
  const Icon = option.icon;
  const accessLabel = option.fullAccess
    ? "Full access"
    : option.inviteRecommended
    ? "Invitation"
    : option.livesHere
    ? "Household"
    : "Limited";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex min-h-[76px] items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition ${
        active
          ? "border-slate-950 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.12)] ring-2 ring-slate-950/5"
          : "border-slate-200 bg-white/85 hover:border-slate-300 hover:bg-white hover:shadow-sm"
      }`}
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition ${
        active ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-900 group-hover:text-white"
      }`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-black text-slate-950">{option.label}</p>
          {active && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
        </div>
        <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
          {option.description}
        </p>
        <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
          option.fullAccess
            ? "bg-emerald-50 text-emerald-700"
            : option.inviteRecommended
            ? "bg-amber-50 text-amber-700"
            : "bg-sky-50 text-sky-700"
        }`}>
          {accessLabel}
        </span>
      </div>
    </button>
  );
}

function RoleSelection({ value, onChange, selectedRoleMeta }) {
  const selectedOption = roleOptionById.get(value) || roleOptions[0];
  const SelectedIcon = selectedOption.icon || Users;
  const selectedChips = [
    selectedRoleMeta?.fullAccess ? "Admin-ready" : "Permission scoped",
    selectedRoleMeta?.livesHere ? "Lives here by default" : "Guest by default",
    selectedRoleMeta?.inviteRecommended ? "Best by invitation" : "Can create space",
  ];

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
        <div className="grid gap-4 p-4 md:grid-cols-[auto_1fr] md:items-center md:p-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-sm">
            <SelectedIcon className="h-8 w-8" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-200">
              Selected role
            </p>
            <h3 className="mt-1 text-2xl font-black tracking-tight">
              {selectedOption.label}
            </h3>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-300">
              {selectedOption.description}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedChips.map((chip) => (
                <span key={chip} className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        {roleGroups.map((group) => (
          <section key={group.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                  {group.label}
                </p>
                <p className="text-xs font-semibold text-slate-400">{group.caption}</p>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              {group.roles.map((roleId) => {
                const option = roleOptionById.get(roleId);
                if (!option) return null;

                return (
                  <RoleButton
                    key={option.id}
                    option={option}
                    active={value === option.id}
                    onClick={() => onChange(option.id)}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {selectedRoleMeta?.inviteRecommended && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-800">
          {selectedRoleMeta.label} accounts are usually added by a family admin so permissions can be limited correctly.
        </div>
      )}
    </div>
  );
}

function SetupOptionCard({ option, active, onClick, disabled = false }) {
  const Icon = option.icon;
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`rounded-3xl border p-4 text-left transition ${
        active
          ? "border-indigo-300 bg-indigo-50 shadow-sm"
          : disabled
          ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
          : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-black text-slate-950">{option.label}</h3>
            {active && <Check className="h-4 w-4 text-indigo-600" />}
          </div>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{option.description}</p>
        </div>
      </div>
    </button>
  );
}

function ChildInputList({ childrenText, setChildrenText }) {
  const childPreview = useMemo(
    () => childrenText.split(",").map((name) => name.trim()).filter(Boolean),
    [childrenText]
  );

  return (
    <div>
      <Label>Children</Label>
      <Input
        value={childrenText}
        onChange={(event) => setChildrenText(event.target.value)}
        placeholder="Child names, separated by commas"
        className="mt-1"
      />
      <p className="mt-1 text-xs font-semibold text-slate-500">
        Separate multiple children with commas. You can add health and care details later.
      </p>
      {childPreview.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {childPreview.map((child) => (
            <span key={child} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
              <Baby className="mr-1 inline h-3 w-3" /> {child}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("dad");
  const [onboardingMode, setOnboardingMode] = useState("create");
  const [familyName, setFamilyName] = useState("");
  const [parent2Name, setParent2Name] = useState("");
  const [parent2Email, setParent2Email] = useState("");
  const [childrenText, setChildrenText] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const selectedRoleMeta = getMemberRoleMeta(role);
  const shouldJoinByInvite = selectedRoleMeta?.inviteRecommended === true;

  const children = useMemo(
    () => childrenText.split(",").map((childName, index) => ({
      id: `child-${String(childName || "child").trim().toLowerCase().replace(/\s+/g, "-") || index + 1}`,
      name: childName.trim(),
      color: index % 2 === 0 ? "green" : "blue",
    })).filter((child) => child.name),
    [childrenText]
  );

  const resolvedFamilyName = familyName.trim() || `${name.trim() || "My"} Family`;

  function validateCurrentStep() {
    setError("");

    if (step === 0) {
      if (!name.trim()) return "Please enter your full name.";
      if (!normalizeEmail(email)) return "Please enter your email address.";
      if (password.length < 6) return "Password must be at least 6 characters.";
      if (password !== confirmPassword) return "Passwords do not match.";
    }

    if (step === 2 && onboardingMode === "join" && !normalizeEmail(inviteEmail || email)) {
      return "Please enter the email address used for the invitation.";
    }

    if (step === 3 && onboardingMode === "create" && !resolvedFamilyName.trim()) {
      return "Please enter a family name.";
    }

    return "";
  }

  function nextStep() {
    const validationError = validateCurrentStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function previousStep() {
    setError("");
    setStep((current) => Math.max(current - 1, 0));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationError = validateCurrentStep();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      await register({
        name,
        email,
        password,
        role,
        onboardingMode,
        familyName: resolvedFamilyName,
        parent2Name,
        parent2Email,
        children,
        relationship: roleToRelationship(role),
        personType: roleToPersonType(role),
        livesHere: roleDefaultLivesHere(role),
        showOnHomeDashboard: roleDefaultShowOnHomeDashboard(role),
      });
      navigate(onboardingMode === "join" ? "/profile?tab=invitations" : "/");
    } catch (err) {
      console.error(err);
      setError(err?.message || "Could not create the account. Check the email/password and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 px-4 py-6 md:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="hidden lg:block">
          <div className="rounded-[2.5rem] border border-white/70 bg-white/70 p-8 shadow-xl backdrop-blur">
            <div className="flex h-16 w-16 items-center justify-center rounded-[2rem] bg-indigo-600 text-white shadow-lg">
              <Sparkles className="h-8 w-8" />
            </div>
            <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950">
              Create your private family space
            </h1>
            <p className="mt-4 text-base font-semibold leading-7 text-slate-600">
              Start a calm, organized space for custody schedules, shared calendars, children, tasks, meals, groceries, and important family details.
            </p>
            <div className="mt-8 grid gap-3">
              <div className="rounded-3xl border border-indigo-100 bg-white p-4">
                <Shield className="h-5 w-5 text-indigo-600" />
                <p className="mt-2 text-sm font-black text-slate-950">Private by family space</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Each family space keeps its own data, members, and permissions separated.</p>
              </div>
              <div className="rounded-3xl border border-blue-100 bg-white p-4">
                <HeartHandshake className="h-5 w-5 text-blue-600" />
                <p className="mt-2 text-sm font-black text-slate-950">Designed for co-parenting</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Coordinate custody calendars, exchanges, and family plans with clearer boundaries.</p>
              </div>
            </div>
          </div>
        </div>

        <Card className="rounded-[2.5rem] border-slate-200 bg-white p-5 shadow-xl md:p-7">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-500">
                Create account
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                Set up your family space
              </h2>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Step {step + 1} of {steps.length}: {steps[step].label}
              </p>
            </div>

            <Progress currentStep={step} />

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
                {error}
              </div>
            )}

            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <Label>Full name</Label>
                  <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" className="mt-1" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@email.com" className="mt-1" />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label>Password</Label>
                    <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimum 6 characters" className="mt-1" />
                  </div>
                  <div>
                    <Label>Confirm password</Label>
                    <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm password" className="mt-1" />
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-500">
                  <Lock className="mr-1 inline h-3.5 w-3.5" /> Your account is used to separate family spaces and permissions.
                </div>
              </div>
            )}

            {step === 1 && (
              <RoleSelection
                value={role}
                onChange={setRole}
                selectedRoleMeta={selectedRoleMeta}
              />
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  {modeOptions.map((option) => (
                    <SetupOptionCard
                      key={option.id}
                      option={{
                        ...option,
                        description:
                          option.id === "create" && shouldJoinByInvite
                            ? "Create your own private family space. Invitations only affect other family spaces you join."
                            : option.description,
                      }}
                      active={onboardingMode === option.id}
                      onClick={() => setOnboardingMode(option.id)}
                    />
                  ))}
                </div>
                {onboardingMode === "join" && (
                  <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
                    <Label>Invitation email</Label>
                    <Input value={inviteEmail || email} onChange={(event) => setInviteEmail(event.target.value)} placeholder="email used in the invitation" className="mt-1 bg-white" />
                    <p className="mt-2 text-xs font-semibold leading-5 text-amber-700">
                      For this MVP, create your account with the same email that was added to the family or custody group. The app will find shared access by email.
                    </p>
                  </div>
                )}
              </div>
            )}

            {step === 3 && onboardingMode === "create" && (
              <div className="space-y-4">
                <div>
                  <Label>Family space name</Label>
                  <Input value={familyName} onChange={(event) => setFamilyName(event.target.value)} placeholder={`${name || "My"} Family`} className="mt-1" />
                  <p className="mt-1 text-xs font-semibold text-slate-500">Use a name your household will recognize.</p>
                </div>
                <ChildInputList childrenText={childrenText} setChildrenText={setChildrenText} />
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label>Second parent/caregiver name</Label>
                    <Input value={parent2Name} onChange={(event) => setParent2Name(event.target.value)} placeholder="Optional" className="mt-1" />
                  </div>
                  <div>
                    <Label>Second parent/caregiver email</Label>
                    <Input type="email" value={parent2Email} onChange={(event) => setParent2Email(event.target.value)} placeholder="Optional" className="mt-1" />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && onboardingMode === "join" && (
              <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
                <Mail className="h-6 w-6 text-blue-600" />
                <h3 className="mt-3 text-xl font-black text-slate-950">Join invitation mode</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                  Your account will be created first. If your email is already listed in a family or custody group, Family Wall will show those shared spaces after login.
                </p>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-xl font-black text-slate-950">Review your setup</h3>
                <div className="grid gap-2 text-sm font-semibold text-slate-600">
                  <p><span className="font-black text-slate-950">Name:</span> {name || "Not set"}</p>
                  <p><span className="font-black text-slate-950">Email:</span> {normalizeEmail(email) || "Not set"}</p>
                  <p><span className="font-black text-slate-950">Role:</span> {roleOptions.find((option) => option.id === role)?.label || role}</p>
                  <p><span className="font-black text-slate-950">Setup:</span> {onboardingMode === "create" ? "Create new family space" : "Join with invitation"}</p>
                  {onboardingMode === "create" && (
                    <>
                      <p><span className="font-black text-slate-950">Family:</span> {resolvedFamilyName}</p>
                      <p><span className="font-black text-slate-950">Children:</span> {children.map((child) => child.name).join(", ") || "None yet"}</p>
                      <p><span className="font-black text-slate-950">Second adult:</span> {parent2Email ? `${parent2Name || "Invited adult"} · ${normalizeEmail(parent2Email)}` : "Not added yet"}</p>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <div className="text-sm font-semibold text-slate-500">
                Already have an account? <Link to="/login" className="font-black text-indigo-600">Sign in</Link>
              </div>
              <div className="flex gap-2">
                {step > 0 && (
                  <Button type="button" variant="outline" onClick={previousStep} className="gap-2 rounded-2xl">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                )}
                {step < steps.length - 1 ? (
                  <Button type="button" onClick={nextStep} className="gap-2 rounded-2xl">
                    Continue <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={submitting} className="gap-2 rounded-2xl">
                    {submitting ? "Creating..." : "Create account"}
                    <Check className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
