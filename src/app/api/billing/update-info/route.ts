import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getStripe, getOrCreateCustomer } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const {
    email,
    name,
    country,
    addressLine1,
    addressLine2,
    postalCode,
    city,
    taxIdType,
    taxIdValue,
  } = body as Record<string, string | undefined>;

  try {
    const stripe = getStripe();
    const customerId = await getOrCreateCustomer(session.user.id, email ?? session.user.email, name ?? session.user.name);

    await stripe.customers.update(customerId, {
      email: email || undefined,
      name: name || undefined,
      address: {
        line1: addressLine1 || "",
        line2: addressLine2 || "",
        postal_code: postalCode || "",
        city: city || "",
        country: country || "",
      },
    });

    let taxIdError: string | null = null;
    if (taxIdType && taxIdValue) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await stripe.customers.createTaxId(customerId, { type: taxIdType as any, value: taxIdValue });
      } catch (err) {
        // Billing address is already saved at this point — a bad tax ID
        // shouldn't roll that back, just get reported back to the form.
        taxIdError = err instanceof Error ? err.message : "Couldn't save that tax ID";
      }
    }

    return NextResponse.json({ ok: true, taxIdError });
  } catch (err) {
    console.error("Billing info update failed:", err);
    const message = err instanceof Error ? err.message : "Couldn't save billing information";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
