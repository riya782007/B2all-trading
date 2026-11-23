"use client";
import { useActionState } from "react";
import { Tag } from "lucide-react";
import { savePersonaAction } from "@/app/books-actions";
import type { FormState } from "@/app/actions";
export default function Persona({ id, tags, notes, whatsapp }: { id: string; tags: string; notes: string; whatsapp: string }) {
  const [st, act, pending] = useActionState<FormState, FormData>(savePersonaAction, {});
  return (
    <details className="card mb-5 p-4" open={!tags && !notes ? false : undefined}>
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium"><Tag size={16} className="text-pri" />Customer notes and tags {tags && <span className="text-ink2">· {tags}</span>}</summary>
      <form action={act} className="mt-3 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="id" value={id} />
        <label className="field"><span>Tags (comma separated) — use them to target offers</span><input name="tags" defaultValue={tags} placeholder="e.g. Sponge iron plant, Price sensitive, Rake buyer" className="input" /></label>
        <label className="field"><span>WhatsApp number (if different from phone)</span><input name="whatsapp" defaultValue={whatsapp} className="input" inputMode="tel" /></label>
        <label className="field sm:col-span-2"><span>Notes (what they like, plant capacity, who decides, payment habits)</span><textarea name="notes" defaultValue={notes} className="input min-h-20" /></label>
        <div className="flex items-center gap-3"><button className="btn btn-filled btn-sm" disabled={pending}>Save</button>{st.ok && <span className="text-sm text-ok">{st.ok}</span>}{st.error && <span className="text-sm text-err">{st.error}</span>}</div>
      </form>
    </details>
  );
}
