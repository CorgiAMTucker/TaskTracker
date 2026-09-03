import { getSession } from "@/lib/auth";
import ChangePasswordForm from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  const session = await getSession();

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <ChangePasswordForm forced={session!.mustChangePassword} />
    </div>
  );
}
