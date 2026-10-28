import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, Logo } from "@/components/ui";
import { currentStaff } from "@/server/auth/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Ingreso al panel", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await currentStaff()) redirect("/admin");
  return (
    <div className="flex min-h-screen items-center justify-center bg-sand px-4">
      <Card className="w-full max-w-sm p-8">
        <div className="flex justify-center">
          <Logo size={220} />
        </div>
        <h1 className="mt-4 text-center text-xl font-semibold">Panel de la agencia</h1>
        <LoginForm />
      </Card>
    </div>
  );
}
