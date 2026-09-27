-- RR Multi-Branch POS & Inventory Management System Schema
-- Conforms strictly to Supabase security best practices:
-- 1. RLS enabled on all exposed public tables
-- 2. Uses `TO authenticated` with role/branch ownership predicates
-- 3. UPDATE policies require both USING and WITH CHECK
-- 4. User role & branch checked via auth.jwt() -> 'app_metadata'
-- 5. Views created WITH (security_invoker = true)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =====================================================================
-- 1. BRANCHES TABLE
-- =====================================================================
create table if not exists public.branches (
    id uuid primary key default uuid_generate_v4(),
    code varchar(20) not null unique,
    name varchar(100) not null,
    address text,
    phone varchar(30),
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- =====================================================================
-- 2. PROFILES TABLE (Mirrors auth.users with branch & role assignments)
-- =====================================================================
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null,
    full_name text not null,
    role text not null check (role in ('cashier', 'inventory_manager', 'super_admin')),
    branch_id uuid references public.branches(id) on delete set null,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- =====================================================================
-- 3. CATEGORIES TABLE
-- =====================================================================
create table if not exists public.categories (
    id uuid primary key default uuid_generate_v4(),
    name varchar(100) not null unique,
    slug varchar(100) not null unique,
    color varchar(20) default '#16a34a',
    created_at timestamptz default now()
);

-- =====================================================================
-- 4. PRODUCTS TABLE
-- =====================================================================
create table if not exists public.products (
    id uuid primary key default uuid_generate_v4(),
    sku varchar(50) not null unique,
    barcode varchar(50) unique,
    name varchar(150) not null,
    description text,
    category_id uuid references public.categories(id) on delete set null,
    price decimal(12, 2) not null check (price >= 0),
    cost_price decimal(12, 2) not null default 0 check (cost_price >= 0),
    image_url text,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- =====================================================================
-- 5. BRANCH STOCK TABLE (Current stock level per branch)
-- =====================================================================
create table if not exists public.branch_stock (
    id uuid primary key default uuid_generate_v4(),
    branch_id uuid not null references public.branches(id) on delete cascade,
    product_id uuid not null references public.products(id) on delete cascade,
    quantity integer not null default 0 check (quantity >= 0),
    low_stock_threshold integer not null default 10 check (low_stock_threshold >= 0),
    updated_at timestamptz default now(),
    constraint uq_branch_product unique (branch_id, product_id)
);

-- =====================================================================
-- 6. STOCK MOVEMENTS TABLE (Immutable audit trail)
-- =====================================================================
create table if not exists public.stock_movements (
    id uuid primary key default uuid_generate_v4(),
    branch_id uuid not null references public.branches(id) on delete cascade,
    product_id uuid not null references public.products(id) on delete cascade,
    movement_type text not null check (movement_type in ('Sale', 'Restock', 'Waste/Spoilage', 'Inter-Branch Transfer', 'Gift/Promo')),
    quantity_delta integer not null,
    balance_after integer not null check (balance_after >= 0),
    reference_id text,
    notes text,
    created_by uuid references auth.users(id),
    created_at timestamptz default now()
);

-- =====================================================================
-- 7. TRANSFERS TABLE (Handshake workflow)
-- =====================================================================
create table if not exists public.transfers (
    id uuid primary key default uuid_generate_v4(),
    transfer_number varchar(50) not null unique,
    source_branch_id uuid not null references public.branches(id),
    target_branch_id uuid not null references public.branches(id),
    status text not null default 'PENDING' check (status in ('PENDING', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED')),
    notes text,
    discrepancy_notes text,
    dispatched_by uuid references auth.users(id),
    received_by uuid references auth.users(id),
    dispatched_at timestamptz,
    received_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    constraint check_different_branches check (source_branch_id <> target_branch_id)
);

-- =====================================================================
-- 8. TRANSFER ITEMS TABLE
-- =====================================================================
create table if not exists public.transfer_items (
    id uuid primary key default uuid_generate_v4(),
    transfer_id uuid not null references public.transfers(id) on delete cascade,
    product_id uuid not null references public.products(id) on delete cascade,
    quantity_sent integer not null check (quantity_sent > 0),
    quantity_received integer default null check (quantity_received is null or quantity_received >= 0),
    notes text
);

-- =====================================================================
-- 9. TRANSACTIONS TABLE (POS Orders)
-- =====================================================================
create table if not exists public.transactions (
    id uuid primary key default uuid_generate_v4(),
    transaction_number varchar(60) not null unique,
    branch_id uuid not null references public.branches(id),
    cashier_id uuid references auth.users(id),
    subtotal decimal(12, 2) not null check (subtotal >= 0),
    tax_amount decimal(12, 2) not null default 0 check (tax_amount >= 0),
    discount_amount decimal(12, 2) not null default 0 check (discount_amount >= 0),
    grand_total decimal(12, 2) not null check (grand_total >= 0),
    payment_method text not null check (payment_method in ('cash', 'card', 'e_wallet')),
    amount_tendered decimal(12, 2) not null check (amount_tendered >= 0),
    change_amount decimal(12, 2) not null default 0 check (change_amount >= 0),
    idempotency_key text unique,
    status text not null default 'completed' check (status in ('completed', 'refunded', 'offline_synced')),
    created_at timestamptz default now()
);

-- =====================================================================
-- 10. TRANSACTION ITEMS TABLE
-- =====================================================================
create table if not exists public.transaction_items (
    id uuid primary key default uuid_generate_v4(),
    transaction_id uuid not null references public.transactions(id) on delete cascade,
    product_id uuid not null references public.products(id),
    product_name varchar(150) not null,
    unit_price decimal(12, 2) not null check (unit_price >= 0),
    quantity integer not null check (quantity > 0),
    subtotal decimal(12, 2) not null check (subtotal >= 0)
);

-- =====================================================================
-- 11. SECURITY INVOKER VIEWS (Monthly Trends & Branch Velocity)
-- =====================================================================
create or replace view public.v_monthly_product_trends
with (security_invoker = true)
as
with monthly_product_sales as (
    select
        t.branch_id,
        b.name as branch_name,
        date_trunc('month', t.created_at) as month_date,
        to_char(t.created_at, 'YYYY-MM') as month_label,
        ti.product_id,
        p.name as product_name,
        p.sku,
        sum(ti.quantity) as total_quantity_sold,
        sum(ti.subtotal) as total_revenue
    from public.transactions t
    join public.branches b on b.id = t.branch_id
    join public.transaction_items ti on ti.transaction_id = t.id
    join public.products p on p.id = ti.product_id
    where t.status in ('completed', 'offline_synced')
    group by t.branch_id, b.name, date_trunc('month', t.created_at), to_char(t.created_at, 'YYYY-MM'), ti.product_id, p.name, p.sku
),
ranked_sales as (
    select
        *,
        dense_rank() over (partition by branch_id, month_date order by total_quantity_sold desc, total_revenue desc) as rank_by_volume,
        dense_rank() over (partition by branch_id, month_date order by total_revenue desc, total_quantity_sold desc) as rank_by_revenue
    from monthly_product_sales
)
select * from ranked_sales where rank_by_volume <= 3 or rank_by_revenue <= 3;

create or replace view public.v_branch_velocity_insights
with (security_invoker = true)
as
select
    tr.source_branch_id,
    sb.name as source_branch_name,
    tr.target_branch_id,
    tb.name as target_branch_name,
    ti.product_id,
    p.name as product_name,
    p.sku,
    to_char(tr.created_at, 'YYYY-MM') as month_label,
    extract(week from tr.created_at) as week_of_year,
    count(tr.id) as transfer_count,
    sum(ti.quantity_sent) as total_units_transferred
from public.transfers tr
join public.branches sb on sb.id = tr.source_branch_id
join public.branches tb on tb.id = tr.target_branch_id
join public.transfer_items ti on ti.transfer_id = tr.id
join public.products p on p.id = ti.product_id
where tr.status = 'RECEIVED'
group by tr.source_branch_id, sb.name, tr.target_branch_id, tb.name, ti.product_id, p.name, p.sku, to_char(tr.created_at, 'YYYY-MM'), extract(week from tr.created_at);

-- =====================================================================
-- 12. HELPER FUNCTIONS FOR RLS (Extracting from JWT app_metadata)
-- =====================================================================
create or replace function public.current_user_role()
returns text
language sql
stable
as $$
    select coalesce(
        auth.jwt() -> 'app_metadata' ->> 'role',
        'cashier'
    );
$$;

create or replace function public.current_user_branch_id()
returns uuid
language sql
stable
as $$
    select (auth.jwt() -> 'app_metadata' ->> 'branch_id')::uuid;
$$;

-- =====================================================================
-- 13. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

-- Enable RLS on all tables
alter table public.branches enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.branch_stock enable row level security;
alter table public.stock_movements enable row level security;
alter table public.transfers enable row level security;
alter table public.transfer_items enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_items enable row level security;

-- BRANCHES
create policy "branches_select" on public.branches
    for select to authenticated
    using (true);

create policy "branches_admin_all" on public.branches
    for all to authenticated
    using (public.current_user_role() = 'super_admin')
    with check (public.current_user_role() = 'super_admin');

-- PROFILES
create policy "profiles_select" on public.profiles
    for select to authenticated
    using (
        (select auth.uid()) = id
        or public.current_user_role() = 'super_admin'
        or branch_id = public.current_user_branch_id()
    );

create policy "profiles_update_self" on public.profiles
    for update to authenticated
    using ((select auth.uid()) = id or public.current_user_role() = 'super_admin')
    with check ((select auth.uid()) = id or public.current_user_role() = 'super_admin');

-- CATEGORIES & PRODUCTS (All staff can read active catalog)
create policy "categories_select" on public.categories
    for select to authenticated
    using (true);

create policy "categories_admin_modify" on public.categories
    for all to authenticated
    using (public.current_user_role() in ('super_admin', 'inventory_manager'))
    with check (public.current_user_role() in ('super_admin', 'inventory_manager'));

create policy "products_select" on public.products
    for select to authenticated
    using (true);

create policy "products_admin_modify" on public.products
    for all to authenticated
    using (public.current_user_role() in ('super_admin', 'inventory_manager'))
    with check (public.current_user_role() in ('super_admin', 'inventory_manager'));

-- BRANCH STOCK
create policy "branch_stock_select" on public.branch_stock
    for select to authenticated
    using (
        public.current_user_role() = 'super_admin'
        or branch_id = public.current_user_branch_id()
    );

create policy "branch_stock_update" on public.branch_stock
    for update to authenticated
    using (
        public.current_user_role() = 'super_admin'
        or (public.current_user_role() = 'inventory_manager' and branch_id = public.current_user_branch_id())
    )
    with check (
        public.current_user_role() = 'super_admin'
        or (public.current_user_role() = 'inventory_manager' and branch_id = public.current_user_branch_id())
    );

-- STOCK MOVEMENTS
create policy "stock_movements_select" on public.stock_movements
    for select to authenticated
    using (
        public.current_user_role() = 'super_admin'
        or branch_id = public.current_user_branch_id()
    );

create policy "stock_movements_insert" on public.stock_movements
    for insert to authenticated
    with check (
        public.current_user_role() in ('super_admin', 'inventory_manager', 'cashier')
        and (branch_id = public.current_user_branch_id() or public.current_user_role() = 'super_admin')
    );

-- TRANSFERS
create policy "transfers_select" on public.transfers
    for select to authenticated
    using (
        public.current_user_role() = 'super_admin'
        or source_branch_id = public.current_user_branch_id()
        or target_branch_id = public.current_user_branch_id()
    );

create policy "transfers_insert" on public.transfers
    for insert to authenticated
    with check (
        public.current_user_role() in ('super_admin', 'inventory_manager')
        and (source_branch_id = public.current_user_branch_id() or public.current_user_role() = 'super_admin')
    );

create policy "transfers_update" on public.transfers
    for update to authenticated
    using (
        public.current_user_role() = 'super_admin'
        or source_branch_id = public.current_user_branch_id()
        or target_branch_id = public.current_user_branch_id()
    )
    with check (
        public.current_user_role() = 'super_admin'
        or source_branch_id = public.current_user_branch_id()
        or target_branch_id = public.current_user_branch_id()
    );

-- TRANSFER ITEMS
create policy "transfer_items_select" on public.transfer_items
    for select to authenticated
    using (
        exists (
            select 1 from public.transfers t
            where t.id = transfer_items.transfer_id
            and (
                public.current_user_role() = 'super_admin'
                or t.source_branch_id = public.current_user_branch_id()
                or t.target_branch_id = public.current_user_branch_id()
            )
        )
    );

create policy "transfer_items_modify" on public.transfer_items
    for all to authenticated
    using (
        public.current_user_role() in ('super_admin', 'inventory_manager')
    )
    with check (
        public.current_user_role() in ('super_admin', 'inventory_manager')
    );

-- TRANSACTIONS
create policy "transactions_select" on public.transactions
    for select to authenticated
    using (
        public.current_user_role() = 'super_admin'
        or branch_id = public.current_user_branch_id()
    );

create policy "transactions_insert" on public.transactions
    for insert to authenticated
    with check (
        public.current_user_role() in ('super_admin', 'cashier')
        and (branch_id = public.current_user_branch_id() or public.current_user_role() = 'super_admin')
    );

-- TRANSACTION ITEMS
create policy "transaction_items_select" on public.transaction_items
    for select to authenticated
    using (
        exists (
            select 1 from public.transactions tr
            where tr.id = transaction_items.transaction_id
            and (
                public.current_user_role() = 'super_admin'
                or tr.branch_id = public.current_user_branch_id()
            )
        )
    );

create policy "transaction_items_insert" on public.transaction_items
    for insert to authenticated
    with check (
        exists (
            select 1 from public.transactions tr
            where tr.id = transaction_items.transaction_id
            and (
                public.current_user_role() = 'super_admin'
                or tr.branch_id = public.current_user_branch_id()
            )
        )
    );
