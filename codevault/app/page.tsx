import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-4xl font-bold text-emerald-400">CodeVault</h1>
      <p className="text-zinc-400">
        Store, share, and run code snippets. Your code lives in your own GitHub Gists; anyone with the link can run it.
        12 languages, revisions, forking, and expiry.
      </p>
      <Link href="/new" className="rounded bg-emerald-700 px-6 py-2 font-semibold text-white hover:bg-emerald-600">
        New snippet →
      </Link>
    </main>
  );
}
