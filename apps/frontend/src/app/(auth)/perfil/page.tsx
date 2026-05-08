import { redirect } from "next/navigation";
import { getProfile } from "@/domains/user/user.actions";
import ProfileForm from "./ProfileForm";

export default async function PerfilPage() {
  const user = await getProfile();

  if (!user) redirect("/login");

  return (
    <div className="page-container-sm">
      <div className="page-header">
        <div>
          <h1 className="page-title">Meu Perfil</h1>
          <p className="page-subtitle">{user.email}</p>
        </div>
      </div>

      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "2rem",
        }}
      >
        <ProfileForm user={user} />
      </div>
    </div>
  );
}
