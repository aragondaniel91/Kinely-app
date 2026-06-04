import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import {
  BrowserRouter as Router,
  Link,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";

import PageNotFound from "./lib/PageNotFound";
import AppShell from "@/components/layout/AppShell";
import RouteErrorBoundary from "@/components/app/RouteErrorBoundary";

import { AuthProvider, useAuth } from "./lib/AuthContext.jsx";
import { FamilyProvider, useFamily } from "@/lib/FamilyContext";
import { canReadModule } from "@/lib/modulePermissions";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Calendar = lazy(() => import("@/pages/Calendar"));
const Custody = lazy(() => import("@/pages/Custody"));
const Tasks = lazy(() => import("@/pages/Tasks"));
const Meals = lazy(() => import("@/pages/Meals"));
const Lists = lazy(() => import("@/pages/Groceries"));
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

function AccessDenied({ moduleName = "this area" }) {
  return (
    <div className="kinly-gradient-bg flex min-h-[calc(100dvh-8rem)] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-[2rem] border border-white/80 bg-white p-6 text-center shadow-xl">
        <h1 className="text-2xl font-black tracking-tight text-slate-950">Access limited</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
          Your current family role does not include access to {moduleName}. A family admin can update this from Profile.
        </p>
        <Link
          to="/profile"
          className="mt-5 inline-flex rounded-full bg-indigo-600 px-5 py-2 text-sm font-black text-white transition hover:bg-indigo-700"
        >
          Open profile
        </Link>
      </div>
    </div>
  );
}

function RequireFamilySpace({ children, moduleName = "", label = "this area" }) {
  const { isLoading, profile, familyId, perms } = useFamily();

  if (isLoading) {
    return <RouteLoader />;
  }

  if (!profile || !familyId) {
    return <Navigate to="/profile?tab=invitations" replace />;
  }

  if (moduleName && !canReadModule(perms, moduleName)) {
    return <AccessDenied moduleName={label} />;
  }

  return children;
}

function RequireModuleAccess({ children, moduleName = "", label = "this area" }) {
  const { isLoading, profile, familyId, perms, hasCustodyAccess, custodyGroupsLoading, isAdmin, isOwner } = useFamily();

  if (isLoading || (moduleName === "custody" && custodyGroupsLoading)) {
    return <RouteLoader />;
  }

  if (moduleName === "custody") {
    if (!profile || !familyId) return <AccessDenied moduleName={label} />;
    if (!isAdmin && !isOwner && !hasCustodyAccess && !canReadModule(perms, "custody")) {
      return <AccessDenied moduleName={label} />;
    }
    return children;
  }

  if (moduleName && !canReadModule(perms, moduleName)) {
    return <AccessDenied moduleName={label} />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoader />}>
      <RouteErrorBoundary>
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
            <Route path="/" element={<RequireFamilySpace moduleName="home" label="Home"><Dashboard /></RequireFamilySpace>} />
            <Route path="/calendar" element={<RequireFamilySpace moduleName="calendar" label="Calendar"><Calendar /></RequireFamilySpace>} />
            <Route path="/custody" element={<RequireModuleAccess moduleName="custody" label="Custody"><Custody /></RequireModuleAccess>} />
            <Route path="/children" element={<Navigate to="/profile?tab=members" replace />} />
            <Route path="/tasks" element={<RequireFamilySpace moduleName="tasks" label="Tasks"><Tasks /></RequireFamilySpace>} />
            <Route path="/meals" element={<RequireFamilySpace moduleName="meals" label="Meals"><Meals /></RequireFamilySpace>} />
            <Route path="/lists" element={<RequireFamilySpace moduleName="lists" label="Lists"><Lists /></RequireFamilySpace>} />
            <Route path="/groceries" element={<Navigate to="/lists" replace />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </RouteErrorBoundary>
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
