import { NextResponse } from "next/server";

/**
 * Guards a route with the long-lived assistant API token instead of a user session.
 * Returns a 401 NextResponse to return early, or null when the token is valid.
 */
export function requireApiToken(request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token || !process.env.ASSISTANT_API_TOKEN || token !== process.env.ASSISTANT_API_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
