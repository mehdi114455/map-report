import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function TopBar() {
  const { user, logout } = useAuth();
  return (
    <header className="border-b border-outline bg-white">
      <div className="max-w-page mx-auto flex items-center justify-between px-6 py-3">
        <Link to="/" className="font-bold text-lg">
          <span className="text-accent">●</span> CivicReport AI
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <span className="text-muted">{user.email}</span>
              <button
                onClick={logout}
                className="px-3 py-1.5 rounded border border-outline hover:bg-surface-container"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-accent">Log in</Link>
              <Link to="/signup" className="hover:text-accent">Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <TopBar />
        <main className="max-w-page mx-auto px-6 py-8">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}