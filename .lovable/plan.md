# BarberPass — Plano de implementação

Sistema completo de assinatura para barbearia, tema escuro com destaque dourado (#D4AF37).

## Stack adaptada ao template

- **TanStack Start + React + TypeScript** (já configurado no template — substitui React Router DOM, com mesmas capacidades de roteamento por arquivos e proteção de rotas)
- **Tailwind CSS v4** + shadcn/ui (já instalado)
- **Lovable Cloud** (Supabase gerenciado: auth, DB, realtime, server functions) — habilitarei agora
- **TanStack Query** (já instalado, equivalente a React Query)
- **Asaas** para pagamentos recorrentes via server functions + webhook público

## Design system

- Tema escuro como padrão (`.dark` aplicado no root)
- Tokens em `oklch` em `src/styles.css`:
  - `--background`: preto (#0A0A0A)
  - `--card`: carvão (#161616)
  - `--primary`: dourado (#D4AF37)
  - `--primary-foreground`: preto
  - `--border`: carvão claro
- Tipografia: Inter (clean, moderna)
- Variantes premium para Button/Card

## Banco de dados (Lovable Cloud)

Tabelas com RLS:
- `profiles` (id → auth.users, full_name, phone, asaas_customer_id)
- `user_roles` (user_id, role: 'cliente' | 'barbeiro' | 'admin') + função `has_role()` SECURITY DEFINER
- `plans` (id, name, price_cents, billing_cycle, benefits[], haircut_limit, beard_limit, unlimited)
- `subscriptions` (id, user_id, plan_id, asaas_subscription_id, status, next_due_date, started_at)
- `barbers` (id, user_id, full_name, active, specialties[])
- `availability_slots` (barber_id, weekday, start_time, end_time)
- `appointments` (id, user_id, barber_id, plan_id, scheduled_at, service_type, status, completed_at)
- `payments` (id, subscription_id, asaas_payment_id, status, value_cents, due_date, paid_at)
- Seed: 3 planos (Básico R$69, Premium R$119, VIP R$179)

## Rotas

Públicas:
- `/` — landing com hero + 3 planos + CTA
- `/login`, `/cadastro`

Cliente (`/_authenticated/cliente/*`):
- `/cliente` — Meu Plano (status, próximo vencimento, pagamento)
- `/cliente/agendar` — calendário com slots livres
- `/cliente/historico` — atendimentos passados
- `/cliente/planos` — upgrade/cancelamento

Barbeiro (`/_authenticated/barbeiro/*`):
- `/barbeiro` — agenda do dia, confirmar/remarcar/cancelar

Admin (`/_authenticated/admin/*`):
- `/admin` — dashboard (assinantes, MRR, agendamentos do dia)
- `/admin/clientes` — lista com filtros
- `/admin/barbeiros` — CRUD
- `/admin/relatorios` — export CSV

Proteção via `beforeLoad` checando role no contexto (router context com sessão Supabase + roles).

## Server functions e rotas

- `src/lib/asaas.server.ts` — cliente HTTP do Asaas (lê `ASAAS_API_KEY` do env)
- `src/lib/subscriptions.functions.ts` — `createAsaasCustomer`, `createSubscription`, `cancelSubscription`, `upgradePlan`
- `src/lib/appointments.functions.ts` — `bookSlot`, `listMySlots`, `confirmAppointment`
- `src/lib/admin.functions.ts` — métricas + CSV export
- `src/routes/api/public/asaas-webhook.ts` — recebe eventos `PAYMENT_*` e `SUBSCRIPTION_*`, valida via header `asaas-access-token`, atualiza `subscriptions` e `payments`

## Integração Asaas (sandbox por padrão)

- Ao cadastrar: cria cliente Asaas e salva `asaas_customer_id` no profile
- Ao assinar plano: cria subscription recorrente (PIX / CREDIT_CARD / BOLETO conforme escolha do cliente)
- Webhook atualiza status em tempo real → portal do cliente reflete via TanStack Query refetch
- Status mostrados: `ATIVA`, `INADIMPLENTE`, `CANCELADA`

Necessário do usuário (pedirei após confirmação):
- `ASAAS_API_KEY` (chave de API do Asaas — sandbox ou produção)
- `ASAAS_WEBHOOK_TOKEN` (token configurado no Asaas para validar webhooks)
- URL do webhook: `https://<seu-projeto>.lovable.app/api/public/asaas-webhook`

## Agendamento

- Limites por plano aplicados server-side em `bookSlot` (ex.: VIP ilimitado, Básico 1/mês)
- Slots gerados a partir de `availability_slots` do barbeiro menos `appointments` ocupados
- Realtime: canal Supabase em `appointments` para atualizar agenda do barbeiro ao vivo
- Notificação: toast + (futuro) e-mail via Resend (não escopo desta v1)

## Entregáveis nesta iteração

1. Habilitar Lovable Cloud + criar schema com RLS
2. Design system dourado/escuro + landing
3. Auth (cadastro/login) com criação automática de profile + role cliente
4. Planos + fluxo de assinatura ligado ao Asaas
5. Calendário de agendamento com regras por plano
6. Portal do cliente, painel do barbeiro e painel admin com métricas + CSV
7. Webhook Asaas

## O que NÃO entra nesta v1 (sugiro como próximos passos)

- Envio de e-mails / SMS de notificação (precisa Resend/Twilio)
- App nativo / PWA offline
- Pagamentos avulsos fora da assinatura
- Programa de fidelidade

---

Confirma que posso seguir com este plano? Em seguida vou pedir a `ASAAS_API_KEY` e o `ASAAS_WEBHOOK_TOKEN`.
