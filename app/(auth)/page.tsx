import { redirect } from "next/navigation";
import { SignInForm } from "@/components/sign-in-form";
import { getCurrentUser } from "@/lib/session";

// The site root is the sign-in page, as in LaundryPro; a signed-in user goes on to Bugün
export default async function Home() {
  if (await getCurrentUser()) redirect("/bugun");
  return <SignInForm />;
}
