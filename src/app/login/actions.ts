"use server";

import { signIn } from "@/lib/auth/auth";
import { AuthError } from "next-auth";

/**
 * Login server action. Delegates to Auth.js. On success Auth.js sets the
 * session cookie and we redirect; on failure we return a generic message
 * (never reveal whether the email exists or the account is locked).
 */
export async function loginAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "/dashboard");

  try {
    await signIn("credentials", { email, password, redirectTo: callbackUrl });
    return {};
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    // signIn throws a redirect on success — rethrow so Next handles it.
    throw err;
  }
}
