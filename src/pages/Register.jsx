import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await register({ name, email, password });
      navigate("/");
    } catch (err) {
      console.error(err);
      setError("Could not create the account. Check the email/password and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white rounded-2xl shadow p-6 space-y-4"
      >
        <div>
          <h1 className="text-2xl font-bold">Create account</h1>
          <p className="text-sm text-slate-500">Start using Family Wall</p>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            {error}
          </div>
        )}

        <input
          className="w-full border rounded-lg px-3 py-2"
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <input
          className="w-full border rounded-lg px-3 py-2"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          className="w-full border rounded-lg px-3 py-2"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-slate-900 text-white rounded-lg py-2 disabled:opacity-50"
        >
          {submitting ? "Creating account..." : "Create account"}
        </button>

        <p className="text-sm text-center text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="text-slate-900 font-medium">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
