"use client";
import Link from "next/link";
import { RotateCcw } from "lucide-react";

/** Friendly fallback instead of a blank "couldn't load" page. Shows the reference so problems can be traced in the logs. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid min-h-[70vh] place-items-center px-4">
      <div className="card max-w-md p-8 text-center">
        <h1 className="text-2xl font-semibold">Something went wrong on this page</h1>
        <p className="mt-2 text-ink2">It has been recorded. Try again, or go back to the start.</p>
        <div className="mt-6 flex justify-center gap-2"><button onClick={reset} className="btn btn-filled"><RotateCcw size={18} />Try again</button><Link href="/" className="btn btn-outline">Home</Link></div>
        {error.digest && <p className="mt-4 text-xs text-ink2">Reference {error.digest}</p>}
      </div>
    </div>
  );
}
