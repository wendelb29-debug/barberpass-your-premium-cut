import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Tag } from "@/components/StatusBadge";
import { InitialsAvatar } from "@/components/Avatar";
import { DataTable, TH, THead, TBody, TR, TD, EmptyRow } from "@/components/DataTable";

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
    if (userId) payload.user_id = userId;
    const { error } = await supabase.from("barbers").insert(payload);
    if (error) { toast.error(error.message); return; }
    if (userId) await supabase.from("user_roles").insert({ user_id: userId, role: "barbeiro" });
    setName(""); setBio(""); setUserId("");
    qc.invalidateQueries({ queryKey: ["barbers-admin"] });
    toast.success("Barbeiro cadastrado");
  };

  const toggle = async (id: string, active: boolean) => {
    await supabase.from("barbers").update({ active: !active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["barbers-admin"] });
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Barbeiros" subtitle="Gestão da equipe." />

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-[15px] font-medium">Novo barbeiro</h3>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Para vincular a uma conta de login, peça que o usuário se cadastre e cole aqui o ID dele.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px] font-medium">Nome completo</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10 surface-2" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px] font-medium">Bio (opcional)</Label>
            <Input value={bio} onChange={(e) => setBio(e.target.value)} className="h-10 surface-2" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px] font-medium">ID do usuário (opcional)</Label>
            <Input value={userId} onChange={(e) => setUserId(e.target.value)} className="h-10 surface-2" placeholder="UUID" />
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={create} className="h-10 rounded-[10px] bg-primary px-5 text-primary-foreground hover:bg-primary/90">
            Cadastrar
          </Button>
        </div>
      </div>

      <DataTable>
        <THead>
          <TH>Nome</TH>
          <TH>Bio</TH>
          <TH>Status</TH>
          <TH className="text-right">Ações</TH>
        </THead>
        <TBody>
          {!data?.length && <EmptyRow colSpan={4}>Nenhum barbeiro cadastrado.</EmptyRow>}
          {data?.map((b) => (
            <TR key={b.id}>
              <TD>
                <div className="flex items-center gap-2.5">
                  <InitialsAvatar name={b.full_name} />
                  <span className="font-medium">{b.full_name}</span>
                </div>
              </TD>
              <TD className="text-muted-foreground">{b.bio || "—"}</TD>
              <TD>
                <Tag tone={b.active ? "success" : "neutral"}>{b.active ? "Ativo" : "Inativo"}</Tag>
              </TD>
              <TD className="text-right">
                <button
                  onClick={() => toggle(b.id, b.active)}
                  className="text-[12px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {b.active ? "Desativar" : "Ativar"}
                </button>
              </TD>
            </TR>
          ))}
        </TBody>
      </DataTable>
    </div>
  );
}
