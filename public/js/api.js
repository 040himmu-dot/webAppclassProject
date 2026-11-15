// Thin wrapper around fetch for the /api routes.
const api = (() => {
  let onUnauthorized = () => {};
  async function req(method, url, body) {
    const opts = { method, headers: {}, credentials: 'same-origin' };
    if (body instanceof FormData) opts.body = body;
    else if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    const res = await fetch('/api' + url, opts);
    let data = null;
    try { data = await res.json(); } catch (e) { /* empty body */ }
    if (!res.ok) {
      if (res.status === 401 && !url.startsWith('/auth/')) onUnauthorized();
      const err = new Error((data && data.error) || 'Request failed.');
      err.status = res.status;
      throw err;
    }
    return data;
  }
  const qs = (o) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(o || {})) if (v !== '' && v != null) p.set(k, v);
    const s = p.toString();
    return s ? '?' + s : '';
  };
  return {
    get: (u, q) => req('GET', u + qs(q)),
    post: (u, b) => req('POST', u, b),
    put: (u, b) => req('PUT', u, b),
    patch: (u, b) => req('PATCH', u, b),
    del: (u, b) => req('DELETE', u, b),
    setUnauthorizedHandler: (fn) => { onUnauthorized = fn; },
  };
})();
