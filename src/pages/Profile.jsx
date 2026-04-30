import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Save, UserPlus, LogOut, Plus, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function Profile() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const [familyName, setFamilyName] = useState("Familia Aragon");
  const [children, setChildren] = useState(["Joaquin", "Mady"]);
  const [newChild, setNewChild] = useState("");
  const [parent1, setParent1] = useState(profile?.name || user?.displayName || "Daniel");
  const [parent2, setParent2] = useState("Mary");
  const [inviteEmail, setInviteEmail] = useState("");

  const handleAddChild = () => {
    if (!newChild.trim()) return;
    setChildren([...children, newChild.trim()]);
    setNewChild("");
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#faf7f5] p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center">
            <Heart className="w-7 h-7 text-white fill-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Perfil Familiar</h1>
            <p className="text-slate-500">{familyName}</p>
          </div>
        </div>

        <section className="bg-white rounded-2xl shadow p-5 mb-6 border">
          <h2 className="font-bold text-sm uppercase tracking-wider text-slate-500 mb-4">
            Información Familiar
          </h2>

          <label className="block mb-2">Nombre de la familia</label>
          <input
            className="w-full border rounded-xl px-4 py-3 mb-5"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
          />

          <label className="block mb-2">Hijos / Hijas</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {children.map((child, index) => (
              <span
                key={index}
                className="flex items-center gap-2 bg-indigo-100 text-indigo-700 rounded-xl px-3 py-1.5"
              >
                👶 {child}
                <button onClick={() => setChildren(children.filter((_, i) => i !== index))}>
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              className="flex-1 border rounded-xl px-4 py-3"
              placeholder="Nombre del hijo/hija"
              value={newChild}
              onChange={(e) => setNewChild(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddChild()}
            />
            <button
              onClick={handleAddChild}
              className="border rounded-xl px-4"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-slate-500 mt-2">Presiona Enter o + para agregar</p>
        </section>

        <section className="bg-white rounded-2xl shadow p-5 mb-6 border">
          <h2 className="font-bold text-sm uppercase tracking-wider text-slate-500 mb-4">
            Padres
          </h2>

          <label className="block mb-2">👨 Papá (tú)</label>
          <input
            className="w-full border rounded-xl px-4 py-3 mb-5"
            value={parent1}
            onChange={(e) => setParent1(e.target.value)}
          />

          <label className="block mb-2">👩 Mamá</label>
          <input
            className="w-full border rounded-xl px-4 py-3"
            value={parent2}
            onChange={(e) => setParent2(e.target.value)}
          />
        </section>

        <section className="bg-white rounded-2xl shadow p-5 mb-6 border">
          <h2 className="font-bold text-sm uppercase tracking-wider text-slate-500 mb-4">
            Invitar a la otra persona
          </h2>

          <div className="flex gap-3">
            <input
              className="flex-1 border rounded-xl px-4 py-3"
              type="email"
              placeholder="email@ejemplo.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <button className="bg-indigo-500 text-white rounded-xl px-5 flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Invitar
            </button>
          </div>

          <p className="text-sm text-slate-500 mt-3">
            Le llegará un email para crear su cuenta y ver el calendario
          </p>
        </section>

        <button className="w-full bg-indigo-600 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 mb-3">
          <Save className="w-5 h-5" />
          Guardar cambios
        </button>

        <button
          onClick={handleLogout}
          className="w-full border border-red-300 text-red-500 rounded-xl py-3 font-semibold flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
