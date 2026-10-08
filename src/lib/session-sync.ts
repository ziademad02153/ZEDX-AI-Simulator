let pendingSync: Promise<void> = Promise.resolve();

export function syncServerSession(accessToken: string | null): Promise<void> {
    // Preserve login/refresh/logout ordering without blocking Supabase's auth callback.
    pendingSync = pendingSync.catch(() => {}).then(async () => {
        const response = await fetch('/api/auth/session', {
            method: accessToken ? 'POST' : 'DELETE',
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
            credentials: 'same-origin',
            cache: 'no-store',
        });
        if (!response.ok) throw new Error('Unable to synchronize your login. Please try again.');
    });
    return pendingSync;
}
