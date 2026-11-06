export function apiUrl(path, baseUrl = import.meta.env?.BASE_URL ?? '/') {
  const prefix = baseUrl === '/' ? '' : baseUrl.replace(/\/$/, '')
  const endpoint = path.startsWith('/') ? path : `/${path}`
  return `${prefix}/api${endpoint}`
}
