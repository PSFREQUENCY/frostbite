import { signInPath } from "@frostbite/shared/auth/sign-in-path";
import { referralSignInPath } from "@frostbite/shared/referrals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The address a person shares to refer someone (`/r/<code>`): it takes the visitor to the sign-in page with the code in the address, which
// the sign-in request then carries. Nothing is stored, no cookie is set, and nothing is looked up here: a code is judged where an account is
// made, never by whether this address accepts it, so it cannot be used to find out which codes exist. A text that is not the shape of a code
// leads to the plain sign-in page. The destination is built, never taken from the request, so it cannot be turned into a way to send a
// visitor elsewhere.
export async function GET(
  _request: Request,
  context: { readonly params: Promise<{ readonly code: string }> },
) {
  const { code } = await context.params;
  return new Response(null, {
    headers: {
      "cache-control": "no-store",
      location: referralSignInPath(code, signInPath),
    },
    status: 302,
  });
}
