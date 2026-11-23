import { staff } from "@/lib/auth";
import { Denied, Page } from "@/components/ui";
import Importer from "./importer";
export default async function Import() {
  if (!(await staff("accounts", "edit"))) return <Denied />;
  return (
    <Page title="Bring your books from Tally" sub="Move your ledgers and opening balances across in two minutes. Nothing is retyped and nothing in Tally changes.">
      <ol className="card mb-5 list-decimal space-y-1 p-5 pl-10 text-sm">
        <li>In Tally, open the company and go to <b>Gateway of Tally → Export (Alt+E) → Masters</b>.</li>
        <li>Choose <b>Format: XML (Data Interchange)</b>, type of masters <b>All Masters</b> (or Ledgers and Groups), and export.</li>
        <li>Upload that file here. You see every ledger with its group and opening balance before anything is saved.</li>
      </ol>
      <Importer />
    </Page>
  );
}
