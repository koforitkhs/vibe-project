-- Applied on hosted project via MCP; kept for repo history / supabase db pull parity.
-- Allows todos.user_id to be a per-browser UUID without auth.users row.
ALTER TABLE public.todos DROP CONSTRAINT IF EXISTS todos_user_id_fkey;
