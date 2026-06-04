import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import { useEffect, useState } from "react";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import NewReport from "./pages/NewReport";
import MyReports from "./pages/MyReports";
import MapScreen from "./pages/MapScreen";
import AdminDashboard from "./pages/AdminDashboard";

function ProtectedLayout() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-muted">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout />;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  const [role, setRole] = useState(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    if (!user) { setChecking(false); return; }
    user.getIdTokenResult().then((res) => {
      setRole(res.claims.role || "resident");
      setChecking(false);
    });
  }, [user]);

  if (loading || checking) return <div className="p-8 text-muted">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role !== "admin") return <Navigate to="/" replace />;
  return children;
}


export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected routes share the Layout (header + bottom nav) */}
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/report" element={<NewReport />} />
            <Route path="/my" element={<MyReports />} />
            <Route path="/map" element={<MapScreen />} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}