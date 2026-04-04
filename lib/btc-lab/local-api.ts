const LOCAL_API = process.env.BTC_LAB_LOCAL_API || "http://localhost:8765";

export async function fetchLocal(path: string) {
  try {
    const res = await fetch(`${LOCAL_API}${path}`, {
      next: { revalidate: 5 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function isOnline(): Promise<boolean> {
  try {
    const res = await fetch(`${LOCAL_API}/health`, {
      next: { revalidate: 10 },
    });
    return res.ok;
  } catch {
    return false;
  }
}
