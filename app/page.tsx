import Link from "next/link";
import { ArrowRight, Github } from "lucide-react";
import { BrandLogo } from "@/components/home/BrandLogo";
import { HeroVisual, IntegrityExample, STEP_FRAGMENTS } from "@/components/home/Fragments";
import { Nav } from "@/components/home/Nav";
import { finalCta, footer, hero, howItWorks, integrity, problem, site, whyVoice } from "@/content/home";

const container = "mx-auto max-w-[1120px] px-4 md:px-8";
const section = "border-t border-line py-[72px] md:py-[120px]";
const h2 = "text-[28px] font-semibold leading-[1.15] tracking-[-0.02em] md:text-[36px]";

function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex h-10 items-center gap-2 rounded bg-text px-4 text-[15px] font-medium text-bg transition-colors hover:bg-text/85">
      {children}
    </Link>
  );
}

function SecondaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex h-10 items-center rounded border border-line-strong px-4 text-[15px] font-medium text-text transition-colors hover:bg-surface-2">
      {children}
    </Link>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-bg text-[16px] leading-[1.6] text-text">
      <Nav />

      <main>
        {/* Hero */}
        <section className="pb-[72px] pt-14 md:pb-[120px] md:pt-24">
          <div className={container}>
            <div className="max-w-[640px]">
              <h1 className="text-[36px] font-semibold leading-[1.05] tracking-[-0.03em] md:text-[56px]">{hero.headline}</h1>
              <p className="mt-6 text-[18px] leading-[1.55] text-text-2">{hero.lead}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <PrimaryLink href={site.sampleCaseHref}>
                  {hero.primary} <ArrowRight size={16} strokeWidth={1.5} />
                </PrimaryLink>
                <SecondaryLink href={site.importHref}>{hero.secondary}</SecondaryLink>
              </div>
              <p className="mt-4 text-[14px] text-text-2">{hero.note}</p>
            </div>
            <div className="mt-14 md:mt-16">
              <HeroVisual />
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className={section}>
          <div className={container}>
            <div className="max-w-[640px]">
              <h2 className={h2}>{problem.heading}</h2>
              <div className="mt-6 space-y-4 text-text-2">
                {problem.paragraphs.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
              <figure className="mt-10 border-l-2 border-line-strong pl-5">
                <blockquote className="text-[18px] leading-[1.5] text-text">&ldquo;{problem.founderNote.quote}&rdquo;</blockquote>
                <figcaption className="mt-2 text-[14px] text-text-2">— {problem.founderNote.name}</figcaption>
              </figure>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className={`${section} scroll-mt-16`}>
          <div className={container}>
            <h2 className={h2}>{howItWorks.heading}</h2>
            <ol className="mt-12">
              {howItWorks.steps.map((s, i) => {
                const Fragment = STEP_FRAGMENTS[i];
                const last = i === howItWorks.steps.length - 1;
                return (
                  <li key={s.title} className="relative grid grid-cols-[minmax(0,1fr)] gap-6 pb-12 pl-12 last:pb-0 md:grid-cols-[minmax(0,1fr)_minmax(0,460px)] md:gap-12 md:pb-16">
                    {!last && <span aria-hidden className="absolute bottom-0 left-[13px] top-8 w-px bg-line" />}
                    <span className="absolute left-0 top-0 inline-flex h-7 w-7 items-center justify-center rounded-full border border-line-strong bg-bg font-mono text-[12px] text-text-2">
                      {i + 1}
                    </span>
                    <div className="max-w-[460px]">
                      <h3 className="text-[18px] font-semibold leading-7">{s.title}</h3>
                      <p className="mt-2 text-text-2">{s.body}</p>
                    </div>
                    <div>
                      <Fragment />
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* Why voice */}
        <section id="why-voice" className={`${section} scroll-mt-16`}>
          <div className={container}>
            <h2 className={`${h2} max-w-[640px]`}>{whyVoice.heading}</h2>
            <div className="mt-8 grid gap-10 md:grid-cols-[minmax(0,640px)_minmax(0,1fr)] md:gap-16">
              <div className="space-y-4 text-text-2">
                {whyVoice.paragraphs.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
              <dl className="self-start border-t border-line text-[14px]">
                {whyVoice.details.map((d) => (
                  <div key={d.label} className="grid grid-cols-[88px_1fr] gap-3 border-b border-line py-3">
                    <dt className="text-text-2">{d.label}</dt>
                    <dd className="text-text">{d.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="mt-14 grid items-center gap-8 border-y border-line py-8 md:grid-cols-[minmax(0,1fr)_auto_auto] md:gap-12">
              <p className="max-w-[560px] text-text-2">{whyVoice.builtByVoice}</p>
              <div>
                <div className="font-mono text-[40px] font-medium leading-none tracking-[-0.02em] tabular-nums">{whyVoice.wordsDictated}</div>
                <div className="mt-2 text-[14px] text-text-2">{whyVoice.wordsLabel}</div>
              </div>
              <a href={site.wisprUrl} target="_blank" rel="noopener noreferrer" className="inline-flex rounded p-1" aria-label="Wispr Flow website">
                <BrandLogo brand="wispr" height={20} />
              </a>
            </div>
          </div>
        </section>

        {/* Integrity */}
        <section id="integrity" className={`${section} scroll-mt-16`}>
          <div className={`${container} grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,500px)] md:items-center md:gap-16`}>
            <div className="max-w-[640px]">
              <h2 className={h2}>{integrity.heading}</h2>
              <p className="mt-6 text-text-2">{integrity.body}</p>
            </div>
            <IntegrityExample />
          </div>
        </section>

        {/* Final call to action */}
        <section className={section}>
          <div className={container}>
            <p className="max-w-[760px] text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] md:text-[48px]">{finalCta.line}</p>
            <div className="mt-8">
              <PrimaryLink href={site.sampleCaseHref}>
                {finalCta.button} <ArrowRight size={16} strokeWidth={1.5} />
              </PrimaryLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-10">
        <div className={`${container} flex flex-col gap-6 text-[14px] text-text-2 md:flex-row md:items-center md:justify-between`}>
          <div className="space-y-3">
            <a href={site.challengeUrl} target="_blank" rel="noopener noreferrer" className="block rounded text-text hover:underline">
              {footer.challenge} <span className="text-text-2">{footer.challengeBy}</span>
            </a>
            <div className="flex items-center gap-5">
              <BrandLogo brand="wemakedevs" height={24} />
              <span aria-hidden className="text-text-3">×</span>
              <BrandLogo brand="wispr" height={16} />
            </div>
          </div>
          <div className="space-y-2 md:text-right">
            <div className="flex items-center gap-3 md:justify-end">
              <span className="text-text">{site.authorName}</span>
              <a href={site.githubUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded hover:text-text">
                <Github size={16} strokeWidth={1.5} /> GitHub
              </a>
            </div>
            <p className="text-[13px]">{footer.dataNote}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
