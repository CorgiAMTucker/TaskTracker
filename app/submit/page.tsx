import RequestForm from "@/app/components/RequestForm";

export default function SubmitRequestPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <RequestForm mode="public" />
    </div>
  );
}
