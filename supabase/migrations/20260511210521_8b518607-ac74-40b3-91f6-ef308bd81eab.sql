
-- conversations
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  client_id uuid references public.profiles(id) on delete set null,
  barber_id uuid references public.barbers(id) on delete set null,
  mode text not null default 'bot', -- 'bot' | 'human'
  status text not null default 'open', -- 'open' | 'resolved'
  last_message text,
  last_message_at timestamptz,
  unread_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_conversations_updated on public.conversations (updated_at desc);
create index idx_conversations_status on public.conversations (status);
create index idx_conversations_barber on public.conversations (barber_id);

alter table public.conversations enable row level security;

create policy "conv admin all" on public.conversations
  for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "conv barber read" on public.conversations
  for select using (
    public.has_role(auth.uid(),'admin')
    or exists (select 1 from public.barbers b where b.id = conversations.barber_id and b.user_id = auth.uid())
    or exists (select 1 from public.appointments a join public.barbers b on b.id = a.barber_id
      where a.user_id = conversations.client_id and b.user_id = auth.uid())
  );

create policy "conv barber update" on public.conversations
  for update using (
    public.has_role(auth.uid(),'admin')
    or exists (select 1 from public.barbers b where b.id = conversations.barber_id and b.user_id = auth.uid())
  );

-- messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  body text not null,
  sender_type text not null, -- 'client' | 'bot' | 'agent' | 'system'
  sender_id uuid, -- auth user id when agent
  sender_name text,
  attachment_url text,
  sent_at timestamptz not null default now()
);

create index idx_messages_conv on public.messages (conversation_id, sent_at);

alter table public.messages enable row level security;

create policy "msg read via conv" on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (
          public.has_role(auth.uid(),'admin')
          or exists (select 1 from public.barbers b where b.id = c.barber_id and b.user_id = auth.uid())
          or exists (select 1 from public.appointments a join public.barbers b on b.id = a.barber_id
            where a.user_id = c.client_id and b.user_id = auth.uid())
        )
    )
  );

create policy "msg insert agent" on public.messages
  for insert with check (
    sender_type in ('agent','system')
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (
          public.has_role(auth.uid(),'admin')
          or exists (select 1 from public.barbers b where b.id = c.barber_id and b.user_id = auth.uid())
        )
    )
  );

-- conversation_tags
create table public.conversation_tags (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  tag text not null,
  color text not null default 'gray',
  created_at timestamptz not null default now()
);

create index idx_conv_tags_conv on public.conversation_tags (conversation_id);

alter table public.conversation_tags enable row level security;

create policy "tags read" on public.conversation_tags
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_tags.conversation_id
        and (
          public.has_role(auth.uid(),'admin')
          or exists (select 1 from public.barbers b where b.id = c.barber_id and b.user_id = auth.uid())
        )
    )
  );

create policy "tags write" on public.conversation_tags
  for all using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_tags.conversation_id
        and (
          public.has_role(auth.uid(),'admin')
          or exists (select 1 from public.barbers b where b.id = c.barber_id and b.user_id = auth.uid())
        )
    )
  ) with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_tags.conversation_id
        and (
          public.has_role(auth.uid(),'admin')
          or exists (select 1 from public.barbers b where b.id = c.barber_id and b.user_id = auth.uid())
        )
    )
  );

-- quick_replies
create table public.quick_replies (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid references public.barbers(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.quick_replies enable row level security;

create policy "qr read" on public.quick_replies
  for select using (
    public.has_role(auth.uid(),'admin')
    or barber_id is null
    or exists (select 1 from public.barbers b where b.id = quick_replies.barber_id and b.user_id = auth.uid())
  );

create policy "qr admin write" on public.quick_replies
  for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "qr barber write" on public.quick_replies
  for insert with check (
    exists (select 1 from public.barbers b where b.id = quick_replies.barber_id and b.user_id = auth.uid())
  );

-- updated_at trigger for conversations
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger conv_touch before update on public.conversations
  for each row execute function public.touch_updated_at();

-- when a message is inserted, update conversation
create or replace function public.on_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
    set last_message = left(new.body, 200),
        last_message_at = new.sent_at,
        updated_at = now(),
        unread_count = case when new.sender_type = 'client'
          then unread_count + 1 else unread_count end
    where id = new.conversation_id;
  return new;
end;
$$;

create trigger msg_after_insert after insert on public.messages
  for each row execute function public.on_new_message();

-- realtime
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversation_tags;

-- seed default quick replies
insert into public.quick_replies (barber_id, title, body) values
  (null, 'Verificar horários', 'Olá! Vou verificar os horários disponíveis para você.'),
  (null, 'Remarcado', 'Seu agendamento foi remarcado com sucesso!'),
  (null, 'Sem horário hoje', 'Infelizmente não temos horários para hoje, mas posso verificar amanhã.'),
  (null, 'Telefone', 'Pode nos ligar no (XX) XXXXX-XXXX para mais informações.');
