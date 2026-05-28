import { redirect } from "next/navigation";

// Root redirects straight to the chat page
export default function Home() {
  redirect("/chat");
}
