import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/barbeiros")({ component: AdminBarbers });

function AdminBarbers() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [userId, setUserId] = useState("");

  const { data } = useQuery({
    queryKey: ["barbers-admin"],
    queryFn: async () => (await supabase.from("barbers").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const create = async () => {
    if (!name) { toast.error("Nome obrigatório"); return; }
    const payload: any = { full_name: name, bio };
    if (userId) {
      payload.user_id = userId;
    }
    const { error } = await supabase.from("barbers").insert(payload);
    if (error) { toast.error(error.message); return; }
    if (userId) {
      await supabase.from("user_roles").insert({ user_id: userId, role: "barbeiro" });
    }
    setName(""); setBio(""); setUserId("");
    qc.invalidateQueries({ queryKey: ["barbers-admin"] });
    toast.success("Barbeiro criado!");
  };

  const toggle = async (id: string, active: boolean) => {
    await supabase.from("barbers").update({ active: !active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["barbers-admin"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Barbeiros</h1>
        <p className="text-muted-foreground">Gestão da equipe.</p>
      </div>

      <Card className="space-y-3 p-6">
        <h3>Novo barbeiro</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <Input placeholder="Nome completo" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Bio (opcional)" value={bio} onChange={(e) => setBio(e.target.value)} />
          <Input placeholder="UUID do usuário (opcional)" value={userId} onChange={(e) => setUserId(e.target.value)} />
        </div>
        <p className="text-xs text-muted-foreground">
          Para vincular a uma conta de login, peça que o usuário se cadastre primeiro e cole aqui o ID dele
          (encontrado em Cloud → Users).
        </p>
        <Button onClick={create} className="bg-gradient-gold text-primary-foreground">Cadastrar</Button>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border"><tr className="text-left">
            <th className="px-4 py-3">Nome</th><th className="px-4 py-3">Bio</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th>
          </tr></thead>
          <tbody>
            {data?.map((b) => (
              <tr key={b.id} className="border-b border-border/50">
                <td className="px-4 py-3 font-medium">{b.full_name}</td>
                <td className="px-4 py-3 text-muted-foreground">{b.bio || "—"}</td>
                <td className="px-4 py-3"><Badge variant={b.active ? "default" : "outline"}>{b.active ? "Ativo" : "Inativo"}</Badge></td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="outline" onClick={() => toggle(b.id, b.active)}>
                    {b.active ? "Desativar" : "Ativar"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
