import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await login(email, password);
      navigate("/");
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white border border-outline rounded-lg p-6">
      <h1 className="text-2xl font-bold mb-4">Log in</h1>
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
            className="w-full border border-outline rounded px-3 py-2 focus:border-navy outline-none"
          />
        </div>
        {err && <p className="text-error text-sm">{err}</p>}
        <button className="w-full bg-accent hover:bg-primary text-white font-semibold py-2 rounded">
          Log in
        </button>
        <p className="text-sm text-muted">
          No account? <Link to="/signup" className="text-accent">Sign up</Link>
        </p>
      </form>
    </div>
  );
}