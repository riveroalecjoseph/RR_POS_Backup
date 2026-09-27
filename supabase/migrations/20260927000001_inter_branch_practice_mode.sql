-- =====================================================================
-- Migration: 20260927000001_inter_branch_practice_mode.sql
-- Description: Enables Cloud-Flagged Inter-Branch Practice Mode (Approach A)
--              with strict boundary guardrails, isolated sandbox stock,
--              real-time synchronization across terminals, and admin purge.
-- =====================================================================

-- 1. Add is_practice_mode flag to branches
alter table public.branches 
    add column if not exists is_practice_mode boolean not null default false;

-- 2. Add is_practice_mode flag to transfers with indexing
alter table public.transfers 
    add column if not exists is_practice_mode boolean not null default false;

create index if not exists idx_transfers_practice_mode 
    on public.transfers(is_practice_mode);

-- 3. Add is_practice_mode flag to stock_movements with indexing
alter table public.stock_movements 
    add column if not exists is_practice_mode boolean not null default false;

create index if not exists idx_stock_movements_practice_mode 
    on public.stock_movements(is_practice_mode);

-- 4. Create dedicated practice_branch_stock table to isolate sandbox inventory
create table if not exists public.practice_branch_stock (
    id uuid primary key default uuid_generate_v4(),
    branch_id uuid not null references public.branches(id) on delete cascade,
    product_id uuid not null references public.products(id) on delete cascade,
    quantity integer not null default 0 check (quantity >= 0),
    low_stock_threshold integer not null default 10 check (low_stock_threshold >= 0),
    updated_at timestamptz default now(),
    constraint uq_practice_branch_product unique (branch_id, product_id)
);

-- Enable RLS on practice_branch_stock
alter table public.practice_branch_stock enable row level security;

create index if not exists idx_practice_branch_stock_branch 
    on public.practice_branch_stock(branch_id);
create index if not exists idx_practice_branch_stock_product 
    on public.practice_branch_stock(product_id);

-- RLS Policies for practice_branch_stock
create policy "practice_branch_stock_select" on public.practice_branch_stock
    for select to authenticated
    using (
        public.current_user_role() in ('super_admin', 'inventory_manager', 'cashier')
        and (branch_id = public.current_user_branch_id() or public.current_user_role() = 'super_admin')
    );

create policy "practice_branch_stock_insert" on public.practice_branch_stock
    for insert to authenticated
    with check (
        public.current_user_role() in ('super_admin', 'inventory_manager')
        and (branch_id = public.current_user_branch_id() or public.current_user_role() = 'super_admin')
    );

create policy "practice_branch_stock_update" on public.practice_branch_stock
    for update to authenticated
    using (
        public.current_user_role() in ('super_admin', 'inventory_manager')
        and (branch_id = public.current_user_branch_id() or public.current_user_role() = 'super_admin')
    )
    with check (
        public.current_user_role() in ('super_admin', 'inventory_manager')
        and (branch_id = public.current_user_branch_id() or public.current_user_role() = 'super_admin')
    );

create policy "practice_branch_stock_delete" on public.practice_branch_stock
    for delete to authenticated
    using (
        public.current_user_role() in ('super_admin', 'inventory_manager')
        and (branch_id = public.current_user_branch_id() or public.current_user_role() = 'super_admin')
    );

-- 5. Strict Database Boundary Guardrail Trigger:
-- Refuses transfers between Practice branches and Live branches
create or replace function public.check_transfer_practice_mode_boundary()
returns trigger
language plpgsql
as $$
declare
    source_is_practice boolean;
    target_is_practice boolean;
begin
    select coalesce(is_practice_mode, false) into source_is_practice 
    from public.branches where id = NEW.source_branch_id;

    select coalesce(is_practice_mode, false) into target_is_practice 
    from public.branches where id = NEW.target_branch_id;

    if source_is_practice is distinct from target_is_practice then
        raise exception 'Guardrail violation: Cannot transfer stock between a Practice Mode branch and a Live Production branch. Both branches must operate in the same mode.';
    end if;

    -- Automatically ensure NEW.is_practice_mode aligns with branch status
    if source_is_practice = true then
        NEW.is_practice_mode := true;
    else
        NEW.is_practice_mode := false;
    end if;

    return NEW;
end;
$$;

drop trigger if exists trg_transfer_practice_boundary on public.transfers;
create trigger trg_transfer_practice_boundary
    before insert or update on public.transfers
    for each row execute function public.check_transfer_practice_mode_boundary();

-- 6. Super Admin Purge Function for Sandbox Data
create or replace function public.purge_practice_sandbox_data(target_branch_id uuid default null)
returns jsonb
language plpgsql
security invoker
as $$
declare
    purged_transfers integer := 0;
    purged_movements integer := 0;
    purged_stock integer := 0;
begin
    -- Ensure only super_admin can run purge
    if public.current_user_role() <> 'super_admin' then
        raise exception 'Only Super Admins can purge practice sandbox data';
    end if;

    if target_branch_id is null then
        -- Purge across all branches
        delete from public.transfers where is_practice_mode = true;
        get diagnostics purged_transfers = row_count;

        delete from public.stock_movements where is_practice_mode = true;
        get diagnostics purged_movements = row_count;

        delete from public.practice_branch_stock;
        get diagnostics purged_stock = row_count;
    else
        -- Purge for specific branch
        delete from public.transfers 
        where is_practice_mode = true 
          and (source_branch_id = target_branch_id or target_branch_id = target_branch_id);
        get diagnostics purged_transfers = row_count;

        delete from public.stock_movements 
        where is_practice_mode = true and branch_id = target_branch_id;
        get diagnostics purged_movements = row_count;

        delete from public.practice_branch_stock 
        where branch_id = target_branch_id;
        get diagnostics purged_stock = row_count;
    end if;

    return jsonb_build_object(
        'purged_transfers', purged_transfers,
        'purged_movements', purged_movements,
        'purged_stock', purged_stock
    );
end;
$$;
