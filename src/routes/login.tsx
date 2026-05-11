import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Bem-vindo de volta!");
    navigate({ to: "/cliente" });
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <BrandPanel />
      <div className="flex items-center justify-center bg-background px-6 py-10">
        <div className="w-full max-w-[380px]">
          <div className="md:hidden mb-8 flex justify-center"><Logo /></div>
          <h1 className="font-display text-[28px] font-semibold tracking-tight">Entrar na sua conta</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">Acesse o painel do BarberPass.</p>
          <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
            <Field label="E-mail">
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 surface-2" />
            </Field>
            <Field label="Senha" right={<a href="#" className="text-[12px] text-muted-foreground hover:text-foreground">Esqueceu a senha?</a>}>
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-10 surface-2" />
            </Field>
            <Button type="submit" disabled={loading}
              className="mt-2 h-11 w-full rounded-[10px] bg-primary text-primary-foreground hover:bg-primary/90">
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          <p className="mt-6 text-center text-[13px] text-muted-foreground">
            Não tem conta? <Link to="/cadastro" className="text-primary hover:underline">Cadastre-se</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, right, children }: { label: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-[13px] font-medium">{label}</Label>
        {right}
      </div>
      {children}
    </div>
  );
}

function BrandPanel() {
  return (
    <div className="hidden flex-col justify-between p-12 md:flex" style={{ backgroundColor: "oklch(0.12 0.005 60)" }}>
      <Logo />
      <div className="max-w-md">
        <p className="font-display text-[24px] leading-snug tracking-tight text-foreground/90">
          “Desde que entrei no BarberPass, nunca mais perdi um corte. É como ter um clube exclusivo no bolso.”
        </p>
        <p className="mt-4 text-[13px] text-muted-foreground">— Lucas Ferreira, cliente desde 2024</p>
      </div>
      <div>
        <p className="label-eyebrow mb-3">Barbearias que confiam</p>
        <div className="flex items-center gap-6 text-[13px] text-muted-foreground/70">
          <span className="font-display text-[18px]">Velluto</span>
          <span className="font-display text-[18px]">Norte 47</span>
          <span className="font-display text-[18px]">Casa Lobo</span>
        </div>
      </div>
    </div>
  );
}
