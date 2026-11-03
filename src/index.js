const GITHUB_AUTHORIZE = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN = 'https://github.com/login/oauth/access_token';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname, searchParams } = url;

    // 1) 인증 시작 → GitHub 로그인으로 리다이렉트
    if (pathname === '/auth') {
      const params = new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID,
        redirect_uri: `${url.origin}/callback`,
        scope: searchParams.get('scope') || 'repo,user',
        state: crypto.randomUUID(),
      });
      return Response.redirect(`${GITHUB_AUTHORIZE}?${params}`, 302);
    }

    // 2) 콜백 → code를 access_token으로 교환 후 CMS 창으로 전달
    if (pathname === '/callback') {
      const code = searchParams.get('code');
      if (!code) return new Response('Missing code', { status: 400 });

      const res = await fetch(GITHUB_TOKEN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'decap-oauth',
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });
      const data = await res.json();

      const state = data.access_token ? 'success' : 'error';
      const result = data.access_token
        ? { token: data.access_token, provider: 'github' }
        : { error: data.error || 'no_token' };
      const message = `authorization:github:${state}:${JSON.stringify(result)}`;

      const body = `<!doctype html><meta charset="utf-8"><body><script>
      (function(){
        function recv(e){
          window.opener.postMessage(${JSON.stringify(message)}, e.origin);
          window.removeEventListener('message', recv, false);
        }
        window.addEventListener('message', recv, false);
        window.opener.postMessage('authorizing:github', '*');
      })();
      </script></body>`;
      return new Response(body, { headers: { 'Content-Type': 'text/html' } });
    }

    return new Response('Decap OAuth proxy running. Try /auth', { status: 200 });
  },
};
