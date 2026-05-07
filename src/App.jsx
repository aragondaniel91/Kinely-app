import { Toaster } from "@/components/ui/toaster";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";

import PageNotFound from "./lib/PageNotFound";
import AppShell from "@/components/layout/AppShell";

import Dashboard from "@/pages/Dashboard";
import Calendar from "@/pages/Calendar";
import Custody from "@/pages/Custody";
import Tasks from "@/pages/Tasks";
import Meals from "@/pages/Meals";
import Groceries from "@/pages/Groceries";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Profile from "@/pages/ProfileV3";

import { AuthProvider, useAuth } from "./lib/AuthContext.jsx";
import { FamilyProvider } from "@/lib/FamilyContext";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
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
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/meals" element={<Meals />} />
        <Route path="/groceries" element={<Groceries />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
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
