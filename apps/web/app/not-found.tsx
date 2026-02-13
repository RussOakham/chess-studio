import Link from "next/link";

/**
 * Minimal 404 page.
 */
export default function NotFound() {
  return (
    <div>
      <h1>404</h1>
      <p>This page could not be found.</p>
      <Link href="/">Return home</Link>
    </div>
  );
}
