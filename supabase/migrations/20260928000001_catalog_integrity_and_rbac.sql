-- =====================================================================
-- Migration: 20260928000001_catalog_integrity_and_rbac.sql
-- Description:
-- 1. Adds display_order to public.categories for custom sorting.
-- 2. Updates stock_movements movement_type check constraint to support
--    INITIAL_STOCK, TRANSFER_OUT, TRANSFER_IN.
-- 3. Updates profiles role check to support branch_manager.
-- 4. Updates RLS policies to allow branch_manager full manager access.
-- =====================================================================

-- 1. Add display_order column to categories
alter table public.categories
    add column if not exists display_order integer not null default 0;

-- 2. Upgrade movement_type constraint on stock_movements
alter table public.stock_movements
    drop constraint if exists stock_movements_movement_type_check;

alter table public.stock_movements
    add constraint stock_movements_movement_type_check
    check (movement_type in (
        'Sale',
        'Restock',
        'Waste/Spoilage',
        'Inter-Branch Transfer',
        'Gift/Promo',
        'TRANSFER_OUT',
        'TRANSFER_IN',
        'INITIAL_STOCK'
    ));

-- 3. Upgrade role check constraint on profiles
alter table public.profiles
    drop constraint if exists profiles_role_check;

alter table public.profiles
    add constraint profiles_role_check
    check (role in ('cashier', 'branch_manager', 'inventory_manager', 'super_admin'));

-- 4. Upgrade RLS policies to include branch_manager
drop policy if exists "categories_admin_modify" on public.categories;
create policy "categories_admin_modify" on public.categories
    for all to authenticated
    using (public.current_user_role() in ('super_admin', 'branch_manager', 'inventory_manager'))
    with check (public.current_user_role() in ('super_admin', 'branch_manager', 'inventory_manager'));

drop policy if exists "products_admin_modify" on public.products;
create policy "products_admin_modify" on public.products
    for all to authenticated
    using (public.current_user_role() in ('super_admin', 'branch_manager', 'inventory_manager'))
    with check (public.current_user_role() in ('super_admin', 'branch_manager', 'inventory_manager'));

drop policy if exists "branch_stock_update" on public.branch_stock;
create policy "branch_stock_update" on public.branch_stock
    for update to authenticated
    using (
        public.current_user_role() = 'super_admin'
        or (public.current_user_role() in ('branch_manager', 'inventory_manager') and branch_id = public.current_user_branch_id())
    )
    with check (
        public.current_user_role() = 'super_admin'
        or (public.current_user_role() in ('branch_manager', 'inventory_manager') and branch_id = public.current_user_branch_id())
    );

drop policy if exists "stock_movements_insert" on public.stock_movements;
create policy "stock_movements_insert" on public.stock_movements
    for insert to authenticated
    with check (
        public.current_user_role() in ('super_admin', 'branch_manager', 'inventory_manager', 'cashier')
        and (branch_id = public.current_user_branch_id() or public.current_user_role() = 'super_admin')
    );

drop policy if exists "transfers_insert" on public.transfers;
create policy "transfers_insert" on public.transfers
    for insert to authenticated
    with check (
        public.current_user_role() in ('super_admin', 'branch_manager', 'inventory_manager')
        and (source_branch_id = public.current_user_branch_id() or public.current_user_role() = 'super_admin')
    );

drop policy if exists "transfer_items_modify" on public.transfer_items;
create policy "transfer_items_modify" on public.transfer_items
    for all to authenticated
    using (
        public.current_user_role() in ('super_admin', 'branch_manager', 'inventory_manager')
    )
    with check (
        public.current_user_role() in ('super_admin', 'branch_manager', 'inventory_manager')
    );
