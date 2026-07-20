import { PageFrame } from "@/components/PageFrame";

export default function EasterEggPage() {
  return (
    <PageFrame>
      <section className="mx-auto flex min-h-[70vh] max-w-4xl items-center px-5 py-16 text-center md:px-8">
        <div className="premium-surface w-full rounded-xl p-8 ring-1 ring-black/10 md:p-12">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8a6a20]">
            Hidden lot discovered
          </p>
          <h1 className="display-serif mt-4 text-5xl font-semibold leading-none md:text-7xl">
            congrats you found the easter egg
          </h1>
          <a
            href="/auctions"
            className="interactive-lift mt-8 inline-flex rounded-full bg-[#151515] px-5 py-3 text-sm font-bold text-white"
          >
            Return to auctions
          </a>
        </div>
      </section>
    </PageFrame>
  );
}
