import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container py-24 text-center">
      <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
        / 404
      </p>
      <h1 className="font-display text-5xl tracking-tight mb-4">
        Page not found
      </h1>
      <p className="text-muted-foreground mb-8">
        This booking page or URL doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-primary hover:underline"
      >
        ← Back home
      </Link>
    </div>
  );
}