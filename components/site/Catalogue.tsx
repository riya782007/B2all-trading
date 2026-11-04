"use client";
import { useState } from "react";
import Image from "next/image";
import { Search, ArrowUpRight } from "lucide-react";
import AddButton from "./AddButton";

const RANGE = [
  {name:"Coal & energy",category:"Energy",image:"Coal.webp",desc:"Thermal, coking, PCI and anthracite coal. Grades matched to your process.",tags:"GCV · Ash · Moisture",match:"Coal"},
  {name:"Ferro alloys",category:"Metals",image:"2-1.webp",desc:"Manganese, silicon and chrome alloys for steelmaking and foundries.",tags:"SiMn · FeMn · FeCr · FeSi",match:"Ferro alloys"},
  {name:"Iron ore & pellets",category:"Metals",image:"irone-ore1.webp",desc:"Lumps, fines and pellets for the iron and steel value chain.",tags:"Fe grade · Size · Impurities",match:"Iron ore"},
  {name:"Scrap & metallics",category:"Metals",image:"44.webp",desc:"Heavy melting scrap, sponge iron and pig iron for your next melt.",tags:"HMS · DRI · Pig iron",match:"Scrap"},
  {name:"Dolomite",category:"Minerals",image:"6.webp",desc:"Flux and refractory inputs, specified for your application.",tags:"Chemistry · Size · Moisture",match:"Dolomite"},
  {name:"Limestone",category:"Minerals",image:"5.webp",desc:"Material for steel, cement and industrial processing.",tags:"SMS · Cement · Chemical grade",match:"Limestone"},
  {name:"Quartz & quartzite",category:"Minerals",image:"big_portfolio_item_7-scaled.webp",desc:"Silica materials for foundries, metallurgy and furnace applications.",tags:"Silica · Furnace lining",match:"Quartz"},
  {name:"Petroleum products",category:"Energy",image:"JIO-BP.webp",desc:"Discuss bulk fuel requirements and distribution with our team.",tags:"Industrial fuel · Distribution",match:"Petroleum"},
  {name:"Bricks & construction",category:"Construction",image:"big_portfolio_item_9-1024x768.webp",desc:"Clay and fly ash bricks for construction and infrastructure.",tags:"Clay bricks · Fly ash bricks",match:"Bricks"},
];
type Item = {id:string;name:string;category:string;note?:string|null};
export default function Catalogue({ materials, loggedIn }: {materials:Item[];loggedIn:boolean}) {
  const [query,setQuery]=useState(""),[filter,setFilter]=useState("All materials");
  const matches=(r:typeof RANGE[number],m:Item)=>m.category===r.match||m.name.toLowerCase().includes(r.match.toLowerCase());
  const visible=RANGE.filter(r=>(filter==="All materials"||r.category===filter)&&`${r.name} ${r.desc} ${r.tags} ${materials.filter(m=>matches(r,m)).map(m=>m.name).join(" ")}`.toLowerCase().includes(query.toLowerCase().trim()));
  const other=materials.filter(m=>!RANGE.some(r=>matches(r,m))).filter(m=>(filter==="All materials")&&`${m.name} ${m.category}`.toLowerCase().includes(query.toLowerCase().trim()));
  return <>
    <div className="catalog-toolbar"><div className="flex flex-wrap gap-2" role="group" aria-label="Material categories">{["All materials","Energy","Metals","Minerals","Construction"].map(c=><button key={c} className="filter" aria-pressed={filter===c} aria-current={filter===c} onClick={()=>setFilter(c)}>{c}</button>)}</div><label className="catalog-search"><Search size={17}/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find a material or grade" aria-label="Find a material or grade"/></label></div>
    <p className="sr-only" aria-live="polite">{visible.length+other.length} material groups found</p>
    <div className="catalog-grid">{visible.map((r,i)=><article key={r.name} className="material-card"><div className="material-photo"><Image src={`/materials/${r.image}`} alt={r.name} fill sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"/><span>{r.category}</span></div><div className="material-body"><p className="site-kicker">{String(i+1).padStart(2,"0")} / INDUSTRIAL INPUTS</p><h3>{r.name}</h3><p className="material-description">{r.desc}</p><p className="material-tags">{r.tags}</p><details><summary>Explore grades & enquire <ArrowUpRight size={16}/></summary><div className="space-y-4 pt-4">{materials.filter(m=>matches(r,m)).map(m=><div key={m.id} className="border-t border-line pt-3"><h4 className="mb-1 font-medium">{m.name}</h4>{m.note&&<p className="mb-3 text-xs text-ink2">{m.note}</p>}<AddButton id={m.id} loggedIn={loggedIn}/></div>)}<p className="text-xs leading-relaxed text-ink2">Final grade, availability and price are confirmed in your quotation.</p><a className="inline-flex items-center gap-2 text-sm font-medium text-pri" href={`mailto:info@b2allcommo.com?subject=${encodeURIComponent(`Material enquiry: ${r.name}`)}`}>Discuss a specific requirement <ArrowUpRight size={14}/></a></div></details></div></article>)}</div>
    {!!other.length&&<div className="mt-6 grid gap-4 sm:grid-cols-3">{other.map(m=><article className="card p-5" key={m.id}><h3 className="mb-2 text-lg">{m.name}</h3><p className="mb-4 text-sm text-ink2">{m.note||m.category}</p><AddButton id={m.id} loggedIn={loggedIn}/></article>)}</div>}
    {!visible.length&&!other.length&&<div className="rounded-xl border border-dashed border-line p-10 text-center"><h3>No matching materials</h3><p className="my-3 text-ink2">Try a broader grade or material name.</p><button className="btn btn-outline" onClick={()=>{setQuery("");setFilter("All materials")}}>Clear filters</button></div>}
  </>;
}
