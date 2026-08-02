import { redirect } from "next/navigation";

// chatgiza.com's root now goes straight into the product ("Ready when you
// are.") instead of a separate marketing landing page with its own "What
// can I help with?" hero — there's only one entry point into ChatGiZa now.
export default function Home() {
  redirect("/chatgiza");
}
