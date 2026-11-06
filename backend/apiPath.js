export function stripApiBasePath(url, basePath) {
  const prefix = basePath === '/' ? '' : basePath.replace(/\/$/, '')
  if (!prefix) return url

  const queryIndex = url.indexOf('?')
  const pathname = queryIndex === -1 ? url : url.slice(0, queryIndex)
  const query = queryIndex === -1 ? '' : url.slice(queryIndex)
  if (pathname === `${prefix}/api` || pathname.startsWith(`${prefix}/api/`)) {
    return `${pathname.slice(prefix.length)}${query}`
  }
  return url
}
