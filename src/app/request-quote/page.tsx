import { redirect } from "next/navigation";

export default function RequestQuoteRedirect() {
  redirect("/request?type=quote");
}
