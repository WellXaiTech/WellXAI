import { auth } from "@/auth";
import { verifyMobileToken } from "@/lib/mobileAuth";

export type RequestUser = { id: string; name: string; image: string | null };

// Shared by any route that needs to know WHO is calling (not just whether
// they're signed in) — ChatGiZa Media posts/comments are authored under a
// real name + avatar, unlike routes that only ever touch the caller's own
// data and so only need the id.
export async function getRequestUser(req: Request): Promise<RequestUser | null> {
  const session = await auth();
  if (session?.user?.id) {
    return {
      id: session.user.id,
      name: session.user.name ?? "You",
      image: session.user.image ?? null,
    };
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const payload = await verifyMobileToken(authHeader.slice(7));
    if (payload?.sub) {
      return {
        id: payload.sub,
        name: payload.name ?? "You",
        image: payload.picture ?? null,
      };
    }
  }

  return null;
}
