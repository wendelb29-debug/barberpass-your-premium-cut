import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Logo } from "@/components/Logo";
import {
  ArrowLeftRight, Bot, Check, LogOut, MessageSquare, Send, Tag, User2, Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  sendAgentMessage, setConversationMode, resolveConversation,
  transferConversation, markConversationRead,
} from "@/lib/conversations.functions";

export const Route = createFileRoute("/_authenticated/atendimento")({
  component: AtendimentoPage,
});

type Conversation = {
  id: string;
  phone: string;
  client_id: string | null;
  barber_id: string | null;
  mode: "bot" | "human";
  status: "open" | "resolved";
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  updated_at: string;
};

type Message = {
  id: string;
  conversation_id: string;
  body: string;
  sender_type: "client" | "bot" | "agent" | "system";
  sender_name: string | null;
  sent_at: string;
};

type Filter = "all" | "bot" | "human" | "urgent" | "resolved";

const TAG_COLORS: Record<string, string> = {
  Urgente: "bg-red-500/15 text-red-400 border-red-500/30",
  Aguardando: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  Remarcação: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  "Novo cliente": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Pagamento: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  Resolvido: "bg-green-500/15 text-green-400 border-green-500/30",
};
const DEFAULT_TAGS = Object.keys(TAG_COLORS);

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");
}

