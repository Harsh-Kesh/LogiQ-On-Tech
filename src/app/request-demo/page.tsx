import { redirect } from "next/navigation";

export default function RequestDemoRedirect() {
  redirect("/request?type=demo");
}
