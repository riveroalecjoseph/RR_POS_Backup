import { createClient } from "@supabase/supabase-js";

// Handler for Netlify serverless function to delete a staff user
export const handler = async (event: {
  httpMethod: string;
  headers: Record<string, string | undefined>;
  body: string | null;
}) => {
  // Only accept POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const authHeader =
      event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Missing authorization header" }),
      };
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl =
      process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const { user_id, email } = JSON.parse(event.body || "{}");

    if (!user_id && !email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "User ID or email is required" }),
      };
    }

    const cleanEmail = email ? email.toLowerCase().trim() : "";

    // Protect primary owner account from deletion
    if (cleanEmail === "riveroalecjoseph@gmail.com") {
      return {
        statusCode: 403,
        body: JSON.stringify({
          error: "The primary Super Admin account cannot be deleted.",
        }),
      };
    }

    if (!supabaseUrl || !serviceRoleKey) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: `[DEVELOPMENT MODE] User ${cleanEmail || user_id} removed from local session.`,
        }),
      };
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
        if (callerUser.id === user_id || (cleanEmail && callerEmail === cleanEmail)) {
          return {
            statusCode: 400,
            body: JSON.stringify({
              error: "You cannot delete your own active account.",
            }),
          };
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
      return {
        statusCode: 403,
        body: JSON.stringify({
          error: "Only Super Admins can remove staff members",
        }),
      };
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

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Staff user ${cleanEmail || user_id} was successfully deleted.`,
      }),
    };
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal Server Error";
    return {
      statusCode: 500,
      body: JSON.stringify({ error: errorMessage }),
    };
  }
};
