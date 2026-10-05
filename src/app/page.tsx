import { redirect } from "next/navigation";

// The internal app's root sends users to the dashboard; middleware will bounce
// unauthenticated users to /login. The PUBLIC marketing site lives separately
// (Astro on Cloudflare Pages) and is not part of this app.
export default function Home() {
  redirect("/dashboard");
}
