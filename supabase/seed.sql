-- Seed Data for Multi-Branch POS & Inventory Management System

-- 1. Branches
insert into public.branches (id, code, name, address, phone, is_active)
values
    ('11111111-1111-1111-1111-111111111111', 'BR-CENTRAL', 'Central Flagship Branch', 'Ayala Avenue, Makati City', '+63 2 8123 4567', true),
    ('22222222-2222-2222-2222-222222222222', 'BR-NORTH', 'North Mall Hub', 'SM North EDSA, Quezon City', '+63 2 8234 5678', true),
    ('33333333-3333-3333-3333-333333333333', 'BR-SOUTH', 'South Express Kiosk', 'Alabang Town Center, Muntinlupa', '+63 2 8345 6789', true)
on conflict (id) do nothing;

-- 2. Categories
insert into public.categories (id, name, slug, color)
values
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Beverages', 'beverages', '#0ea5e9'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Bakery & Pastries', 'bakery', '#f59e0b'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Fresh Produce', 'fresh-produce', '#10b981'),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Snacks & Confectionery', 'snacks', '#ec4899'),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Household & Essentials', 'essentials', '#8b5cf6')
on conflict (id) do nothing;

-- 3. Products
insert into public.products (id, sku, barcode, name, description, category_id, price, cost_price, is_active)
values
    ('f1111111-1111-1111-1111-111111111111', 'BEV-001', '4800016641011', 'Cold Brew Reserve 500ml', 'Single-origin arabica cold brew coffee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 165.00, 75.00, true),
    ('f2222222-2222-2222-2222-222222222222', 'BEV-002', '4800016641028', 'Artisan Matcha Latte', 'Ceremonial grade Uji matcha with oat milk', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 185.00, 80.00, true),
    ('f3333333-3333-3333-3333-333333333333', 'BAK-001', '4800016642018', 'Butter Croissant Premium', 'Flaky 100% French butter croissant', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 120.00, 45.00, true),
    ('f4444444-4444-4444-4444-444444444444', 'BAK-002', '4800016642025', 'Pain Au Chocolat', 'Dark Belgian chocolate wrapped in buttery pastry', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 135.00, 52.00, true),
    ('f5555555-5555-5555-5555-555555555555', 'PRO-001', '4800016643015', 'Organic Hass Avocado 2pk', 'Locally sourced ripe Hass avocados', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 190.00, 110.00, true),
    ('f6666666-6666-6666-6666-666666666666', 'SNK-001', '4800016644012', 'Truffle Sea Salt Kettle Chips', 'Hand-cooked gourmet potato chips', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 95.00, 38.00, true),
    ('f7777777-7777-7777-7777-777777777777', 'SNK-002', '4800016644029', 'Dark Chocolate Almond Clusters', '70% cacao with roasted whole almonds', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 150.00, 65.00, true),
    ('f8888888-8888-8888-8888-888888888888', 'ESS-001', '4800016645019', 'Eco Bamboo Straws & Cleaner', 'Set of 4 reusable straws in organic linen pouch', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 140.00, 48.00, true)
on conflict (id) do nothing;

-- 4. Initial Branch Stock
insert into public.branch_stock (branch_id, product_id, quantity, low_stock_threshold)
values
    -- Central Branch
    ('11111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', 85, 15),
    ('11111111-1111-1111-1111-111111111111', 'f2222222-2222-2222-2222-222222222222', 60, 10),
    ('11111111-1111-1111-1111-111111111111', 'f3333333-3333-3333-3333-333333333333', 45, 12),
    ('11111111-1111-1111-1111-111111111111', 'f4444444-4444-4444-4444-444444444444', 38, 10),
    ('11111111-1111-1111-1111-111111111111', 'f5555555-5555-5555-5555-555555555555', 24, 8),
    ('11111111-1111-1111-1111-111111111111', 'f6666666-6666-6666-6666-666666666666', 120, 20),
    ('11111111-1111-1111-1111-111111111111', 'f7777777-7777-7777-7777-777777777777', 90, 15),
    ('11111111-1111-1111-1111-111111111111', 'f8888888-8888-8888-8888-888888888888', 50, 10),

    -- North Mall Branch
    ('22222222-2222-2222-2222-222222222222', 'f1111111-1111-1111-1111-111111111111', 40, 15),
    ('22222222-2222-2222-2222-222222222222', 'f2222222-2222-2222-2222-222222222222', 32, 10),
    ('22222222-2222-2222-2222-222222222222', 'f3333333-3333-3333-3333-333333333333', 18, 12),
    ('22222222-2222-2222-2222-222222222222', 'f6666666-6666-6666-6666-666666666666', 80, 20),

    -- South Express Kiosk
    ('33333333-3333-3333-3333-333333333333', 'f1111111-1111-1111-1111-111111111111', 25, 10),
    ('33333333-3333-3333-3333-333333333333', 'f3333333-3333-3333-3333-333333333333', 15, 10),
    ('33333333-3333-3333-3333-333333333333', 'f7777777-7777-7777-7777-777777777777', 35, 10)
on conflict (branch_id, product_id) do update set quantity = excluded.quantity;
