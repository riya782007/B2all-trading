import LoginForm from "./form";
export const metadata = { title: "Sign in" };
export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "" } = await searchParams;
  return (
    <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-12 md:grid-cols-2 md:py-20">
      <div>
        <h1 className="text-[2.8rem]">Welcome to B2All</h1>
        <p className="mt-3 text-lg text-ink2">Tell us who you are once. Your enquiries, deliveries, invoices and contracts will wait for you here.</p>
        <ul className="mt-6 space-y-2 text-ink2"><li>No password and no code.</li><li>Follow every truck and e-way bill.</li><li>Sign contracts and download invoices.</li></ul>
      </div>
      <div className="card p-6 sm:p-8"><LoginForm next={next} /></div>
    </div>
  );
}
