import { redirect } from "next/navigation";
import { authApi } from "@/lib/api";
import { Commerce } from "@/types";
import EnterQueueView from "./EnterQueueView";

type Mode = "search" | "qrcode" | "magic-link";

type Props = {
  searchParams: Promise<{ commerceId?: string; token?: string; mode?: Mode }>;
};

export default async function EnterQueuePage({ searchParams }: Props) {
  const { commerceId, token, mode } = await searchParams;

  if (!commerceId) {
    redirect("/procurar-fila");
  }

  if ((mode === "qrcode" || mode === "magic-link") && !token) {
    redirect("/procurar-fila");
  }

  const res = await authApi(`/commerce/${commerceId}`);
  if (!res.ok) redirect("/procurar-fila");

  const commerce = (await res.json()) as Commerce;

  return (
    <div className="page-container-sm">
      <EnterQueueView commerce={commerce} token={token} mode={mode} />
    </div>
  );
}
