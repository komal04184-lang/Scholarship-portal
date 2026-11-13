
const baseUrl = () =>
  (process.env.APPLICATION_SERVICE_URL || 'http://localhost:3002')
    .replace(/\/$/, '');

export async function updateApplicationStatus(
  applicationId,
  status,
  remarks = '',
  authorizationHeader
) {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    throw new Error('Valid reviewer authorization token is required');
  }

  const response = await fetch(
    `${baseUrl()}/api/v1/applications/${encodeURIComponent(applicationId)}/status`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorizationHeader,
      },
      body: JSON.stringify({
        status,
        comment: remarks,
      }),
      signal: AbortSignal.timeout(
        Number(process.env.APPLICATION_SERVICE_TIMEOUT_MS || 5000)
      ),
    }
  );

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      `Application Service returned ${response.status}: ${
        body.message || body.error || 'Status update failed'
      }`
    );
  }

  return body;
}
