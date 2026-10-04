import { NextResponse } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { SCAN_IA_ENABLED, SCAN_IA_ROUTES } from '@/lib/features';

// Route protection is intentionally not enforced everywhere yet — only
// registration/login and the partner space are wired up so far. Add
// auth.protect() per route once those pages are ready.
const isPartnerRoute = createRouteMatcher([
  '/accueil(.*)',
  '/page-marque(.*)',
  '/produits(.*)',
  '/analyses(.*)',
  '/avis(.*)',
  '/mise-en-avant(.*)',
  '/salons(.*)',
  '/abonnements(.*)',
  '/mon-profil(.*)',
  '/ma-demande(.*)',
]);

const isScanIaRoute = createRouteMatcher(SCAN_IA_ROUTES);

export default clerkMiddleware(async (auth, req) => {
  // Scan IA masqué : ses pages renvoient vers l'accueil.
  if (!SCAN_IA_ENABLED && isScanIaRoute(req)) {
    return NextResponse.redirect(new URL('/home', req.url));
  }
  if (isPartnerRoute(req)) {
    await auth.protect({ unauthenticatedUrl: new URL('/login', req.url).toString() });
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};