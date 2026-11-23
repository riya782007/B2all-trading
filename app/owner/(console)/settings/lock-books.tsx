"use client";
import { useActionState } from "react";
import { lockBooksAction } from "@/app/books-actions";
import type { FormState } from "@/app/actions";
export default function LockBooks({ date }: { date: string }) {
  const [st, act, pending] = useActionState<FormState, FormData>(lockBooksAction, {});
  return (
    <form action={act} className="card flex flex-wrap items-end gap-3 p-5">
      <p className="w-full text-sm text-ink2">After GST is filed or the year is audited, lock that period. Nobody, including you, can then post or change any voucher on or before the date, like Tally&apos;s “disallow edit before” setting. Clear the date to unlock.</p>
      <label className="field"><span>Books locked up to</span><input type="date" name="books_locked_till" defaultValue={date} className="input" /></label>
      <button className="btn btn-filled" disabled={pending}>Save lock</button>
      {st.ok && <span className="text-sm text-ok">{st.ok}</span>}{st.error && <span className="text-sm text-err">{st.error}</span>}
    </form>
  );
}
