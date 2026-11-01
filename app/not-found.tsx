import Link from "next/link";
export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-4">
      <div className="card max-w-md p-8 text-center"><h1 className="text-2xl font-semibold">We couldn&apos;t find that page</h1><p className="mt-2 text-ink2">It may have moved, or the link is incomplete.</p><Link href="/" className="btn btn-filled mt-6">Go home</Link></div>
    </div>
  );
}
