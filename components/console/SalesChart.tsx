import { inr, sdate } from "@/lib/money";

export default function SalesChart({ days }: { days: { date: string; value: number }[] }) {
  const max = Math.max(...days.map(d => d.value), 1);
  return <svg className="h-48 w-full" viewBox="0 0 640 190" role="img" aria-label={`Sales before GST: ${days.map(d => `${d.date}: ${inr(d.value,2)}`).join("; ")}`}>
    <defs><linearGradient id="sales-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--pri)" stopOpacity=".22"/><stop offset="100%" stopColor="var(--pri)" stopOpacity="0"/></linearGradient></defs>
    {[0,1,2,3].map(i => <g key={i}><line x1="78" x2="620" y1={15+i*45} y2={15+i*45} stroke="var(--line)" strokeDasharray="3 5"/><text x="0" y={19+i*45} fontSize="10" fill="var(--ink2)">{max>1?inr(max*(1-i/3)):i===3?"₹0":""}</text></g>)}
    <path d={`M78,150 ${days.map((d,i)=>`L${78+i*90},${150-d.value/max*135}`).join(" ")} L618,150Z`} fill="url(#sales-fill)"/>
    <polyline points={days.map((d,i)=>`${78+i*90},${150-d.value/max*135}`).join(" ")} fill="none" stroke="var(--pri)" strokeWidth="2.5"/>
    {days.map((d,i)=><g key={d.date}><circle cx={78+i*90} cy={150-d.value/max*135} r="4" fill="var(--s1)" stroke="var(--pri)" strokeWidth="2"><title>{sdate(d.date)}: {inr(d.value,2)}</title></circle><text x={78+i*90} y="182" textAnchor="middle" fill="var(--ink2)" fontSize="10">{sdate(d.date)}</text></g>)}
  </svg>;
}
