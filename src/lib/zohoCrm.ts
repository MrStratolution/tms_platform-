/**
 * Zoho CRM v3 — optional when refresh token + client credentials are set.
 * @see https://www.zoho.com/crm/developer/docs/api/v8/
 */

const ACCOUNTS = process.env.ZOHO_ACCOUNTS_DOMAIN || 'https://accounts.zoho.com'
const API = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com'

export async function zohoGetAccessToken(): Promise<string | null> {
  const clientId = process.env.ZOHO_CLIENT_ID
  const clientSecret = process.env.ZOHO_CLIENT_SECRET
  const refresh = process.env.ZOHO_REFRESH_TOKEN
  if (!clientId || !clientSecret || !refresh) return null

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refresh,
  })

  const res = await fetch(`${ACCOUNTS}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = (await res.json()) as { access_token?: string; error?: string }
  if (!res.ok || !data.access_token) {
    return null
  }
  return data.access_token
}

export async function zohoUpsertLead(
  accessToken: string,
  fields: Record<string, string | undefined>,
): Promise<{ ok: true; raw: unknown } | { ok: false; error: string; raw?: unknown }> {
  const res = await fetch(`${API}/crm/v3/Leads`, {
    method: 'POST',
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: [
        {
          Last_Name: fields.lastName || fields.company || 'Lead',
          First_Name: fields.firstName,
          Email: fields.email,
          Phone: fields.phone,
          Company: fields.company,
          Website: fields.website,
          Description: fields.description,
        },
      ],
    }),
  })
  const raw = await res.json()
  const data = raw as {
    data?: Array<{ code?: string; message?: string; details?: { id?: string } }>
  }
  if (!res.ok) {
    return { ok: false, error: JSON.stringify(data).slice(0, 500), raw }
  }
  const row = data.data?.[0]
  if (row?.code && row.code !== 'SUCCESS') {
    return { ok: false, error: row.message ?? row.code, raw }
  }
  return { ok: true, raw }
}
