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

  // TEMPORARY dev convenience, see NEXT_PUBLIC_DEV_SKIP_SIGNIN in .env --
  // production is excluded on top of that flag so this can never fire on
  // the deployed site even if the env var leaked there by mistake.
  if (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_DEV_SKIP_SIGNIN === "true") {
    return { id: "107434379596253959921", name: "WellX AI", image: null };
  }

  return null;
}
