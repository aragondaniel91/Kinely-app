import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CalendarDays, HeartHandshake, Lock, Shield, Sparkles } from "lucide-react";

import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login({ email, password });
      navigate("/");
    } catch (err) {
      setError("Invalid email or password. Please check your information and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 px-4 py-6 md:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="hidden lg:block">
          <div className="rounded-[2.5rem] border border-white/70 bg-white/70 p-8 shadow-xl backdrop-blur">
            <div className="flex h-16 w-16 items-center justify-center rounded-[2rem] bg-indigo-600 text-white shadow-lg">
              <Sparkles className="h-8 w-8" />
            </div>

            <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950">
              Welcome back to your family space
            </h1>

            <p className="mt-4 text-base font-semibold leading-7 text-slate-600">
              Keep custody schedules, family plans, tasks, meals, groceries, and important care details organized in one calm place.
            </p>

            <div className="mt-8 grid gap-3">
              <div className="rounded-3xl border border-indigo-100 bg-white p-4">
                <Shield className="h-5 w-5 text-indigo-600" />
                <p className="mt-2 text-sm font-black text-slate-950">Private by family space</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                  Your household and custody data stay scoped to the right family.
                </p>
              </div>

              <div className="rounded-3xl border border-blue-100 bg-white p-4">
                <HeartHandshake className="h-5 w-5 text-blue-600" />
                <p className="mt-2 text-sm font-black text-slate-950">Built for shared parenting</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                  Designed to make coordination feel clearer, calmer, and less stressful.
                </p>
              </div>
            </div>
          </div>
        </div>

        <Card className="rounded-[2.5rem] border-slate-200 bg-white p-5 shadow-xl md:p-7">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-500">
                Sign in
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                Continue to Family Wall
              </h2>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Access your private family dashboard.
              </p>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@email.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Your password"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-500">
              <Lock className="mr-1 inline h-3.5 w-3.5" />
              Your sign-in keeps each family space private and separated.
            </div>

            <Button type="submit" disabled={submitting} className="h-11 w-full rounded-2xl font-black">
              {submitting ? "Signing in..." : "Sign in"}
            </Button>

            <div className="flex flex-col gap-2 text-center text-sm font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:text-left">
              <Link to="/register" className="text-indigo-700 hover:text-indigo-900">
                Create an account
              </Link>
              <button
                type="button"
                className="text-slate-400 cursor-not-allowed"
                title="Password reset will be added in a later step"
                disabled
              >
                Forgot password?
              </button>
            </div>

            <div className="rounded-3xl border border-blue-100 bg-blue-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-700">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-950">One place for family rhythm</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                    Calendar, custody, tasks, meals, groceries, and care details stay connected.
                  </p>
                </div>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
