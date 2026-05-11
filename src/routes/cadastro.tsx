import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/cadastro")({ component: SignupPage });

function SignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Senha precisa ter ao menos 6 caracteres"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/cliente`,
        data: { full_name: fullName, phone },
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Conta criada! Você já pode entrar.");
    navigate({ to: "/cliente" });
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between p-12 md:flex" style={{ backgroundColor: "oklch(0.12 0.005 60)" }}>
        <Logo />
        <div className="max-w-md">
          <p className="font-display text-[24px] leading-snug tracking-tight text-foreground/90">
            "Em menos de um minuto eu reservo meu horário. O BarberPass mudou minha rotina."
          </p>
          <p className="mt-4 text-[13px] text-muted-foreground">— Pedro Sá, cliente desde 2023</p>
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

      <div className="flex items-center justify-center bg-background px-6 py-10">
        <div className="w-full max-w-[380px]">
          <div className="mb-8 flex justify-center md:hidden"><Logo /></div>
          <h1 className="font-display text-[28px] font-semibold tracking-tight">Criar sua conta</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">Comece a usar o BarberPass em segundos.</p>
          <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
            <Field label="Nome completo">
              <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-10 surface-2" />
            </Field>
            <Field label="Telefone">
              <Input required value={phone} onChange={(e) => setPhone(e.target.value)} className="h-10 surface-2" placeholder="(11) 99999-9999" />
            </Field>
            <Field label="E-mail">
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 surface-2" />
            </Field>
            <Field label="Senha">
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-10 surface-2" />
            </Field>
            <Button type="submit" disabled={loading} className="mt-2 h-11 w-full rounded-[10px] bg-primary text-primary-foreground hover:bg-primary/90">
              {loading ? "Criando..." : "Criar conta"}
            </Button>
          </form>
          <p className="mt-6 text-center text-[13px] text-muted-foreground">
            Já tem conta? <Link to="/login" className="text-primary hover:underline">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[13px] font-medium">{label}</Label>
      {children}
    </div>
  );
}
