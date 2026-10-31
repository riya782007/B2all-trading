import { staff } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { Denied, Page } from "@/components/ui";
export default async function Activity() {
  if (!(await staff("admin"))) return <Denied />;
  const rows = (await (await getStore()).all("activity")).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 200);
  return <Page title="Activity" sub="Who did what, newest first."><div className="card divide-y divide-line">{rows.map((l) => <div key={l.id} className="flex flex-wrap justify-between gap-2 px-5 py-3 text-sm"><span>{l.what}</span><span className="text-ink2">{l.by_name} · {new Date(l.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></div>)}</div></Page>;
}
