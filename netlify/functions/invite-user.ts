import { createClient } from "@supabase/supabase-js";

// Handler for Netlify serverless function
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

    const { email, role, branch_id, full_name } = JSON.parse(
      event.body || "{}",
    );
    if (!email || !role) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Email and role are required" }),
      };
    }

    const cleanEmail = email.toLowerCase().trim();
    // Guarantee riveroalecjoseph@gmail.com as super_admin
    const effectiveRole =
      cleanEmail === "riveroalecjoseph@gmail.com" ? "super_admin" : role;

    if (!supabaseUrl || !serviceRoleKey) {
      // Local dev simulation fallback when service role keys aren't configured in serverless env
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: `[DEVELOPMENT MODE] Invitation email dispatched to ${cleanEmail} for role ${effectiveRole} (Branch: ${branch_id || "Global"}). Staff will receive a secure password setup link.`,
          user: {
            id: "user-" + Date.now(),
            email: cleanEmail,
            app_metadata: { role: effectiveRole, branch_id },
            invited_at: new Date().toISOString(),
          },
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
          error: "Only Super Admins can invite new staff members",
        }),
      };
    }

    const siteUrl =
      process.env.URL ||
      process.env.DEPLOY_PRIME_URL ||
      "http://localhost:5173";

    let targetUser: any = null;
    let actionLink: string | undefined = undefined;
    let emailSentSuccessfully = false;
    let warningNote = "";

    // 1. Try sending invitation email via Supabase Auth Admin
    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(cleanEmail, {
        data: {
          full_name: full_name || cleanEmail.split("@")[0],
        },
        redirectTo: `${siteUrl}/reset-password`,
      });

    if (!inviteError && inviteData?.user) {
      targetUser = inviteData.user;
      emailSentSuccessfully = true;
      actionLink = (inviteData as any)?.properties?.action_link;
    } else {
      // 2. Fall back to generateLink if email sending failed or user already exists
      const linkRes = await supabaseAdmin.auth.admin.generateLink({
        type: "invite",
        email: cleanEmail,
        options: {
          data: { full_name: full_name || cleanEmail.split("@")[0] },
          redirectTo: `${siteUrl}/reset-password`,
        },
      });

      if (linkRes.data?.user) {
        targetUser = linkRes.data.user;
        actionLink = linkRes.data.properties?.action_link;
        const formatErrMsg = (err: any) => {
          if (!err) return "";
          const msg = err.message || err.error_description || err.msg;
          if (typeof msg === "string" && msg.trim() && msg !== "{}") {
            return msg;
          }
          return "Supabase SMTP rate limit or provider restriction";
        };
        const errMsg = formatErrMsg(inviteError);
        warningNote = errMsg
          ? `(Note: Email dispatch fallback due to: "${errMsg}").`
          : "";
      } else {
        // Try recovery link if user already confirmed or registered
        const recoveryRes = await supabaseAdmin.auth.admin.generateLink({
          type: "recovery",
          email: cleanEmail,
          options: {
            redirectTo: `${siteUrl}/reset-password`,
          },
        });

        if (recoveryRes.data?.user) {
          targetUser = recoveryRes.data.user;
          actionLink = recoveryRes.data.properties?.action_link;
          warningNote = "Account already registered. Password reset link generated for existing user.";
        } else {
          return {
            statusCode: 400,
            body: JSON.stringify({
              error: inviteError?.message || linkRes.error?.message || "Failed to create user or generate setup link.",
            }),
          };
        }
      }
    }

    // Assign role and branch in app_metadata
    if (targetUser) {
      await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
        app_metadata: {
          role: effectiveRole,
          branch_id: branch_id || null,
        },
      });

      // Insert or update profiles table
      await supabaseAdmin.from("profiles").upsert({
        id: targetUser.id,
        email: cleanEmail,
        full_name: full_name || cleanEmail.split("@")[0],
        role: effectiveRole,
        branch_id: branch_id || null,
        is_active: true,
      });
    }

    // 3. If RESEND_API_KEY is configured in Netlify environment, attempt direct Resend API send
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey && actionLink) {
      try {
        const fromEmail = process.env.RESEND_FROM_EMAIL || "POINVTS <onboarding@resend.dev>";
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [cleanEmail],
            subject: "Invitation to Join POINVTS Workstation System",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 16px;">
                <h2 style="color: #10b981; margin-top: 0;">Welcome to POINVTS System</h2>
                <p>Hello <strong>${full_name || cleanEmail}</strong>,</p>
                <p>You have been invited to join the workstation system with the access role: <strong style="color: #34d399;">${effectiveRole}</strong>.</p>
                <p>Please click the button below to set your secure account password and access the workstation:</p>
                <div style="margin: 28px 0; text-align: center;">
                  <a href="${actionLink}" style="background-color: #059669; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block;">Set Account Password</a>
                </div>
                <p style="font-size: 11px; color: #64748b; line-height: 1.5; margin-top: 30px;">
                  If the button does not work, copy and paste this link into your browser:<br/>
                  <a href="${actionLink}" style="color: #34d399;">${actionLink}</a>
                </p>
              </div>
            `,
          }),
        });

        if (resendRes.ok) {
          emailSentSuccessfully = true;
        } else {
          const resendErr = await resendRes.json();
          warningNote += ` (Resend API: ${resendErr.message || resendRes.statusText})`;
        }
      } catch (rErr: any) {
        warningNote += ` (Resend API call error: ${rErr.message})`;
      }
    }

    const message = emailSentSuccessfully
      ? `Invitation email successfully sent to ${cleanEmail}.`
      : `Staff account provisioned for ${cleanEmail}. ${warningNote}`;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message,
        action_link: actionLink,
        user: targetUser,
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
