interface ClerkErrorItem {
  code?: string;
  longMessage?: string;
  message?: string;
}

function items(err: unknown): ClerkErrorItem[] {
  return (err as { errors?: ClerkErrorItem[] })?.errors ?? [];
}

/** Clerk says exactly why an auth call was refused — surface that, not a guess. */
export function clerkMessage(err: unknown, fallback: string): string {
  const first = items(err)[0];
  return first?.longMessage ?? first?.message ?? fallback;
}

export function clerkErrorCode(err: unknown): string | undefined {
  return items(err)[0]?.code;
}
