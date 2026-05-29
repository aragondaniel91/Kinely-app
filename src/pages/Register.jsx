import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Baby, Check, HeartHandshake, Home, Lock, Mail, Shield, Sparkles, UserRound, Users } from "lucide-react";

import { useAuth } from "@/lib/AuthContext";
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

const roleOptions = [
  { id: "dad", label: "Dad", description: "I am a father or dad figure.", icon: UserRound },
  { id: "mom", label: "Mom", description: "I am a mother or mom figure.", icon: UserRound },
  { id: "parent", label: "Parent", description: "I am a parent or legal guardian.", icon: HeartHandshake },
  { id: "caregiver", label: "Caregiver", description: "I help care for the child or family.", icon: Users },
];

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

function OptionCard({ option, active, onClick }) {
  const Icon = option.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-3xl border p-4 text-left transition ${
        active
          ? "border-indigo-300 bg-indigo-50 shadow-sm"
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
        placeholder="Joaquin, Mady"
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
                  <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Daniel Aragon" className="mt-1" />
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
              <div className="grid gap-3 md:grid-cols-2">
                {roleOptions.map((option) => (
                  <OptionCard key={option.id} option={option} active={role === option.id} onClick={() => setRole(option.id)} />
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  {modeOptions.map((option) => (
                    <OptionCard key={option.id} option={option} active={onboardingMode === option.id} onClick={() => setOnboardingMode(option.id)} />
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
                  <p className="mt-1 text-xs font-semibold text-slate-500">Example: Daniel & Mary Family, Agustin's Family.</p>
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