function timeShort(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function AtendimentoPage() {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const isAdmin = roles.includes("admin");
  const isBarber = roles.includes("barbeiro");
  const allowed = isAdmin || isBarber;
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed) navigate({ to: "/cliente" });
  }, [allowed, navigate]);

  // Load conversations
  const conversationsQuery = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Conversation[];
    },
    enabled: allowed,
  });

  // Realtime conversation list
  useEffect(() => {
    if (!allowed) return;
    const ch = supabase.channel("conv-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        qc.invalidateQueries({ queryKey: ["conversations"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as Message;
        qc.invalidateQueries({ queryKey: ["messages", m.conversation_id] });
        qc.invalidateQueries({ queryKey: ["conversations"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [allowed, qc]);

  // Tags map
  const tagsQuery = useQuery({
    queryKey: ["all-tags"],
    queryFn: async () => {
      const { data } = await supabase.from("conversation_tags").select("*");
      const map: Record<string, { id: string; tag: string; color: string }[]> = {};
      (data ?? []).forEach((t) => {
        (map[t.conversation_id] ??= []).push(t);
      });
      return map;
    },
    enabled: allowed,
  });

  const conversations = conversationsQuery.data ?? [];
  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      if (filter === "bot" && c.mode !== "bot") return false;
      if (filter === "human" && c.mode !== "human") return false;
      if (filter === "resolved" && c.status !== "resolved") return false;
      if (filter !== "resolved" && c.status === "resolved") return false;
      if (filter === "urgent") {
        const tags = tagsQuery.data?.[c.id] ?? [];
        if (!tags.some((t) => t.tag === "Urgente")) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const hay = `${c.phone} ${c.last_message ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [conversations, filter, search, tagsQuery.data]);

  useEffect(() => {
    if (!selectedId && filtered.length) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  if (!allowed) return null;

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex h-14 items-center justify-between border-b border-border/60 bg-background/70 px-4 backdrop-blur">
        <div className="flex items-center gap-4">
          <Link to="/"><Logo /></Link>
          <nav className="hidden items-center gap-1 md:flex">
            {isAdmin && <Link to="/admin" className="rounded-md px-3 py-1 text-sm text-muted-foreground hover:text-foreground">Admin</Link>}
            {(isBarber || isAdmin) && <Link to="/barbeiro" className="rounded-md px-3 py-1 text-sm text-muted-foreground hover:text-foreground">Agenda</Link>}
            <Link to="/atendimento" className="rounded-md bg-primary/10 px-3 py-1 text-sm text-primary">Atendimento</Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground md:inline">{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
            <LogOut size={16} />
          </Button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[320px_1fr] xl:grid-cols-[320px_1fr_340px]">
        <ConversationList
          items={filtered}
          tags={tagsQuery.data ?? {}}
          search={search} setSearch={setSearch}
          filter={filter} setFilter={setFilter}
          selectedId={selectedId} onSelect={setSelectedId}
        />
        {selected ? (
          <ChatPane key={selected.id} conversation={selected} tags={tagsQuery.data?.[selected.id] ?? []} />
        ) : (
          <EmptyChat />
        )}
        {selected && (
          <ClientPanel conversation={selected} tags={tagsQuery.data?.[selected.id] ?? []} />
        )}
      </div>
    </div>
  );
}

function EmptyChat() {
  return (
    <div className="flex flex-col items-center justify-center text-muted-foreground">
      <MessageSquare className="mb-3" size={48} />
      <p>Selecione uma conversa para começar</p>
    </div>
  );
}

function ConversationList({
  items, tags, search, setSearch, filter, setFilter, selectedId, onSelect,
}: {
  items: Conversation[];
  tags: Record<string, { id: string; tag: string; color: string }[]>;
  search: string; setSearch: (s: string) => void;
  filter: Filter; setFilter: (f: Filter) => void;
  selectedId: string | null; onSelect: (id: string) => void;
}) {
  // Resolve client names
  const ids = useMemo(() => items.map((i) => i.client_id).filter(Boolean) as string[], [items]);
  const namesQuery = useQuery({
    queryKey: ["client-names", ids.join(",")],
    queryFn: async () => {
      if (!ids.length) return {};
      const { data } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const map: Record<string, string> = {};
      (data ?? []).forEach((p) => { map[p.id] = p.full_name; });
      return map;
    },
  });

  return (
    <aside className="flex flex-col border-r border-border/60 bg-card/30">
      <div className="space-y-2 border-b border-border/60 p-3">
        <Input placeholder="Buscar nome ou número" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="flex flex-wrap gap-1">
          {(["all", "bot", "human", "urgent", "resolved"] as Filter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {f === "all" ? "Todas" : f === "bot" ? "Bot" : f === "human" ? "Humano" : f === "urgent" ? "Urgente" : "Resolvido"}
            </button>
          ))}
        </div>
      </div>
      <ScrollArea className="flex-1">
        {items.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground">Sem conversas</p>
        )}
        {items.map((c) => {
          const name = (c.client_id && namesQuery.data?.[c.client_id]) || c.phone;
          const ts = tags[c.id] ?? [];
          return (
            <button key={c.id} onClick={() => onSelect(c.id)}
              className={`flex w-full items-start gap-3 border-b border-border/40 px-3 py-3 text-left transition-colors hover:bg-muted/50 ${selectedId === c.id ? "bg-muted/60" : ""}`}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                {initials(name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{name}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{timeShort(c.last_message_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="truncate text-xs text-muted-foreground">{c.last_message ?? "—"}</p>
                  {c.unread_count > 0 && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge variant="outline" className={`text-[10px] ${c.mode === "human" ? "border-amber-500/40 text-amber-400" : "border-emerald-500/40 text-emerald-400"}`}>
                    {c.mode === "human" ? "Humano" : "Bot"}
                  </Badge>
                  {ts.slice(0, 2).map((t) => (
                    <span key={t.id} className={`rounded border px-1.5 text-[10px] ${TAG_COLORS[t.tag] ?? "bg-muted text-muted-foreground border-border"}`}>
                      {t.tag}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </ScrollArea>
    </aside>
  );
}

function ChatPane({ conversation, tags }: { conversation: Conversation; tags: { id: string; tag: string; color: string }[] }) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const sendFn = useServerFn(sendAgentMessage);
  const setModeFn = useServerFn(setConversationMode);
  const resolveFn = useServerFn(resolveConversation);
  const transferFn = useServerFn(transferConversation);
  const markReadFn = useServerFn(markConversationRead);

  const messagesQuery = useQuery({
    queryKey: ["messages", conversation.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages").select("*")
        .eq("conversation_id", conversation.id)
        .order("sent_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Message[];
    },
  });

  const clientQuery = useQuery({
    queryKey: ["conv-client", conversation.client_id],
    queryFn: async () => {
      if (!conversation.client_id) return null;
      const { data } = await supabase.from("profiles").select("id, full_name").eq("id", conversation.client_id).maybeSingle();
      return data;
    },
  });
  const clientName = clientQuery.data?.full_name || conversation.phone;

  // Quick replies
  const qrQuery = useQuery({
    queryKey: ["quick-replies"],
    queryFn: async () => {
      const { data } = await supabase.from("quick_replies").select("*").order("title");
      return data ?? [];
    },
  });

  // Mark as read on open
  useEffect(() => {
    if (conversation.unread_count > 0) {
      markReadFn({ data: { conversationId: conversation.id } }).catch(() => {});
    }
  }, [conversation.id, conversation.unread_count, markReadFn]);

  // Auto scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messagesQuery.data]);

  const handleSend = async () => {
    const text = body.trim();
    if (!text) return;
    setBody("");
    try {
      await sendFn({ data: { conversationId: conversation.id, body: text } });
      qc.invalidateQueries({ queryKey: ["messages", conversation.id] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar");
      setBody(text);
    }
  };

  return (
    <section className="flex min-w-0 flex-col bg-background">
      <header className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
            {initials(clientName)}
          </div>
          <div>
            <p className="text-sm font-medium">{clientName}</p>
            <p className="text-xs text-muted-foreground">{conversation.phone}</p>
          </div>
          <Badge variant="outline" className={conversation.mode === "human"
            ? "border-amber-500/40 text-amber-400" : "border-emerald-500/40 text-emerald-400"}>
            {conversation.mode === "human" ? "Humano" : "Bot"}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {conversation.mode === "human" ? (
            <Button size="sm" variant="outline" onClick={async () => {
              await setModeFn({ data: { conversationId: conversation.id, mode: "bot" } });
              qc.invalidateQueries({ queryKey: ["conversations"] });
            }}>
              <Bot size={14} /> Passar para Bot
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={async () => {
              await setModeFn({ data: { conversationId: conversation.id, mode: "human" } });
              qc.invalidateQueries({ queryKey: ["conversations"] });
            }}>
              <User2 size={14} /> Assumir
            </Button>
          )}
          <TransferDialog conversationId={conversation.id} onDone={() => qc.invalidateQueries({ queryKey: ["conversations"] })} transferFn={transferFn} />
          <TagDialog conversationId={conversation.id} existing={tags} onDone={() => qc.invalidateQueries({ queryKey: ["all-tags"] })} />
          <Button size="sm" variant="outline" onClick={async () => {
            await resolveFn({ data: { conversationId: conversation.id } });
            qc.invalidateQueries({ queryKey: ["conversations"] });
          }}>
            <Check size={14} /> Resolver
          </Button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-gradient-dark px-4 py-4">
        {(messagesQuery.data ?? []).map((m) => <MessageBubble key={m.id} m={m} />)}
        {(messagesQuery.data?.length ?? 0) === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma mensagem ainda</p>
        )}
      </div>

      <div className="border-t border-border/60 bg-card/40 p-3">
        {qrQuery.data && qrQuery.data.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {qrQuery.data.slice(0, 6).map((q) => (
              <button key={q.id} onClick={() => setBody(q.body)}
                className="flex items-center gap-1 rounded-full border border-border/60 bg-muted px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
                <Zap size={12} /> {q.title}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escreva uma mensagem..."
            rows={2} className="resize-none"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
          <Button onClick={handleSend} disabled={!body.trim()}>
            <Send size={16} />
          </Button>
        </div>
      </div>
    </section>
  );
}

function MessageBubble({ m }: { m: Message }) {
  if (m.sender_type === "system") {
    return (
      <div className="flex justify-center">
        <span className="rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">{m.body}</span>
      </div>
    );
  }
  const isClient = m.sender_type === "client";
  const isBot = m.sender_type === "bot";
  const align = isClient ? "justify-start" : "justify-end";
  const bubble = isClient
    ? "bg-muted text-foreground"
    : isBot
      ? "bg-emerald-600/20 text-emerald-100 border border-emerald-600/30"
      : "bg-primary text-primary-foreground";
  return (
    <div className={`flex ${align}`}>
      <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${bubble}`}>
        <p className="mb-1 text-[10px] opacity-70">{m.sender_name ?? (isClient ? "Cliente" : isBot ? "Bot" : "Atendente")}</p>
        <p className="whitespace-pre-wrap break-words">{m.body}</p>
        <p className="mt-1 text-right text-[10px] opacity-60">
          {new Date(m.sent_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

function TransferDialog({ conversationId, onDone, transferFn }: {
  conversationId: string; onDone: () => void;
  transferFn: (args: { data: { conversationId: string; barberId: string } }) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [barberId, setBarberId] = useState<string>("");
  const barbersQuery = useQuery({
    queryKey: ["active-barbers"], enabled: open,
    queryFn: async () => {
      const { data } = await supabase.from("barbers").select("id, full_name").eq("active", true).order("full_name");
      return data ?? [];
    },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><ArrowLeftRight size={14} /> Transferir</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Transferir conversa</DialogTitle></DialogHeader>
        <Select value={barberId} onValueChange={setBarberId}>
          <SelectTrigger><SelectValue placeholder="Escolha um barbeiro" /></SelectTrigger>
          <SelectContent>
            {(barbersQuery.data ?? []).map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button disabled={!barberId} onClick={async () => {
          await transferFn({ data: { conversationId, barberId } });
          toast.success("Conversa transferida");
          setOpen(false); onDone();
        }}>Confirmar</Button>
      </DialogContent>
    </Dialog>
  );
}

function TagDialog({ conversationId, existing, onDone }: {
  conversationId: string;
  existing: { id: string; tag: string; color: string }[];
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");

  const addTag = async (tag: string) => {
    const color = TAG_COLORS[tag] ? tag : "Custom";
    await supabase.from("conversation_tags").insert({ conversation_id: conversationId, tag, color });
    onDone();
  };
  const removeTag = async (id: string) => {
    await supabase.from("conversation_tags").delete().eq("id", id);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Tag size={14} /> Etiqueta</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Etiquetas</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Aplicadas</p>
            <div className="flex flex-wrap gap-1">
              {existing.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma</p>}
              {existing.map((t) => (
                <button key={t.id} onClick={() => removeTag(t.id)}
                  className={`rounded border px-2 py-0.5 text-xs ${TAG_COLORS[t.tag] ?? "bg-muted text-muted-foreground border-border"}`}>
                  {t.tag} ✕
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Disponíveis</p>
            <div className="flex flex-wrap gap-1">
              {DEFAULT_TAGS.map((t) => (
                <button key={t} onClick={() => addTag(t)}
                  className={`rounded border px-2 py-0.5 text-xs ${TAG_COLORS[t]}`}>
                  + {t}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Etiqueta personalizada" />
            <Button onClick={() => { if (custom.trim()) { addTag(custom.trim()); setCustom(""); } }}>Adicionar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ClientPanel({ conversation, tags }: {
  conversation: Conversation;
  tags: { id: string; tag: string; color: string }[];
}) {
  const profileQuery = useQuery({
    queryKey: ["client-profile", conversation.client_id],
    queryFn: async () => {
      if (!conversation.client_id) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", conversation.client_id).maybeSingle();
      return data;
    },
  });

  const subQuery = useQuery({
    queryKey: ["client-sub", conversation.client_id],
    queryFn: async () => {
      if (!conversation.client_id) return null;
      const { data } = await supabase.from("subscriptions")
        .select("*, plans(name)")
        .eq("user_id", conversation.client_id)
        .order("started_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const apptsQuery = useQuery({
    queryKey: ["client-appts", conversation.client_id],
    queryFn: async () => {
      if (!conversation.client_id) return [];
      const { data } = await supabase.from("appointments")
        .select("id, scheduled_at, service_type, status, barber_id, barbers(full_name)")
        .eq("user_id", conversation.client_id)
        .order("scheduled_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  const next = (apptsQuery.data ?? []).find((a) => new Date(a.scheduled_at) >= new Date() && a.status !== "cancelled");
  const monthCount = (apptsQuery.data ?? []).filter((a) => {
    const d = new Date(a.scheduled_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && a.status !== "cancelled";
  }).length;

  const name = profileQuery.data?.full_name || conversation.phone;
  const phone = profileQuery.data?.phone || conversation.phone;
  const sub = subQuery.data;
  const subStatus = sub?.status ?? "Sem plano";
  const subBadgeClass = sub?.status === "ACTIVE"
    ? "border-emerald-500/40 text-emerald-400"
    : sub?.status === "OVERDUE" ? "border-red-500/40 text-red-400"
    : "border-muted-foreground/40 text-muted-foreground";

  return (
    <aside className="hidden flex-col border-l border-border/60 bg-card/30 xl:flex">
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-lg font-semibold text-primary">
              {initials(name)}
            </div>
            <p className="mt-2 font-medium">{name}</p>
            <p className="text-xs text-muted-foreground">{phone}</p>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap justify-center gap-1">
                {tags.map((t) => (
                  <span key={t.id} className={`rounded border px-1.5 text-[10px] ${TAG_COLORS[t.tag] ?? "bg-muted text-muted-foreground border-border"}`}>
                    {t.tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border/60 bg-background p-3">
            <p className="text-xs text-muted-foreground">Plano</p>
            <div className="mt-1 flex items-center justify-between">
              <p className="text-sm font-medium">{(sub?.plans as { name: string } | null)?.name ?? "—"}</p>
              <Badge variant="outline" className={subBadgeClass}>{subStatus}</Badge>
            </div>
            {sub?.next_due_date && (
              <p className="mt-1 text-xs text-muted-foreground">Próx. vencimento: {new Date(sub.next_due_date).toLocaleDateString("pt-BR")}</p>
            )}
          </div>

          <div className="rounded-lg border border-border/60 bg-background p-3">
            <p className="text-xs text-muted-foreground">Próximo agendamento</p>
            {next ? (
              <>
                <p className="mt-1 text-sm font-medium">
                  {new Date(next.scheduled_at).toLocaleDateString("pt-BR")} às{" "}
                  {new Date(next.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(next.barbers as { full_name: string } | null)?.full_name ?? "—"} · {next.service_type}
                </p>
              </>
            ) : <p className="mt-1 text-sm text-muted-foreground">Nenhum</p>}
          </div>

          <div className="rounded-lg border border-border/60 bg-background p-3">
            <p className="text-xs text-muted-foreground">Cortes este mês</p>
            <p className="mt-1 text-2xl font-semibold text-primary">{monthCount}</p>
          </div>

          <div>
            <p className="mb-2 text-xs text-muted-foreground">Histórico</p>
            <div className="space-y-1">
              {(apptsQuery.data ?? []).slice(0, 8).map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded border border-border/40 bg-background px-2 py-1.5 text-xs">
                  <span>{new Date(a.scheduled_at).toLocaleDateString("pt-BR")} · {a.service_type}</span>
                  <span className="text-muted-foreground">{a.status}</span>
                </div>
              ))}
              {(apptsQuery.data?.length ?? 0) === 0 && <p className="text-xs text-muted-foreground">Sem histórico</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Link to="/cliente/agendar" className="block">
              <Button variant="outline" className="w-full">Criar agendamento</Button>
            </Link>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
