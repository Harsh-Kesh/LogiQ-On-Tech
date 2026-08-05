import { redirect } from "next/navigation";

export default function VendorLoginRedirect() {
  redirect("/login?as=vendor");
}
