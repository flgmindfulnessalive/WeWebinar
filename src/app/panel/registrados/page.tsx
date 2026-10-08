import { redirect } from "next/navigation";

// Old address of the leads list, kept so bookmarks keep working.
export default function LegacyLeadsPage() {
  redirect("/panel/registros");
}
