const BASE_URL = import.meta.env.PROD
  ? 'https://fininsight-production.up.railway.app/api'
  : '/api'

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const uuid = localStorage.getItem('fininsight_uuid')
  if (uuid) {
    headers['X-User-UUID'] = uuid
  }
  return headers
}

async function request(method: string, path: string, body?: any, params?: Record<string, string>) {
  let url = `${BASE_URL}${path}`
  if (params) {
    const searchParams = new URLSearchParams(params)
    url += `?${searchParams.toString()}`
  }

  const options: RequestInit = {
    method,
    headers: getHeaders(),
  }

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body)
  }

  let response: Response
  try {
    response = await fetch(url, options)
  } catch {
    throw new Error('网络连接失败，请检查网络状态')
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '服务器错误' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

export const api = {
  get: (path: string, params?: Record<string, string>) => request('GET', path, undefined, params),
  post: (path: string, body?: any) => request('POST', path, body),
  put: (path: string, body?: any) => request('PUT', path, body),
  del: (path: string) => request('DELETE', path),
}

// sendBeacon 埋点上报
export function trackEvent(eventType: string) {
  const uuid = localStorage.getItem('fininsight_uuid')
  if (!uuid) return

  const data = JSON.stringify({
    userUuid: uuid,
    eventType,
    timestamp: Date.now(),
  })

  if (navigator.sendBeacon) {
    navigator.sendBeacon(`${BASE_URL}/analytics/track`, new Blob([data], { type: 'application/json' }))
  } else {
    // 降级为 fetch
    fetch(`${BASE_URL}/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data,
      keepalive: true,
    }).catch(() => {})
  }
}
