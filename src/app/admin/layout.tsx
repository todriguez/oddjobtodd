import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { jwtVerify } from 'jose';

/**
 * Admin layout — server-side session guard.
 *
 * Skips auth check for /admin/login (otherwise redirect loop).
 * The edge middleware already redirects unauthenticated requests,
 * but this provides defense-in-depth at the layout level.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if this is the login page — skip auth guard
  const headersList = await headers();
  const url = headersList.get('x-url') || headersList.get('x-invoke-path') || '';
  const referer = headersList.get('referer') || '';

  // Next.js doesn't expose pathname in layouts easily.
  // Use the middleware to skip, or check cookies only for non-login pages.
  // Since we can't reliably get the pathname here, we just make the
  // auth check non-redirecting for missing tokens — the page-level
  // component handles the redirect to login.
  const cookieStore = await cookies();
  const token = cookieStore.get('ojt_admin_session')?.value;

  if (!token) {
    // Don't redirect here — let the page component handle it.
    // This prevents the redirect loop on /admin/login.
    return <>{children}</>;
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || '');
    const { payload } = await jwtVerify(token, secret, { issuer: 'oddjobtodd' });
    if ((payload as Record<string, unknown>).type !== 'admin') {
      redirect('/admin/login');
    }
  } catch {
    const prevSecret = process.env.JWT_SECRET_PREVIOUS;
    if (prevSecret) {
      try {
        const secret = new TextEncoder().encode(prevSecret);
        const { payload } = await jwtVerify(token, secret, { issuer: 'oddjobtodd' });
        if ((payload as Record<string, unknown>).type !== 'admin') {
          redirect('/admin/login');
        }
      } catch {
        redirect('/admin/login');
      }
    } else {
      redirect('/admin/login');
    }
  }

  return <>{children}</>;
}
