import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function LandingPage() {
  return (
    <div className="relative">
      {/* Hero */}
      <section className="container pt-20 pb-28 md:pt-28 md:pb-36 relative">
        {/* Ambient accent orb — soft, one element, not a gradient spray */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 right-0 h-[480px] w-[480px] rounded-full bg-primary/20 blur-[120px]"
        />

        <div className="relative max-w-4xl">
          <div className="animate-fade-in-up">
            <Badge variant="primary" className="mb-8">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Live on Solana mainnet
            </Badge>
          </div>

          <h1
            className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight text-balance animate-fade-in-up"
            style={{ animationDelay: "80ms" }}
          >
            Get paid for <span className="italic text-primary">your time</span>,
            <br className="hidden sm:block" /> settled on Solana.
          </h1>

          <p
            className="mt-8 max-w-xl text-lg md:text-xl text-muted-foreground leading-relaxed text-pretty animate-fade-in-up"
            style={{ animationDelay: "160ms" }}
          >
            Share a link. Callers pay USDC into escrow when they book. Funds
            release automatically after the call. No subscriptions. No platform
            fees hidden in fine print.
          </p>

          <div
            className="mt-10 flex flex-wrap items-center gap-3 animate-fade-in-up"
            style={{ animationDelay: "240ms" }}
          >
            <Button asChild size="lg" variant="primary">
              <Link href="/dashboard/setup">
                Create a host profile
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Signal row — lightweight trust micro-copy */}
          <div
            className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-muted-foreground animate-fade-in-up"
            style={{ animationDelay: "320ms" }}
          >
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-success" /> Non-custodial escrow
            </span>
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-success" /> ~400ms finality
            </span>
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-success" /> No platform cut on
              successful calls
            </span>
          </div>
        </div>
      </section>

      {/* Visual break */}
      <div className="container">
        <div className="hairline" />
      </div>

      {/* How it works */}
      <section className="container py-24">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-14">
          <div className="max-w-xl">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
              / How it works
            </p>
            <h2 className="font-display text-4xl md:text-5xl tracking-tight text-balance">
              Three steps, no middlemen.
            </h2>
          </div>
          <p className="max-w-sm text-muted-foreground text-pretty">
            The payment never sits in our wallet. It moves from the caller to a
            Solana escrow program you control.
          </p>
        </div>

        <ol className="grid md:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden">
          {[
            {
              step: "01",
              title: "Set your rate",
              body: "Pick a duration and a price in USDC. Share your link anywhere — Twitter, email signature, a pinned profile.",
            },
            {
              step: "02",
              title: "Caller books & pays",
              body: "They pick an open slot, connect a wallet, and USDC moves into an on-chain escrow tied to that booking.",
            },
            {
              step: "03",
              title: "Funds release",
              body: "After the call, you confirm completion and funds settle to your wallet. If the call doesn't happen, the caller is refunded.",
            },
          ].map((s) => (
            <li
              key={s.step}
              className="bg-card p-8 md:p-10 flex flex-col gap-4 min-h-[260px] group hover:bg-accent/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">
                  {s.step}
                </span>
                <span className="h-px w-16 bg-primary/40 group-hover:w-24 transition-all duration-500" />
              </div>
              <h3 className="font-display text-2xl tracking-tight mt-auto">
                {s.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {s.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Demo callout */}
      <section className="container pb-28">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-10 md:p-16">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -bottom-20 h-96 w-96 rounded-full bg-primary/15 blur-3xl"
          />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="max-w-lg">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
                / Try it now
              </p>
              <h2 className="font-display text-4xl md:text-5xl tracking-tight text-balance">
                Click through the whole flow{" "}
                <span className="italic text-primary">without signing up.</span>
              </h2>
              <p className="mt-4 text-muted-foreground">
                A live demo host is waiting. Book a slot, see the payment
                confirmation, walk the booking status page.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
              <Button size="lg" variant="primary" asChild>
                <Link href="/book/emmy-test">
                  Open demo booking
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/dashboard">View host dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
