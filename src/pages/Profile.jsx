import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  Save,
  UserPlus,
  LogOut,
  Plus,
  X,
  Shield,
  Mail,
  Users,
} from "lucide-react";

import { useAuth } from "@/lib/AuthContext";
import { useFamily } from "@/lib/FamilyContext";
import ParentColorPicker from "@/components/profile/ParentColorPicker";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function Profile() {
  const { logout } = useAuth();
  const {
    user,
    profile,
    familyId,
    isOwner,
    isAdmin,
    myEmail,
    updateActiveFamily,
    refreshFamilies,
  } = useFamily();

  const navigate = useNavigate();

  const [familyName, setFamilyName] = useState("");
  const [children, setChildren] = useState([]);
  const [newChild, setNewChild] = useState("");

  const [parent1Name, setParent1Name] = useState("");
  const [parent1Role, setParent1Role] = useState("dad");
  const [parent1Color, setParent1Color] = useState("blue");

  const [parent2Name, setParent2Name] = useState("");
  const [parent2Email, setParent2Email] = useState("");
  const [parent2Role, setParent2Role] = useState("mom");
  const [parent2Color, setParent2Color] = useState("amber");

  const [inviteEmail, setInviteEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    if (!profile) return;

    setFamilyName(profile.family_name || profile.familyName || "");

    setChildren(
      Array.isArray(profile.children)
        ? profile.children
        : profile.child_name
        ? [profile.child_name]
        : []
    );

    setParent1Name(
      profile.parent1_name || profile.parent1Name || user?.displayName || ""
    );
    setParent1Role(profile.parent1_role || profile.parent1Role || "dad");
    setParent1Color(profile.parent1_color || profile.parent1Color || "blue");

    setParent2Name(profile.parent2_name || profile.parent2Name || "");
    setParent2Email(profile.parent2_email || profile.parent2Email || "");
    setParent2Role(profile.parent2_role || profile.parent2Role || "mom");
    setParent2Color(profile.parent2_color || profile.parent2Color || "amber");

    setInviteEmail(profile.parent2_email || profile.parent2Email || "");
  }, [profile, user]);

  const handleAddChild = () => {
    if (!newChild.trim()) return;

    setChildren((prev) => [...prev, newChild.trim()]);
    setNewChild("");
  };

  const handleRemoveChild = (index) => {
    setChildren((prev) => prev.filter((_, i) => i !== index));
  };

  if (!familyId || !isAdmin) return;
  const handleSave = async () => {
    console.log("Saving profile with:", {
      familyId,
      isAdmin,
      isOwner,
      profile,
      familyName,
      children,
      parent1Name,
      parent1Role,
      parent1Color,
      parent2Name,
      parent2Email,
      parent2Role,
      parent2Color,
    });

    if (!familyId) {
      alert("No active familyId found. The profile cannot be saved.");
      return;
    }

    if (!isAdmin) {
      alert("You do not have admin permission to edit this family.");
      return;
    }

    setSaving(true);
    setSavedMessage("");

    try {
      const cleanChildren = children
        .map((child) => child.trim())
        .filter(Boolean);

      const payload = {
        familyName: familyName.trim() || "Mi familia",
        family_name: familyName.trim() || "Mi familia",

        children: cleanChildren,

        parent1Name: parent1Name.trim(),
        parent1_name: parent1Name.trim(),
        parent1Role,
        parent1_role: parent1Role,
        parent1Color,
        parent1_color: parent1Color,

        parent2Name: parent2Name.trim(),
        parent2_name: parent2Name.trim(),
        parent2Email: parent2Email.trim().toLowerCase(),
        parent2_email: parent2Email.trim().toLowerCase(),
        parent2Role,
        parent2_role: parent2Role,
        parent2Color,
        parent2_color: parent2Color,
      };

      console.log("Profile payload:", payload);

      await updateActiveFamily(payload);
      await refreshFamilies?.();

      setSavedMessage("Cambios guardados correctamente.");
      alert("Cambios guardados correctamente.");
    } catch (error) {
      console.error("Error saving family profile:", error);
      alert(`Error saving profile: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInviteEmail = async () => {
    if (!familyId || !isAdmin || !inviteEmail.trim()) return;

    const email = inviteEmail.trim().toLowerCase();

    setSaving(true);
    setSavedMessage("");

    try {
      const existingMembers = Array.isArray(profile?.members)
        ? profile.members
        : [];

      const existingMemberEmails = Array.isArray(profile?.memberEmails)
        ? profile.memberEmails
        : Array.isArray(profile?.member_emails)
        ? profile.member_emails
        : [];

      const memberAlreadyExists = existingMembers.some(
        (member) => member.email?.toLowerCase() === email
      );

      const updatedMembers = memberAlreadyExists
        ? existingMembers
        : [
            ...existingMembers,
            {
              email,
              name: parent2Name || "",
              role: "member",
              isAdmin: false,
              permissions: {
                calendar: { read: true, write: true },
                tasks: { read: true, write: true },
                meals: { read: true, write: true },
                groceries: { read: true, write: true },
              },
            },
          ];

      const updatedMemberEmails = Array.from(
        new Set([...existingMemberEmails, email, myEmail].filter(Boolean))
      );

      await updateActiveFamily({
        parent2Email: email,
        parent2_email: email,
        members: updatedMembers,
        memberEmails: updatedMemberEmails,
        member_emails: updatedMemberEmails,
      });

      await refreshFamilies?.();

      setParent2Email(email);
      setSavedMessage(
        "Email agregado a la familia. La otra persona deberá registrarse con ese mismo email para ver esta familia."
      );
    } catch (error) {
      console.error("Error saving invite email:", error);
      alert(`Error saving invite email: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const canEdit = isAdmin === true;

  return (
    <div className="min-h-screen bg-[#faf7f5] p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center">
            <Heart className="w-7 h-7 text-white fill-white" />
          </div>

          <div className="flex-1">
            <h1 className="text-3xl font-bold">Perfil Familiar</h1>
            <p className="text-slate-500">
              {familyName || "Configuración de familia"}
            </p>

            <div className="flex gap-2 mt-2">
              {isOwner && (
                <Badge variant="secondary" className="gap-1">
                  <Shield className="w-3 h-3" />
                  Owner
                </Badge>
              )}

              {isAdmin && (
                <Badge variant="outline" className="gap-1">
                  <Shield className="w-3 h-3" />
                  Admin
                </Badge>
              )}

              {familyId && (
                <Badge variant="outline" className="text-[10px]">
                  Family ID: {familyId.slice(0, 8)}...
                </Badge>
              )}
            </div>
          </div>
        </div>

        {!canEdit && (
          <Card className="p-4 mb-6 border-amber-200 bg-amber-50">
            <p className="text-sm text-amber-800">
              Tienes acceso de lectura. Solo un administrador puede modificar la
              configuración de esta familia.
            </p>
          </Card>
        )}

        {savedMessage && (
          <Card className="p-4 mb-6 border-green-200 bg-green-50">
            <p className="text-sm text-green-800">{savedMessage}</p>
          </Card>
        )}

        <Card className="p-5 mb-6">
          <h2 className="font-bold text-sm uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Información Familiar
          </h2>

          <div className="space-y-4">
            <div>
              <Label>Nombre de la familia</Label>
              <Input
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                disabled={!canEdit}
                placeholder="Ej. Familia Fernandez"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Hijos / Hijas</Label>

              <div className="flex flex-wrap gap-2 my-3">
                {children.map((child, index) => (
                  <span
                    key={`${child}-${index}`}
                    className="flex items-center gap-2 bg-indigo-100 text-indigo-700 rounded-xl px-3 py-1.5"
                  >
                    👶 {child}
                    {canEdit && (
                      <button onClick={() => handleRemoveChild(index)}>
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </span>
                ))}

                {children.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No children added yet.
                  </p>
                )}
              </div>

              {canEdit && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Nombre del hijo/hija"
                    value={newChild}
                    onChange={(e) => setNewChild(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddChild()}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddChild}
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              )}

              {canEdit && (
                <p className="text-sm text-slate-500 mt-2">
                  Presiona Enter o + para agregar.
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-5 mb-6">
          <h2 className="font-bold text-sm uppercase tracking-wider text-slate-500 mb-4">
            Padres / Cuidadores principales
          </h2>

          <div className="space-y-6">
            <div className="rounded-2xl border p-4 bg-blue-50/40">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nombre Parent 1</Label>
                  <Input
                    value={parent1Name}
                    onChange={(e) => setParent1Name(e.target.value)}
                    disabled={!canEdit}
                    placeholder="Daniel"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Rol</Label>
                  <select
                    value={parent1Role}
                    onChange={(e) => {
                      const role = e.target.value;
                      setParent1Role(role);
                      setParent2Role(role === "dad" ? "mom" : "dad");
                    }}
                    disabled={!canEdit}
                    className="w-full border rounded-xl px-3 py-2 mt-1 bg-white"
                  >
                    <option value="dad">Papá</option>
                    <option value="mom">Mamá</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <ParentColorPicker
                  label="Color Parent 1"
                  value={parent1Color}
                  onChange={setParent1Color}
                />
              </div>
            </div>

            <div className="rounded-2xl border p-4 bg-amber-50/40">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nombre Parent 2</Label>
                  <Input
                    value={parent2Name}
                    onChange={(e) => setParent2Name(e.target.value)}
                    disabled={!canEdit}
                    placeholder="Nombre"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Rol</Label>
                  <select
                    value={parent2Role}
                    onChange={(e) => {
                      const role = e.target.value;
                      setParent2Role(role);
                      setParent1Role(role === "dad" ? "mom" : "dad");
                    }}
                    disabled={!canEdit}
                    className="w-full border rounded-xl px-3 py-2 mt-1 bg-white"
                  >
                    <option value="mom">Mamá</option>
                    <option value="dad">Papá</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <Label>Email Parent 2</Label>
                  <Input
                    type="email"
                    value={parent2Email}
                    onChange={(e) => setParent2Email(e.target.value)}
                    disabled={!canEdit}
                    placeholder="email@ejemplo.com"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="mt-4">
                <ParentColorPicker
                  label="Color Parent 2"
                  value={parent2Color}
                  onChange={setParent2Color}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5 mb-6">
          <h2 className="font-bold text-sm uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Invitar / Conectar otra persona
          </h2>

          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              type="email"
              placeholder="email@ejemplo.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              disabled={!canEdit}
            />

            <Button
              type="button"
              disabled={!canEdit || !inviteEmail.trim() || saving}
              onClick={handleSaveInviteEmail}
              className="gap-2"
            >
              <UserPlus className="w-5 h-5" />
              Agregar
            </Button>
          </div>

          <p className="text-sm text-slate-500 mt-3">
            Por ahora esto agrega el email como miembro autorizado de la
            familia. La otra persona debe crear cuenta con ese mismo email para
            que la app pueda mostrarle esta familia. Más adelante podemos
            convertirlo en invitación real por email con Firebase Functions.
          </p>
        </Card>

        {canEdit && (
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || !familyId || !isAdmin}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-6 font-semibold flex items-center justify-center gap-2 mb-3"
          >
            <Save className="w-5 h-5" />
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        )}

        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full border-red-300 text-red-500 hover:text-red-600 rounded-xl py-6 font-semibold flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
