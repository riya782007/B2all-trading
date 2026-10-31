"use client";
import { Printer } from "lucide-react";
export default function PrintButton({ label = "Print or save PDF" }: { label?: string }) {
  return <button onClick={() => window.print()} className="btn btn-tonal"><Printer size={18} />{label}</button>;
}
