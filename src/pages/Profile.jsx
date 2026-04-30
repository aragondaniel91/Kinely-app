import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function Profile() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-2">Perfil Familiar</h1>
      <p className="text-sm text-slate-500 mb-6">
        {profile?.name || user?.displayName || "Usuario"}
      </p>

      <div className="bg-white rounded-2xl shadow p-4 mb-4">
        <p className="text-sm">
          <strong>Email:</strong> {user?.email}
        </p>
      </div>

      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 border border-red-300 text-red-600 rounded-xl py-2 hover:bg-red-50"
      >
        <LogOut className="w-4 h-4" />
        Cerrar sesión
      </button>
    </div>
  );
}
