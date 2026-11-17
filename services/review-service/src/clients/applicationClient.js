const baseUrl = () =>
  (process.env.APPLICATION_SERVICE_URL || 'http://localhost:3003')
    .replace(/\/$/, '');

export async function getApplicationDocuments(applicationId, authorizationHeader) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (authorizationHeader?.startsWith('Bearer ')) {
    headers['Authorization'] = authorizationHeader;
  } else {
    headers['X-Service-Token'] = process.env.INTERNAL_SERVICE_TOKEN || 'internal_super_secret_token_change_in_prod';
  }

  try {
    const response = await fetch(
      `${baseUrl()}/api/v1/applications/${encodeURIComponent(applicationId)}/documents`,
      {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(
          Number(process.env.APPLICATION_SERVICE_TIMEOUT_MS || 5000)
        ),
      }
    );
    if (!response.ok) return [];
    const body = await response.json().catch(() => ({}));
    return body.data?.documents || body.documents || (Array.isArray(body.data) ? body.data : []);
  } catch (err) {
    console.warn(`[Review] getApplicationDocuments error for ${applicationId}:`, err.message);
    return [];
  }
}

export async function updateApplicationStatus(
  applicationId,
  status,
  remarks = '',
  authorizationHeader
) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (authorizationHeader?.startsWith('Bearer ')) {
    headers['Authorization'] = authorizationHeader;
  } else {
    headers['X-Service-Token'] = process.env.INTERNAL_SERVICE_TOKEN || 'internal_super_secret_token_change_in_prod';
  }

  const response = await fetch(
    `${baseUrl()}/api/v1/applications/${encodeURIComponent(applicationId)}/status`,
    {
      method: 'PATCH',
      headers,
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
