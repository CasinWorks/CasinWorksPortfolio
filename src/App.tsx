/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { 
  ArrowRight, 
  Plus,
  ArrowUpRight,
  Menu,
  X
} from "lucide-react";
import { AppsForEveryoneSection } from "./components/AppsForEveryoneSection";
import { CaseStudySnippetList } from "./components/CaseStudySnippetList";
import { StudioConceptsSection } from "./components/StudioConceptsSection";
import { FaqSection } from "./components/FaqSection";
import { StickyMobileCta } from "./components/StickyMobileCta";
import { usePageMeta } from "./hooks/usePageMeta";
import { PARTNERS, SITE } from "./site";

export default function App() {
  usePageMeta({
    title: SITE.title,
    description: SITE.description,
    path: "/",
  });

  const navLinks = useMemo(
    () => [
      { href: "#expertise", label: "Expertise" },
      { href: "#approach", label: "Approach" },
      { href: "#partners", label: "Partners" },
      { href: "#work", label: "Case Studies" },
      { href: "#studio-concepts", label: "Studio" },
      { href: "#apps-for-everyone", label: "Apps For Everyone" },
      { href: "#faq", label: "FAQ" },
    ],
    []
  );

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // If we cross into desktop width, force-close the mobile panel.
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (mq.matches) setMobileNavOpen(false);
    };
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;

    const syncHeaderHeight = () => {
      document.documentElement.style.setProperty(
        "--header-h",
        `${el.offsetHeight + 12}px`,
      );
    };

    syncHeaderHeight();
    const ro = new ResizeObserver(syncHeaderHeight);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--header-h");
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileNavOpen]);

  const expertise = [
    {
      id: "01",
      title: "SCADA & Industrial Control",
      description: "Engineering resilient systems for power utilities and manufacturing plants where downtime is not an option. Focus on fault tolerance and long-term stability.",
    },
    {
      id: "02",
      title: "Operational Intelligence",
      description: "Transforming factory floor data into actionable insights. Implementing Andon and monitoring systems that directly impact throughput and ROI.",
    },
    {
      id: "03",
      title: "Enterprise Architecture",
      description: "Custom software architecture designed to centralize fragmented business processes and eliminate operational bottlenecks.",
    }
  ];

  return (
    <div id="top" className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-[var(--page-cream)] text-[#1a1a1a] font-sans selection:bg-black selection:text-white">
      {/* Navigation */}
      <nav
        ref={navRef}
        className="fixed top-0 w-full z-50 bg-[var(--page-cream)] text-[#1a1a1a] border-b border-black/10"
      >
        <div className="max-w-[var(--page-max)] mx-auto px-[var(--page-gutter)] min-h-16 md:min-h-[4.25rem] py-3 flex items-center justify-between gap-6">
          <a href="#top" className="flex flex-col leading-tight w-fit hover:opacity-70 transition-opacity" aria-label={`${SITE.brand} — ${SITE.fullName}`}>
            <span className="text-lg font-semibold tracking-tight">{SITE.brand}</span>
            <span className="text-xs text-current/55">Independent Engineering</span>
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex flex-wrap items-center gap-x-5 lg:gap-x-7 text-[15px] font-medium">
            {navLinks.map((l) =>
              l.href.startsWith("/") ? (
                <Link key={l.href} to={l.href} className="hover:opacity-55 transition-opacity">
                  {l.label}
                </Link>
              ) : (
                <a key={l.href} href={l.href} className="hover:opacity-55 transition-opacity">
                  {l.label}
                </a>
              )
            )}
            <Link
              to="/book"
              className="px-4 py-2 rounded-full transition-colors text-[15px] font-medium bg-black text-white hover:bg-slate-800"
            >
              Book a consultation
            </Link>
            <Link
              to="/portal/sign-in"
              className="px-4 py-2 rounded-full border border-black/20 transition-colors text-[15px] font-medium text-[#1a1a1a] hover:border-black/50 hover:bg-black/[0.04]"
            >
              Portal
            </Link>
          </div>

          {/* Mobile burger */}
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center rounded-full border border-black/15 bg-black/5 px-4 py-3 hover:bg-black/10 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
            aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-nav-panel"
            onClick={() => setMobileNavOpen((v) => !v)}
          >
            {mobileNavOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </nav>

      {/* Mobile overlay menu (separate from nav to avoid blending/overlap) */}
      <motion.div
        id="mobile-nav-panel"
        initial={false}
        animate={mobileNavOpen ? "open" : "closed"}
        variants={{
          open: { opacity: 1, pointerEvents: "auto" as const },
          closed: { opacity: 0, pointerEvents: "none" as const },
        }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="md:hidden fixed inset-0 z-40"
        aria-hidden={!mobileNavOpen}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/35"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden
        />

        {/* Panel */}
        <motion.div
          initial={false}
          animate={mobileNavOpen ? { y: 0 } : { y: -12 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-x-0 top-0 bg-[var(--page-cream)] text-[#1a1a1a] pt-28 sm:pt-32 pb-10"
        >
          <div className="max-w-[var(--page-max)] mx-auto px-[var(--page-gutter)]">
            <div className="rounded-3xl border border-black/10 bg-white px-6 py-8 shadow-[0_20px_80px_rgba(0,0,0,0.12)]">
              <div className="flex flex-col gap-4 text-[17px] font-medium">
                {navLinks.map((l) =>
                  l.href.startsWith("/") ? (
                    <Link
                      key={l.href}
                      to={l.href}
                      className="hover:opacity-60 transition-opacity"
                      onClick={() => setMobileNavOpen(false)}
                    >
                      {l.label}
                    </Link>
                  ) : (
                    <a
                      key={l.href}
                      href={l.href}
                      className="hover:opacity-60 transition-opacity"
                      onClick={() => setMobileNavOpen(false)}
                    >
                      {l.label}
                    </a>
                  )
                )}
                <Link
                  to="/book"
                  className="mt-2 bg-black text-white px-5 py-2.5 rounded-full hover:bg-slate-800 transition-colors font-medium w-fit text-[15px]"
                  onClick={() => setMobileNavOpen(false)}
                >
                  Book a consultation
                </Link>
                <Link
                  to="/portal/sign-in"
                  className="text-slate-500 hover:text-black transition-colors w-fit text-[14px]"
                  onClick={() => setMobileNavOpen(false)}
                >
                  Already have an account? Sign in
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <main>
        {/* Hero Section — first screen, up to the fold */}
        <section className="relative min-h-[100svh] px-[var(--page-gutter)] pt-28 sm:pt-32 lg:pt-36 pb-12 sm:pb-14 overflow-x-hidden flex flex-col">
          <div className="max-w-[var(--page-max)] mx-auto relative min-w-0 w-full flex-1 flex flex-col justify-between">
            <motion.div
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="relative z-0 min-w-0 max-w-full">
                <h1 className="max-w-full min-w-0 text-5xl sm:text-7xl lg:text-8xl font-serif font-semibold tracking-tight leading-[0.9] mb-6 sm:mb-8 break-words [overflow-wrap:anywhere]">
                  High-Stakes <br />
                  <span className="italic text-slate-400 block">
                    Engineering.
                  </span>
                </h1>

                <p className="max-w-full font-serif text-xl sm:text-2xl italic leading-snug tracking-tight text-[#1a1a1a]">
                  {SITE.tagline}
                </p>
              </div>
            </motion.div>

            <div className="relative z-0 mt-10 sm:mt-12 grid lg:grid-cols-12 gap-8 lg:gap-12 items-end min-w-0">
              <div className="min-w-0 lg:col-span-7">
                <p className="text-base sm:text-lg lg:text-xl text-slate-600 leading-relaxed max-w-2xl">
                  Independent software architecture for enterprises that require mission-critical reliability and senior-level accountability.
                </p>
              </div>
              <div className="min-w-0 lg:col-span-5 flex flex-col items-start lg:items-end gap-3">
                <Link
                  to="/book"
                  className="group inline-flex items-center gap-3 text-base sm:text-lg font-semibold"
                >
                  <span className="border-b-2 border-black pb-0.5">Book a consultation</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <p className="text-sm text-slate-500 max-w-xs lg:text-right">
                  Pick a time on the calendar. No account needed to start.
                </p>
              </div>
            </div>

            {/* Background accent — clipped to hero width so it never widens the page */}
            <div
              className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-[min(100%,52rem)] max-w-[100vw] overflow-hidden"
              aria-hidden
            >
              <div className="absolute -top-16 right-0 sm:-top-20 translate-x-[8%] text-[min(28vw,12rem)] font-serif font-semibold italic text-[#dddcd7] select-none whitespace-nowrap">
                CJC
              </div>
            </div>
          </div>

          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-black/[0.07]"
            aria-hidden
          />
          <div className="absolute inset-x-0 bottom-0 h-px bg-black/15" aria-hidden />
        </section>

        {/* Philosophy Section */}
        <section id="approach" className="section-y px-[var(--page-gutter)] overflow-x-hidden border-t border-black/10 shadow-[inset_0_18px_28px_-24px_rgba(0,0,0,0.35)]">
          <div className="max-w-[var(--page-max)] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
            <div className="min-w-0 lg:col-span-4">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-5">The Philosophy</h2>
              <h3 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-semibold leading-[1.05] italic max-w-[100%]">
                Direct. <br />
                Resilient. <br />
                Senior.
              </h3>
            </div>
            <div className="min-w-0 lg:col-span-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 lg:gap-12 min-w-0">
                <div className="min-w-0 space-y-3">
                  <span className="block text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">01</span>
                  <h4 className="text-xl font-semibold tracking-tight">Accountability</h4>
                  <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                    You work directly with the engineer. No account managers, no middle-men. This ensures technical decisions are always aligned with your business objectives.
                  </p>
                </div>
                <div className="min-w-0 space-y-3">
                  <span className="block text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">02</span>
                  <h4 className="text-xl font-semibold tracking-tight">Reliability</h4>
                  <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                    My background in industrial software means I build for the long term. I specialize in systems that must remain operational 24/7.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Expertise Section */}
        <section id="expertise" className="section-y px-[var(--page-gutter)]">
          <div className="max-w-[var(--page-max)] mx-auto">
            <div className="mb-10 sm:mb-14 grid lg:grid-cols-12 gap-6 lg:gap-12">
              <div className="lg:col-span-7">
                <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-5">Core Expertise</h2>
                <h3 className="max-w-full text-4xl sm:text-5xl lg:text-6xl font-serif font-semibold tracking-tight leading-[1.05] break-words">Commercial Growth.</h3>
              </div>
              <div className="lg:col-span-5 flex items-end">
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-md">
                  Technical solutions engineered to scale with your business while maintaining absolute operational integrity.
                </p>
              </div>
            </div>
            
            <div className="grid lg:grid-cols-3 gap-px bg-slate-200 border border-slate-200">
              {expertise.map((item, index) => (
                <div key={index} className="bg-[var(--page-panel)] p-6 sm:p-8 space-y-4 hover:bg-white/70 transition-colors duration-300 group">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400 group-hover:text-black transition-colors">
                      {item.id}
                    </span>
                    <Plus className="w-4 h-4 text-slate-300 group-hover:rotate-90 group-hover:text-black transition-all duration-300" />
                  </div>
                  <h4 className="text-xl font-semibold tracking-tight leading-snug">{item.title}</h4>
                  <p className="text-base text-slate-600 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Strategic Partners */}
        <section
          id="partners"
          className="border-t border-b border-black/10 section-y px-[var(--page-gutter)] overflow-x-hidden"
        >
          <div className="max-w-[var(--page-max)] mx-auto border border-[#1a1a1a]/20 bg-[var(--page-panel)] p-6 sm:p-10 lg:p-12">
            <div className="grid lg:grid-cols-12 gap-6 lg:gap-12 items-start mb-8 lg:mb-10">
              <div className="lg:col-span-5 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-3">
                  Strategic Partners
                </p>
                <h2 className="font-serif text-3xl sm:text-4xl font-semibold italic leading-snug tracking-tight text-[#1a1a1a]">
                  Credibility through association.
                </h2>
              </div>
              <p className="lg:col-span-7 text-base sm:text-lg text-slate-600 leading-relaxed min-w-0">
                Engagements are delivered in concert with established automation partners — not in isolation.
                This portfolio reflects senior engineering backed by real industry relationships.
              </p>
            </div>

            <motion.article
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="border border-[#1a1a1a] bg-white p-6 sm:p-8"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 mb-4">
                Official partner · Industrial automation
              </p>
              <a
                href={PARTNERS.pfs.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex flex-wrap items-baseline gap-x-2 gap-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1a1a1a]"
              >
                <span className="text-xl sm:text-2xl font-semibold tracking-tight text-[#1a1a1a] group-hover:text-slate-700 transition-colors">
                  {PARTNERS.pfs.name}
                </span>
                <ArrowUpRight
                  className="inline-block size-5 shrink-0 text-[#1a1a1a] opacity-70 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  strokeWidth={1.75}
                  aria-hidden
                />
              </a>
              <p className="mt-4 max-w-2xl text-base text-slate-600 leading-relaxed">
                Strategic partner in industrial automation — jointly delivering factory floor monitoring and PLC
                integration solutions for Philippine manufacturing.
              </p>
            </motion.article>
          </div>
        </section>

        {/* Case Studies Section */}
        <section id="work" className="section-y px-[var(--page-gutter)] bg-[#1a1a1a] text-white rounded-t-[2rem]">
          <div className="max-w-[var(--page-max)] mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 lg:gap-16 mb-10 sm:mb-14">
              <div className="max-w-xl">
                <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300 mb-4">Case Studies</h2>
                <h3 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-semibold italic leading-[1.05] tracking-tight">Proven.</h3>
              </div>
              <p className="text-slate-300 max-w-sm text-sm sm:text-base leading-relaxed border-l border-slate-600 pl-5">
                Enterprise NDA engagements — purchased, production work with client identity withheld. Studio demos live further down.
              </p>
            </div>

            <CaseStudySnippetList />
            <StudioConceptsSection />
            <AppsForEveryoneSection />
          </div>
        </section>

        <FaqSection />

        {/* Contact / book section */}
        <section id="contact" className="overflow-x-hidden bg-[#1a1a1a] text-white section-y px-[var(--page-gutter)]">
          <div className="max-w-[var(--page-max)] mx-auto min-w-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 min-w-0 items-end">
              <div className="min-w-0 lg:col-span-6 space-y-6">
                <h2 className="max-w-full text-4xl sm:text-5xl lg:text-6xl font-serif font-semibold tracking-tight leading-[1.05] break-words">
                  Book a <br />
                  <span className="italic">consultation.</span>
                </h2>
                <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
                  Open the calendar, share what you want to discuss, and leave your email. Exploratory consultation is ₱
                  {SITE.exploratoryConsultationHourlyRatePhp.toLocaleString("en-US")} per hour, settled when you book —
                  then you can create a portal account if you want to follow the work.
                </p>
                <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-xl">
                  The client portal is separate: milestones, quotations, purchase orders, invoices, and remittances once
                  an engagement is underway.
                </p>
              </div>

              <div className="min-w-0 lg:col-span-6">
                <ol className="space-y-5 border-y border-slate-700 py-8">
                  {[
                    { step: "01", title: "Choose a time", body: "Weekdays, Manila time. Morning 9–11 or afternoon 1–4." },
                    {
                      step: "02",
                      title: "Share the brief",
                      body: "What you want to talk about, concerns, and your email — no account required yet.",
                    },
                    {
                      step: "03",
                      title: "Settle the hour",
                      body: `₱${SITE.exploratoryConsultationHourlyRatePhp.toLocaleString("en-US")}/hr via PayMongo. Register for the portal afterwards if you like.`,
                    },
                  ].map((item) => (
                    <li key={item.step} className="flex gap-5 min-w-0">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 shrink-0 pt-1">
                        {item.step}
                      </span>
                      <div className="min-w-0">
                        <p className="font-serif text-2xl font-semibold tracking-tight">{item.title}</p>
                        <p className="mt-1 text-sm sm:text-base text-slate-400 leading-relaxed">{item.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                  <Link
                    to="/book"
                    className="group inline-flex items-center gap-2.5 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#1a1a1a] hover:bg-slate-200 transition-colors"
                  >
                    Open the calendar
                    <ArrowRight className="size-4 shrink-0 group-hover:translate-x-1 transition-transform" aria-hidden />
                  </Link>
                  <Link
                    to="/portal/sign-in"
                    className="text-sm font-medium text-slate-400 underline underline-offset-4 hover:text-white transition-colors"
                  >
                    Client portal sign in
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700/80 bg-[#141414] text-white px-[var(--page-gutter)] pt-10 sm:pt-12 pb-28 md:pb-14">
        <div className="max-w-[var(--page-max)] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-8">
          <div className="lg:col-span-4">
            <span className="block text-2xl font-serif font-semibold italic tracking-tight">{SITE.brand}</span>
            <span className="mt-1 block text-[9px] uppercase tracking-[0.2em] text-slate-400 font-semibold">Independent Engineering</span>
            <p className="mt-4 max-w-xs text-sm text-slate-400 leading-relaxed">
              {SITE.tagline}. Mission-critical software from {SITE.location}.
            </p>
            <p className="mt-3 text-xs text-slate-500 normal-case tracking-normal font-normal">
              {SITE.fullName}
            </p>
          </div>

          <div className="lg:col-span-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 mb-4">Site</p>
            <nav className="flex flex-col gap-2 text-sm font-medium text-slate-300">
              <a href="#expertise" className="hover:text-white transition-colors w-fit">Expertise</a>
              <a href="#work" className="hover:text-white transition-colors w-fit">Case Studies</a>
              <a href="#studio-concepts" className="hover:text-white transition-colors w-fit">Studio concepts</a>
              <a href="#faq" className="hover:text-white transition-colors w-fit">FAQ</a>
              <Link to="/book" className="hover:text-white transition-colors w-fit">Book a consultation</Link>
              <Link to="/portal/sign-in" className="hover:text-white transition-colors w-fit">Client portal</Link>
            </nav>
          </div>

          <div className="lg:col-span-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 mb-4">Contact</p>
            <a href={`mailto:${SITE.email}`} className="block text-sm font-medium text-slate-300 hover:text-white transition-colors break-all">
              {SITE.email}
            </a>
            <p className="mt-2 text-sm text-slate-400">{SITE.location}</p>
            <div className="mt-4 flex items-center gap-6 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              <a href="/privacy.html" className="hover:text-white transition-colors">Privacy</a>
              <a href="/terms.html" className="hover:text-white transition-colors">Terms</a>
            </div>
          </div>
        </div>

        <div className="max-w-[var(--page-max)] mx-auto mt-8 pt-5 border-t border-slate-700/80 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          © {new Date().getFullYear()} {SITE.brand} · {SITE.fullName} · Mandaluyong, PH
        </div>
      </footer>

      <StickyMobileCta hidden={mobileNavOpen} to="/book" label="Book a consultation" />
    </div>
  );
}
