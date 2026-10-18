import Link from "next/link";
import { getSnippet } from "@/lib/db";
import SnippetClient from "./SnippetClient";

export const dynamic = "force-dynamic";

export default async function SnippetPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ rev?: string }>;
}) {
  const { id } = await params;
  const { rev } = await searchParams;
  const row = await getSnippet(id);

  if (!row) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <h1 className="text-xl font-bold text-red-400">Snippet not found</h1>
        <Link href="/new" className="text-emerald-400 underline">Create a new snippet</Link>
      </main>
    );
  }
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <h1 className="text-xl font-bold text-amber-400">This snippet has expired.</h1>
        <Link href="/new" className="text-emerald-400 underline">Create a new snippet</Link>
      </main>
    );
  }

  return (
    <SnippetClient
      gistId={id}
      language={row.language}
      filename={row.filename}
      description={row.description}
      revision={row.revision}
      rev={rev && /^[0-9a-f]{40}$/.test(rev) ? rev : undefined}
    />
  );
}
