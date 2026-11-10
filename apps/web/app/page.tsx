import { redirect } from 'next/navigation';

/**
 * Root route. The landing page is a separate project (docs/architecture.md section 19); for a guest
 * in this app, `/` redirects to `/signup`. A signed-in user is sent to `/pass` once auth exists.
 */
export default function Home() {
  redirect('/signup');
}
