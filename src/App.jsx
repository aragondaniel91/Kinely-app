import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";

import PageNotFound from "./lib/PageNotFound";
import AppShell from "@/components/layout/AppShell";

import { AuthProvider, useAuth } from "./lib/AuthContext.jsx";
import { FamilyProvider } from "@/lib/FamilyContext";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Calendar = lazy(() => import("@/pages/Calendar"));
const Custody = lazy(() => import("@/pages/Custody"));
const Tasks = lazy(() => import("@/pages/Tasks"));
const Meals = lazy(() => import("@/pages/Meals"));
const Lists = lazy(() => import("@/pages/Groceries"));
const ChildProfiles = lazy(() => import("@/pages/ChildProfiles"));
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const Profile = lazy(() => import("@/pages/ProfileModular"));

function RouteLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <RouteLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <RouteLoader />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>

        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/custody" element={<Custody />} />
          <Route path="/children" element={<ChildProfiles />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/meals" element={<Meals />} />
          <Route path="/lists" element={<Lists />} />
          <Route path="/groceries" element={<Navigate to="/lists" replace />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <AuthProvider>
      <FamilyProvider>
        <Router>
          <AppRoutes />
          <Toaster />
        </Router>
      </FamilyProvider>
    </AuthProvider>
  );
}

export default App;
