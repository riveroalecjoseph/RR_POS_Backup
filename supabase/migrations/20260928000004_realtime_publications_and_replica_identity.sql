-- =====================================================================
-- MIGRATION: Realtime Publications & Replica Identity Full Configuration
-- Configures supabase_realtime_messages_publication and WAL replica identity
-- =====================================================================

-- 1. Configure REPLICA IDENTITY FULL for tables with frequent UPDATE/DELETE events
-- This ensures payload.old contains all previous row columns, avoiding nulls on updates
ALTER TABLE public.transfers REPLICA IDENTITY FULL;
ALTER TABLE public.transfer_items REPLICA IDENTITY FULL;
ALTER TABLE public.branch_stock REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.products REPLICA IDENTITY FULL;

-- 2. Add all required workstation tables to the Supabase Realtime Publication
DO $$
BEGIN
    -- branch_stock
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime_messages_publication' 
          AND schemaname = 'public' 
          AND tablename = 'branch_stock'
    ) THEN
        ALTER PUBLICATION supabase_realtime_messages_publication ADD TABLE public.branch_stock;
    END IF;

    -- transfers
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime_messages_publication' 
          AND schemaname = 'public' 
          AND tablename = 'transfers'
    ) THEN
        ALTER PUBLICATION supabase_realtime_messages_publication ADD TABLE public.transfers;
    END IF;

    -- transfer_items
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime_messages_publication' 
          AND schemaname = 'public' 
          AND tablename = 'transfer_items'
    ) THEN
        ALTER PUBLICATION supabase_realtime_messages_publication ADD TABLE public.transfer_items;
    END IF;

    -- products
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime_messages_publication' 
          AND schemaname = 'public' 
          AND tablename = 'products'
    ) THEN
        ALTER PUBLICATION supabase_realtime_messages_publication ADD TABLE public.products;
    END IF;

    -- categories
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime_messages_publication' 
          AND schemaname = 'public' 
          AND tablename = 'categories'
    ) THEN
        ALTER PUBLICATION supabase_realtime_messages_publication ADD TABLE public.categories;
    END IF;

    -- profiles
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime_messages_publication' 
          AND schemaname = 'public' 
          AND tablename = 'profiles'
    ) THEN
        ALTER PUBLICATION supabase_realtime_messages_publication ADD TABLE public.profiles;
    END IF;

    -- transactions
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime_messages_publication' 
          AND schemaname = 'public' 
          AND tablename = 'transactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime_messages_publication ADD TABLE public.transactions;
    END IF;

    -- stock_movements
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime_messages_publication' 
          AND schemaname = 'public' 
          AND tablename = 'stock_movements'
    ) THEN
        ALTER PUBLICATION supabase_realtime_messages_publication ADD TABLE public.stock_movements;
    END IF;

    -- branches
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime_messages_publication' 
          AND schemaname = 'public' 
          AND tablename = 'branches'
    ) THEN
        ALTER PUBLICATION supabase_realtime_messages_publication ADD TABLE public.branches;
    END IF;

    -- audit_logs
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime_messages_publication' 
          AND schemaname = 'public' 
          AND tablename = 'audit_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime_messages_publication ADD TABLE public.audit_logs;
    END IF;
END $$;
