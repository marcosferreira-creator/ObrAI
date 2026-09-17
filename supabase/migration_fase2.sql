-- ObrAI — Fase 2: captura por foto (IA) e XML
-- Rode este arquivo no SQL Editor do Supabase DEPOIS do schema.sql.

-- Bucket de storage onde ficam as fotos das notas e os XMLs enviados.
insert into storage.buckets (id, name, public)
values ('notas', 'notas', true)
on conflict (id) do nothing;

create policy "authenticated_read_notas" on storage.objects
  for select using (bucket_id = 'notas' and auth.role() = 'authenticated');

create policy "authenticated_upload_notas" on storage.objects
  for insert with check (bucket_id = 'notas' and auth.role() = 'authenticated');

create policy "authenticated_update_notas" on storage.objects
  for update using (bucket_id = 'notas' and auth.role() = 'authenticated');

-- A lista original de tipos em `anexos` não incluía 'xml' — adiciona agora.
alter table anexos drop constraint if exists anexos_tipo_check;
alter table anexos add constraint anexos_tipo_check
  check (tipo in ('nota','recibo','pix','boleto','orcamento','foto','pdf','xml'));
