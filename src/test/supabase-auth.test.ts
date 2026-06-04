import { describe, it, expect } from "vitest";
import { supabase } from "@/lib/supabase";

describe("Supabase Authentication Integration Test", () => {
  const testEmail = `test-auth-${Math.random().toString(36).substring(7)}@test.com`;
  const testPassword = "SuperSecurePassword123!!";

  it("should complete a full registration, login, session check, and logout flow", async () => {
    // 1. Initially, no session should be present or we sign out first to ensure a clean state
    await supabase.auth.signOut();
    let { data: { session } } = await supabase.auth.getSession();
    expect(session).toBeNull();

    // 2. Sign Up
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    if (signUpError) {
      if (signUpError.code === "signup_disabled" || signUpError.message.includes("Signups not allowed")) {
        console.log("Test sauté : l'inscription est désactivée sur cette instance Supabase.");
        return;
      }
      expect(signUpError).toBeNull();
    }
    expect(signUpData.user).not.toBeNull();
    expect(signUpData.user?.email).toBe(testEmail);

    // 3. Since "Confirm email" is disabled, signing up should automatically sign us in.
    // Let's verify if a session was created.
    {
      const { data: { session } } = await supabase.auth.getSession();
      expect(session).not.toBeNull();
      expect(session?.user?.email).toBe(testEmail);
    }

    // 4. Sign Out
    const { error: signOutError } = await supabase.auth.signOut();
    expect(signOutError).toBeNull();

    // Verify session is cleared after signOut
    {
      const { data: { session } } = await supabase.auth.getSession();
      expect(session).toBeNull();
    }

    // 5. Sign In with password
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    expect(signInError).toBeNull();
    expect(signInData.session).not.toBeNull();
    expect(signInData.session?.user?.email).toBe(testEmail);

    // Check session again
    {
      const { data: { session } } = await supabase.auth.getSession();
      expect(session).not.toBeNull();
      expect(session?.user?.email).toBe(testEmail);
    }

    // 6. Final Sign Out
    const { error: finalSignOutError } = await supabase.auth.signOut();
    expect(finalSignOutError).toBeNull();

    {
      const { data: { session } } = await supabase.auth.getSession();
      expect(session).toBeNull();
    }
  });
});
