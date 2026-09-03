import { getSession } from "@/lib/auth";
import TopNav from "@/app/components/TopNav";
import RequestForm from "@/app/components/RequestForm";

export default async function RequestPage() {
  const session = await getSession();

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav currentUser={{ name: session!.name, role: session!.role }} />
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <RequestForm mode="internal" />
      </div>
    </div>
  );
}
