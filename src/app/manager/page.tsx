import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/jwt";

export default async function ManagerIndexPage() {
  const session = cookies().get("session")?.value;
  const payload = session ? await decrypt(session) : null;

  if (payload) {
    redirect("/manager/selection");
  }

  // Rediriger vers login par défaut
  redirect("/manager/login");
}
