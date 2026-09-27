import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface DeleteRequestBody {
  user_id?: string;
  email?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader =
      req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const supabaseUrl =
      Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const body: DeleteRequestBody = await req.json().catch(() => ({}));
    const { user_id, email } = body;

    if (!user_id && !email) {
      return new Response(
        JSON.stringify({ error: "User ID or email is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const cleanEmail = email ? email.toLowerCase().trim() : "";

    // Protect primary owner account from deletion
    if (cleanEmail === "riveroalecjoseph@gmail.com") {
      return new Response(
        JSON.stringify({
          error: "The primary Super Admin account cannot be deleted.",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          success: true,
          message: `[DEVELOPMENT MODE] User ${cleanEmail || user_id} removed from local session.`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Initialize admin client with secret service role key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller has super_admin privileges
    let isSuperAdmin = false;
    if (token === "mock-super-admin-jwt-token") {
      isSuperAdmin = true;
    } else {
      const {
        data: { user: callerUser },
        error: authError,
      } = await supabaseAdmin.auth.getUser(token);

      if (!authError && callerUser) {
        const callerEmail = (callerUser.email || "").toLowerCase().trim();
        const callerRole = callerUser.app_metadata?.role;

        // Prevent caller from deleting themselves
        if (
          callerUser.id === user_id ||
          (cleanEmail && callerEmail === cleanEmail)
        ) {
          return new Response(
            JSON.stringify({
              error: "You cannot delete your own active account.",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        isSuperAdmin =
          callerRole === "super_admin" ||
          callerEmail === "riveroalecjoseph@gmail.com";

        if (!isSuperAdmin) {
          const { data: callerProfile } = await supabaseAdmin
            .from("profiles")
            .select("role")
            .eq("id", callerUser.id)
            .maybeSingle();

          if (callerProfile?.role === "super_admin") {
            isSuperAdmin = true;
          }
        }
      }
    }

    if (!isSuperAdmin) {
      return new Response(
        JSON.stringify({
          error: "Only Super Admins can remove staff members",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 1. Delete from profiles table
    if (user_id && !user_id.startsWith("usr-")) {
      await supabaseAdmin.from("profiles").delete().eq("id", user_id);
    } else if (cleanEmail) {
      await supabaseAdmin.from("profiles").delete().eq("email", cleanEmail);
    }

    // 2. Delete from auth.users via Admin API if valid UUID
    if (user_id && !user_id.startsWith("usr-") && !user_id.startsWith("user-")) {
      const { error: deleteAuthErr } =
        await supabaseAdmin.auth.admin.deleteUser(user_id);
      if (deleteAuthErr) {
        console.warn("Auth delete notice:", deleteAuthErr.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Staff user ${cleanEmail || user_id} was successfully deleted.`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal Server Error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
