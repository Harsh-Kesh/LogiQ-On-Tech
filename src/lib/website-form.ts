// Client-side helper for the public website forms -> POST /api/contact.

export type WebsiteFormKind = 'contact' | 'callback' | 'demo' | 'quote';

/** Sends a <form>'s named fields. Returns an error message, or null on success. */
export async function submitWebsiteForm(kind: WebsiteFormKind, form: HTMLFormElement): Promise<string | null> {
  const data = new FormData(form);
  const fields: Record<string, string> = {};
  for (const key of Array.from(new Set(data.keys()))) {
    if (key === 'email' || key === 'name' || key === 'website') continue;
    fields[key] = data.getAll(key).map(String).join(', '); // checkbox groups -> one line
  }

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        form: kind,
        email: String(data.get('email') || ''),
        name: String(data.get('name') || '') || undefined,
        website: String(data.get('website') || '') || undefined,
        fields,
      }),
    });
    if (res.ok) return null;
    const body = await res.json().catch(() => ({}));
    return body.error || 'Something went wrong. Please try again.';
  } catch {
    return 'Network error. Please try again.';
  }
}
