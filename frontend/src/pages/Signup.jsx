import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Building2 } from "lucide-react";
import { useAuth } from "../AuthContext";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    try {
      await signup(email, password);
      navigate("/");
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-surface">
      <Link to="/" className="flex items-center gap-2 mb-6">
        <Building2 className="w-7 h-7 text-accent" />
        <span className="font-bold text-xl text-ink">CivicReport AI</span>
      </Link>
      <div className="w-full max-w-md bg-white border border-outline rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-4">Create account</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-outline rounded px-3 py-2 focus:border-navy outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-semibold block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full border border-outline rounded px-3 py-2 focus:border-navy outline-none"
            />
          </div>
          {err && <p className="text-error text-sm">{err}</p>}
          <button className="w-full bg-accent hover:bg-primary text-white font-semibold py-2 rounded">
            Sign up
          </button>
          <p className="text-sm text-muted">
            Have an account? <Link to="/login" className="text-accent">Log in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}