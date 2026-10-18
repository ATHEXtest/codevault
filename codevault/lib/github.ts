const GITHUB_API = "https://api.github.com";

function authHeaders(token: string | null): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function httpError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}

function isRateLimited(res: Response) {
  return res.status === 429 || (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0") || res.status === 403;
}

export async function createGist(token: string, filename: string, content: string, description: string) {
  const res = await fetch(`${GITHUB_API}/gists`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ description, files: { [filename]: { content } }, public: false }),
  });
  if (res.status === 401) throw httpError("GitHub rejected your token. Reconnect it and try again.", 401);
  if (isRateLimited(res)) throw httpError("GitHub rate limit reached (about 10 gists/hour). Try again later.", 429);
  if (!res.ok) throw httpError(`GitHub error: ${res.status}`, res.status);
  return res.json();
}

/** `rev` pins a specific gist revision (commit SHA). Returns null if the gist isn't found. */
export async function getGist(token: string | null, gistId: string, rev?: string) {
  const url = `${GITHUB_API}/gists/${gistId}${rev ? `/${rev}` : ""}`;
  let res = await fetch(url, { headers: authHeaders(token), cache: "no-store" });
  if (res.status === 401 && token) {
    res = await fetch(url, { headers: authHeaders(null), cache: "no-store" }); // bad token: try anonymously
  }
  if (res.status === 404) return null;
  if (!res.ok) throw httpError(`GitHub error: ${res.status}`, res.status);
  return res.json();
}

export async function updateGist(token: string, gistId: string, filename: string, content: string) {
  const res = await fetch(`${GITHUB_API}/gists/${gistId}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ files: { [filename]: { content } } }),
  });
  if (res.status === 401) throw httpError("GitHub rejected your token. Reconnect it and try again.", 401);
  if (res.status === 404) throw httpError("Gist not found, or your token can't edit it.", 404);
  if (isRateLimited(res)) throw httpError("GitHub rate limit reached. Try again later.", 429);
  if (!res.ok) throw httpError(`GitHub error: ${res.status}`, res.status);
  return res.json();
}
