export async function sendClientLog(level: string, message: string, context: any = {}) {
  try {
    await fetch((process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000') + '/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, message, context }),
    });
  } catch (e) {
    // swallow errors to avoid cascading failures
    console.error('Failed to send client log', e);
  }
}
