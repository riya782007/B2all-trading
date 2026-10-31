import { CheckCircle2, CircleDashed } from "lucide-react";
import { staff, allowed } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { company } from "@/lib/domain";
import { hasAI, hasGmail } from "@/lib/integrations";
import { hasSupabase } from "@/lib/supabase";
import { Denied, Page, Section } from "@/components/ui";
import { saveMaterial } from "@/app/actions";
import CompanyForm from "./company-form";

export default async function Settings() {
  const me = await staff("admin"); if (!me) return <Denied />;
  const edit = allowed(me, "admin", "edit"); const s = await getStore();
  const [co, mats] = await Promise.all([company(s), s.all("materials")]);
  const conn = [["Database (Supabase)", hasSupabase, "Live data and logins"], ["Gmail", hasGmail, "Sends invoices, contracts and offers by email. Needs GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN and GMAIL_SENDER"], ["OpenAI", hasAI, "Writes offer messages for you"], ["WhatsApp Business API", false, "Automatic WhatsApp sending; until then messages open on your phone"], ["E-way bill API", false, "Generate and extend e-way bills from here; needs a GST suvidha provider"]] as const;
  return (
    <Page title="Settings" sub="Company details print on every invoice and contract.">
      <div className="card p-6"><CompanyForm co={co} edit={edit} /></div>
      <Section title="Materials, HSN and GST">
        <p className="mb-3 text-sm text-ink2">Coal is 18% GST with no compensation cess since the September 2025 GST change. Please have your accountant confirm the other rates.</p>
        <div className="space-y-2">{[...mats, null].map((m, i) => (
          <form key={m?.id ?? "new"} action={saveMaterial} className="card grid grid-cols-2 gap-2 p-3 sm:grid-cols-[1.4fr_1fr_.7fr_.6fr_.6fr_.8fr_.8fr_auto] sm:items-end">
            <input type="hidden" name="id" value={m?.id ?? ""} />
            <label className="field"><span>{i === 0 || !m ? "Material" : ""}</span><input name="name" defaultValue={m?.name} placeholder="New material" className="input !h-10" disabled={!edit} /></label>
            <label className="field"><span>{i === 0 || !m ? "Category" : ""}</span><input name="category" defaultValue={m?.category} className="input !h-10" disabled={!edit} /></label>
            <label className="field"><span>{i === 0 || !m ? "HSN" : ""}</span><input name="hsn" defaultValue={m?.hsn} className="input !h-10" disabled={!edit} /></label>
            <label className="field"><span>{i === 0 || !m ? "GST %" : ""}</span><input name="gst_rate" defaultValue={m?.gst_rate ?? 18} inputMode="decimal" className="input !h-10" disabled={!edit} /></label>
            <label className="field"><span>{i === 0 || !m ? "Unit" : ""}</span><input name="unit" defaultValue={m?.unit ?? "MT"} className="input !h-10" disabled={!edit} /></label>
            <label className="field"><span>{i === 0 || !m ? "Opening qty" : ""}</span><input name="opening_qty" defaultValue={m?.opening_qty ?? 0} inputMode="decimal" className="input !h-10" disabled={!edit} /></label>
            <label className="field"><span>{i === 0 || !m ? "Opening rate" : ""}</span><input name="opening_rate" defaultValue={m?.opening_rate ?? 0} inputMode="decimal" className="input !h-10" disabled={!edit} /></label>
            {edit && <button className="btn btn-outline !h-10">{m ? "Save" : "Add"}</button>}
          </form>))}</div>
      </Section>
      <Section title="Connections">
        <div className="card divide-y divide-line">{conn.map(([n, ok, d]) => <div key={n} className="flex items-start gap-3 px-5 py-4">{ok ? <CheckCircle2 className="mt-0.5 text-pri" size={20} /> : <CircleDashed className="mt-0.5 text-ink2" size={20} />}<div><div className="font-medium">{n} <span className="text-sm font-normal text-ink2">· {ok ? "Connected" : "Not connected"}</span></div><div className="text-sm text-ink2">{d}</div></div></div>)}</div>
      </Section>
    </Page>
  );
}
