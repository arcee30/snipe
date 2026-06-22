import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { setSessionUserId } from "@/lib/session";
import { createOrResumeGoogleUser } from "@/services/users";

const STATE_COOKIE = "snipe_google_oauth_state";

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleProfile = {
  sub: string;
  email: string;
  name?: string;
};

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;

  cookieStore.delete(STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectWithError("Google sign-in could not be verified");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return redirectWithError("Google sign-in is not configured yet");
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });
    const tokenData = (await tokenResponse.json()) as GoogleTokenResponse;

    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error(
        tokenData.error_description ??
          tokenData.error ??
          "Unable to exchange Google code"
      );
    }

    const profileResponse = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`
        }
      }
    );

    if (!profileResponse.ok) {
      throw new Error("Unable to read Google profile");
    }

    const profile = (await profileResponse.json()) as GoogleProfile;
    const account = await createOrResumeGoogleUser({
      googleId: profile.sub,
      email: profile.email,
      displayName: profile.name ?? profile.email
    });

    await setSessionUserId(account.user.id);
    return NextResponse.redirect(new URL("/auctions", appUrl()));
  } catch (error) {
    return redirectWithError(
      error instanceof Error ? error.message : "Google sign-in failed"
    );
  }
}

function redirectWithError(error: string) {
  const url = new URL("/signin", appUrl());
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
