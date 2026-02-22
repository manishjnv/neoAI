// ═══════════════════════════════════════════════════
// neoAI — Pages Middleware
// ═══════════════════════════════════════════════════
// Redirects *.pages.dev traffic to the custom domain
// so all access goes through CF Access (Google SSO).

const CUSTOM_DOMAIN = 'neoai.trendsmap.in';

export const onRequest: PagesFunction = async (context) => {
  const host = context.request.headers.get('host') || '';

  // Redirect any *.pages.dev request to the custom domain
  if (host.endsWith('.pages.dev')) {
    const url = new URL(context.request.url);
    url.hostname = CUSTOM_DOMAIN;
    url.port = '';
    return Response.redirect(url.toString(), 301);
  }

  return context.next();
};
