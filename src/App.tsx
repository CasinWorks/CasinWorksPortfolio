/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { 
  ArrowRight, 
  Plus,
  ArrowUpRight,
  Menu,
  X
} from "lucide-react";
import { CASE_STUDIES, PARTNERS, SITE } from "./site";

export default function App() {
  const navLinks = useMemo(
    () => [
      { href: "#expertise", label: "Expertise" },
      { href: "#approach", label: "Approach" },
      { href: "#partners", label: "Partners" },
      { href: "#work", label: "Case Studies" },
    ],
    []
  );

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

  const caseStudies = CASE_STUDIES;

  const [inquiryStatus, setInquiryStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [inquiryError, setInquiryError] = useState<string>("");

  async function handleInquirySubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get("name") ?? "").trim(),
      organization: String(data.get("organization") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      brief: String(data.get("brief") ?? "").trim(),
      page: window.location.href,
      submittedAt: new Date().toISOString(),
    };

    if (!payload.email) {
      window.alert("Please enter your email so we can reply.");
      return;
    }

    try {
      setInquiryError("");
      setInquiryStatus("sending");

      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed (${res.status})`);
      }

      setInquiryStatus("sent");
      form.reset();
    } catch (err) {
      setInquiryStatus("error");
      setInquiryError(err instanceof Error ? err.message : "Failed to send inquiry.");
    }
  }

  return (
    <div id="top" className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-[#fcfcf9] text-[#1a1a1a] font-sans selection:bg-black selection:text-white">
      {/* Navigation */}
      <nav
        className={`fixed top-0 w-full z-50 ${
          mobileNavOpen ? "mix-blend-normal bg-[#fcfcf9] text-[#1a1a1a]" : "mix-blend-difference text-white"
        }`}
      >
        <div className="max-w-[1800px] mx-auto px-6 sm:px-8 lg:px-16 min-h-24 md:min-h-32 py-6 flex items-center justify-between gap-6">
          <a href="#top" className="flex flex-col leading-none w-fit hover:opacity-80 transition-opacity" aria-label="C. J. Casin — top of page">
            <span className="text-3xl font-serif font-bold tracking-tighter italic">C. J. Casin</span>
            <span className="text-[8px] uppercase tracking-[0.5em] opacity-50 font-black">Independent Engineering</span>
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex flex-wrap items-center gap-x-10 gap-y-3 lg:gap-x-12 xl:gap-16 text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em]">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="hover:opacity-50 transition-opacity">
                {l.label}
              </a>
            ))}
            <a
              href="#contact"
              className="bg-white text-black px-6 py-3 md:px-8 rounded-full hover:bg-slate-200 transition-all font-bold"
            >
              Consultation
            </a>
          </div>

          {/* Mobile burger */}
          <button
            type="button"
            className={`md:hidden inline-flex items-center justify-center rounded-full border px-4 py-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 ${
              mobileNavOpen
                ? "border-black/15 bg-black/5 hover:bg-black/10 focus-visible:outline-black"
                : "border-white/25 bg-white/10 hover:bg-white/15 backdrop-blur focus-visible:outline-white"
            }`}
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
          className="absolute inset-x-0 top-0 bg-[#fcfcf9] text-[#1a1a1a] pt-28 sm:pt-32 pb-10"
        >
          <div className="max-w-[1800px] mx-auto px-6 sm:px-8 lg:px-16">
            <div className="rounded-3xl border border-black/10 bg-white px-6 py-8 shadow-[0_20px_80px_rgba(0,0,0,0.12)]">
              <div className="flex flex-col gap-6 text-[10px] font-black uppercase tracking-[0.4em]">
                {navLinks.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    className="hover:opacity-60 transition-opacity"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    {l.label}
                  </a>
                ))}
                <a
                  href="#contact"
                  className="mt-2 bg-black text-white px-6 py-3 rounded-full hover:bg-slate-800 transition-all font-bold w-fit"
                  onClick={() => setMobileNavOpen(false)}
                >
                  Consultation
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <main>
        {/* Hero Section */}
        <section className="relative px-6 sm:px-8 lg:px-16 pt-48 pb-20 sm:pt-56 sm:pb-24 lg:pt-64 lg:pb-28 xl:pt-52 xl:pb-20 overflow-x-hidden overflow-y-visible">
          <div className="max-w-[1800px] mx-auto relative min-w-0">
            <motion.div 
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mb-16 sm:mb-20 lg:mb-24 flex items-center gap-8 text-[10px] font-black uppercase tracking-[0.6em] text-slate-400">
                <div className="w-24 h-[1px] bg-slate-200 shrink-0" />
                Mandaluyong, Philippines
              </div>
              
              <div className="relative z-0 min-w-0 max-w-full">
                <h1 className="max-w-full min-w-0 text-[min(11vw,4rem)] sm:text-[min(11vw,7rem)] lg:text-[min(12vw,10rem)] font-serif font-bold tracking-tighter leading-[0.8] mb-16 sm:mb-20 lg:mb-24 break-words [overflow-wrap:anywhere]">
                  High-Stakes <br />
                  <span className="italic text-slate-200 block ps-[clamp(0.5rem,8vw,10rem)] max-w-[100%]">
                    Engineering.
                  </span>
                </h1>

                <p className="mb-12 sm:mb-14 lg:mb-16 max-w-full font-serif text-2xl sm:text-3xl lg:text-[2.125rem] font-medium italic leading-snug tracking-tight text-[#1a1a1a]">
                  {SITE.tagline}
                </p>
                
                <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 xl:gap-20 items-start min-w-0">
                  <div className="min-w-0 lg:col-span-5 lg:col-start-2">
                    <p className="text-2xl sm:text-3xl lg:text-5xl text-slate-600 leading-[1.05] font-medium tracking-tight">
                      Independent software architecture for enterprises that require mission-critical reliability and senior-level accountability.
                    </p>
                  </div>
                  <div className="min-w-0 lg:col-span-4 lg:col-start-9 flex justify-start lg:justify-end">
                    <a 
                      href="#contact" 
                      className="group flex flex-col gap-6 sm:gap-8 text-xl sm:text-2xl font-bold max-w-full"
                    >
                      <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-full border-2 border-black flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all duration-500">
                        <ArrowRight className="w-8 h-8 sm:w-10 sm:h-10 group-hover:translate-x-2 transition-transform" />
                      </div>
                      <span className="border-b-2 border-black pb-2">Start a Consultation</span>
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
            
            {/* Background accent — clipped to hero width so it never widens the page */}
            <div
              className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-[min(100%,52rem)] max-w-[100vw] overflow-hidden"
              aria-hidden
            >
              <div className="absolute -top-24 right-0 sm:-top-32 translate-x-[8%] sm:translate-x-[12%] text-[min(34vw,18rem)] sm:text-[min(32vw,22rem)] lg:text-[min(28vw,26rem)] font-serif font-black italic text-slate-50 select-none opacity-50 whitespace-nowrap">
                CJC
              </div>
            </div>
          </div>
        </section>

        {/* Philosophy Section */}
        <section id="approach" className="scroll-mt-36 py-64 px-6 sm:px-8 lg:px-16 bg-white overflow-x-hidden">
          <div className="max-w-[1800px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-12 xl:gap-20 2xl:gap-24">
            <div className="min-w-0 lg:col-span-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-400 mb-16">The Philosophy</h2>
              <h3 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-serif font-bold leading-[0.85] italic mb-16 max-w-[100%]">
                Direct. <br />
                Resilient. <br />
                Senior.
              </h3>
            </div>
            <div className="min-w-0 lg:col-span-8 lg:col-start-5 xl:col-span-7 xl:col-start-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-16 sm:gap-x-8 md:gap-x-10 lg:gap-x-8 xl:gap-x-12 2xl:gap-x-16 min-w-0">
                <div className="min-w-0 space-y-12">
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="shrink-0 text-4xl sm:text-5xl font-serif italic text-slate-200 tracking-tighter">01</span>
                    <div className="h-px min-w-0 flex-1 bg-slate-100" />
                  </div>
                  <h4 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">Accountability</h4>
                  <p className="text-lg sm:text-xl lg:text-2xl text-slate-500 leading-snug tracking-tight break-words hyphens-auto">
                    You work directly with the engineer. No account managers, no middle-men. This ensures technical decisions are always aligned with your business objectives.
                  </p>
                </div>
                <div className="min-w-0 space-y-12">
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="shrink-0 text-4xl sm:text-5xl font-serif italic text-slate-200 tracking-tighter">02</span>
                    <div className="h-px min-w-0 flex-1 bg-slate-100" />
                  </div>
                  <h4 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">Reliability</h4>
                  <p className="text-lg sm:text-xl lg:text-2xl text-slate-500 leading-snug tracking-tight break-words hyphens-auto">
                    My background in industrial software means I build for the long term. I specialize in systems that must remain operational 24/7.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Expertise Section */}
        <section id="expertise" className="scroll-mt-36 py-64 px-8 lg:px-16">
          <div className="max-w-[1800px] mx-auto">
            <div className="mb-48 grid lg:grid-cols-12 gap-12">
              <div className="lg:col-span-8">
                <h2 className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-400 mb-16">Core Expertise</h2>
                <h3 className="max-w-full text-[min(8vw,5rem)] sm:text-[min(8vw,7rem)] md:text-[min(8vw,9rem)] font-serif font-bold tracking-tighter leading-[0.8] break-words">Commercial <br />Growth.</h3>
              </div>
              <div className="lg:col-span-4 flex items-end">
                <p className="text-xl text-slate-500 leading-relaxed max-w-sm">
                  Technical solutions engineered to scale with your business while maintaining absolute operational integrity.
                </p>
              </div>
            </div>
            
            <div className="grid lg:grid-cols-3 gap-px bg-slate-200">
              {expertise.map((item, index) => (
                <div key={index} className="bg-[#fcfcf9] py-32 pr-16 space-y-16 hover:bg-white transition-all duration-700 group">
                  <div className="flex items-center justify-between">
                    <span className="text-6xl font-serif italic text-slate-200 group-hover:text-black transition-colors duration-700">
                      {item.id}
                    </span>
                    <Plus className="w-8 h-8 text-slate-200 group-hover:rotate-90 group-hover:text-black transition-all duration-700" />
                  </div>
                  <h4 className="text-4xl font-bold tracking-tight leading-none">{item.title}</h4>
                  <p className="text-2xl text-slate-500 leading-tight tracking-tight">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Strategic Partners */}
        <section
          id="partners"
          className="scroll-mt-36 border-t border-b border-slate-200/90 bg-[#f4f2ec] py-48 px-6 sm:px-8 lg:px-16 overflow-x-hidden"
        >
          <div className="max-w-[1800px] mx-auto">
            <div className="grid lg:grid-cols-12 gap-16 lg:gap-20 items-start mb-20 lg:mb-24">
              <div className="lg:col-span-5 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-500 mb-8">
                  Strategic Partners
                </p>
                <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold italic leading-[1.05] tracking-tight text-[#1a1a1a]">
                  Credibility through association.
                </h2>
              </div>
              <p className="lg:col-span-6 lg:col-start-7 text-lg sm:text-xl text-slate-600 leading-relaxed min-w-0">
                Engagements are delivered in concert with established automation partners — not in isolation.
                This portfolio reflects senior engineering backed by real industry relationships.
              </p>
            </div>

            <motion.article
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="relative mx-auto max-w-5xl"
            >
              {/* Bordered lockup: double rule + inset partner badge */}
              <div className="relative border-2 border-[#1a1a1a] bg-[#fcfcf9] px-8 py-12 sm:px-12 sm:py-16 lg:px-16 lg:py-20 shadow-[8px_8px_0_0_rgba(26,26,26,0.06)]">
                <div
                  className="absolute -top-px left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#f4f2ec] px-6 sm:px-10"
                  aria-hidden
                >
                  <span className="block text-[9px] sm:text-[10px] font-black uppercase tracking-[0.55em] text-[#1a1a1a] whitespace-nowrap">
                    Official partner
                  </span>
                </div>

                <div className="mb-10 flex items-center gap-4 sm:gap-6">
                  <span className="h-px flex-1 bg-[#1a1a1a]/25" aria-hidden />
                  <span className="shrink-0 font-serif text-xs sm:text-sm italic text-slate-500 tracking-wide">
                    Industrial automation
                  </span>
                  <span className="h-px flex-1 bg-[#1a1a1a]/25" aria-hidden />
                </div>

                <a
                  href={PARTNERS.pfs.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1a1a1a]"
                >
                  <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-serif text-2xl sm:text-3xl lg:text-[2.125rem] font-bold not-italic tracking-tight text-[#1a1a1a] transition-colors duration-300 group-hover:text-slate-700">
                      {PARTNERS.pfs.name}
                    </span>
                    <ArrowUpRight
                      className="inline-block size-7 sm:size-8 shrink-0 text-[#1a1a1a] opacity-70 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-0.5"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                  </span>
                  <span className="mt-4 block h-0.5 max-w-0 bg-[#1a1a1a] transition-all duration-500 ease-out group-hover:max-w-full" />
                </a>

                <p className="mt-10 max-w-2xl text-base sm:text-lg lg:text-xl leading-relaxed text-slate-600 tracking-tight">
                  Strategic partner in industrial automation — jointly delivering factory floor monitoring and PLC
                  integration solutions for Philippine manufacturing.
                </p>
              </div>
            </motion.article>
          </div>
        </section>

        {/* Case Studies Section */}
        <section id="work" className="scroll-mt-36 py-64 px-8 lg:px-16 bg-[#1a1a1a] text-white rounded-t-[5rem]">
          <div className="max-w-[1800px] mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-32 mb-48">
              <div className="max-w-4xl">
                <h2 className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-500 mb-16">Case Studies</h2>
                <h3 className="max-w-full text-[min(8vw,5rem)] sm:text-[min(8vw,7rem)] md:text-[min(8vw,9rem)] font-serif font-bold italic leading-[0.8] break-words">Proven.</h3>
              </div>
              <p className="text-slate-500 max-w-xs text-[10px] font-black uppercase tracking-[0.4em] leading-loose border-l border-slate-800 pl-8">
                Two shipped financial products. Built from real operational pain points, with clear workflows and room to scale.
              </p>
            </div>
            
            <motion.aside
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="mb-24 rounded-[2.5rem] border border-slate-800 bg-[#111111] p-10 sm:p-12"
            >
              <div className="grid lg:grid-cols-12 gap-10 items-start">
                <div className="lg:col-span-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-500">
                    Confidential work (NDA)
                  </p>
                  <p className="mt-6 text-2xl sm:text-3xl font-serif font-bold tracking-tight leading-tight">
                    Additional shipped systems are confidential at client request.
                  </p>
                </div>
                <div className="lg:col-span-8">
                  <p className="text-lg sm:text-xl text-slate-400 leading-snug tracking-tight">
                    I’ve delivered production software for major{" "}
                    <span className="text-slate-200 font-semibold">automotive</span> and{" "}
                    <span className="text-slate-200 font-semibold">semiconductor</span> manufacturers.
                    Names, screenshots, and internal metrics are withheld for privacy — details are available for qualified inquiries.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    {[
                      "Factory monitoring & visibility",
                      "Operational dashboards",
                      "Reliability & uptime hardening",
                      "Process traceability",
                      "Workflow automation",
                    ].map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center rounded-full border border-slate-700 bg-black/25 px-4 py-2 text-[10px] font-black uppercase tracking-[0.35em] text-slate-400"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.aside>

            <div className="grid gap-24">
              {caseStudies.map((study) => (
                <motion.article
                  key={study.id}
                  id={`case-${study.id}`}
                  initial={{ opacity: 0, y: 36 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                  className="rounded-[2.5rem] border border-slate-800 bg-[#141414] p-10 sm:p-14 lg:p-16 shadow-[0_40px_120px_rgba(0,0,0,0.35)]"
                >
                  <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
                    <div className="lg:col-span-5">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                        <span className="inline-flex items-center rounded-full border border-slate-700 bg-black/25 px-4 py-2 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
                          {study.sector}
                        </span>
                        <a
                          href={study.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group inline-flex items-center gap-3 rounded-full bg-white text-black px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.35em] hover:bg-slate-200 transition-colors"
                        >
                          Live demo
                          <ArrowUpRight className="size-4 opacity-70 group-hover:opacity-100" aria-hidden />
                        </a>
                      </div>

                      <h4 className="mt-10 text-5xl sm:text-6xl font-serif font-bold leading-[0.9] tracking-tighter">
                        {study.title}
                      </h4>
                      <p className="mt-8 text-xl sm:text-2xl text-slate-400 leading-snug tracking-tight">
                        {study.subtitle}
                      </p>

                      <div className="mt-10 rounded-3xl border border-slate-800 bg-black/25 p-8">
                        <p className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-500">
                          Primary outcome
                        </p>
                        <p className="mt-6 text-2xl sm:text-3xl text-slate-200 leading-tight tracking-tight">
                          {study.primaryOutcome}
                        </p>
                      </div>
                    </div>

                    <div className="lg:col-span-7">
                      <div className="grid sm:grid-cols-2 gap-10">
                        <div className="space-y-6">
                          <p className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-500">
                            The problem
                          </p>
                          <ul className="space-y-4 text-lg sm:text-xl text-slate-400 leading-snug tracking-tight">
                            {study.problem.map((p) => (
                              <li key={p} className="flex gap-4">
                                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-500 shrink-0" aria-hidden />
                                <span>{p}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-6">
                          <p className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-500">
                            The solution
                          </p>
                          <ul className="space-y-4 text-lg sm:text-xl text-slate-400 leading-snug tracking-tight">
                            {study.solution.map((s) => (
                              <li key={s} className="flex gap-4">
                                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-500 shrink-0" aria-hidden />
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="mt-12 grid lg:grid-cols-3 gap-10">
                        <div className="space-y-6">
                          <p className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-500">
                            Key features
                          </p>
                          <ul className="space-y-3 text-base sm:text-lg text-slate-400 leading-snug">
                            {study.keyFeatures.map((f) => (
                              <li key={f} className="flex gap-3">
                                <span className="mt-2 h-1 w-1 rounded-full bg-slate-600 shrink-0" aria-hidden />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="space-y-6">
                          <p className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-500">
                            Feasibility
                          </p>
                          <ul className="space-y-3 text-base sm:text-lg text-slate-400 leading-snug">
                            {study.feasibility.map((f) => (
                              <li key={f} className="flex gap-3">
                                <span className="mt-2 h-1 w-1 rounded-full bg-slate-600 shrink-0" aria-hidden />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="space-y-6">
                          <p className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-500">
                            Next steps
                          </p>
                          <ul className="space-y-3 text-base sm:text-lg text-slate-400 leading-snug">
                            {study.roadmap.map((r) => (
                              <li key={r} className="flex gap-3">
                                <span className="mt-2 h-1 w-1 rounded-full bg-slate-600 shrink-0" aria-hidden />
                                <span>{r}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="mt-14 flex flex-wrap items-center gap-6">
                        <a
                          href="#contact"
                          className="group inline-flex items-center gap-4 rounded-full border border-white/15 bg-white/10 px-8 py-4 text-[10px] font-black uppercase tracking-[0.4em] hover:bg-white/15 transition-colors"
                        >
                          Build something similar
                          <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" aria-hidden />
                        </a>
                        <a
                          href={study.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 hover:text-white transition-colors"
                        >
                          View live demo <ArrowUpRight className="size-5" aria-hidden />
                        </a>
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="scroll-mt-36 overflow-x-hidden bg-white py-24 sm:py-40 lg:py-64 px-6 sm:px-8 lg:px-16">
          <div className="max-w-[1800px] mx-auto min-w-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-12 xl:gap-20 min-w-0">
              <div className="min-w-0 lg:col-span-5 space-y-12 sm:space-y-16 lg:space-y-24">
                <h2 className="max-w-full text-[min(10vw,3.25rem)] sm:text-[min(10vw,5rem)] lg:text-[min(10vw,7rem)] font-serif font-bold tracking-tighter leading-[0.75] break-words">
                  Start <br />
                  <span className="italic text-slate-200">Inquiry.</span>
                </h2>
                <p className="text-xl sm:text-2xl lg:text-3xl text-slate-500 leading-snug tracking-tight">
                  I am currently accepting inquiries for high-stakes software contracts. Let's discuss how my expertise can drive efficiency in your operations.
                </p>
                <div className="space-y-16 pt-8 lg:pt-16">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-400 mb-6">Direct Correspondence</span>
                    <a href={`mailto:${SITE.email}`} className="group flex flex-wrap items-center gap-4 text-2xl sm:text-3xl lg:text-4xl font-bold hover:opacity-50 transition-opacity tracking-tighter break-all">
                      {SITE.email}
                      <ArrowUpRight className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="min-w-0 lg:col-span-7">
                <form className="space-y-12 sm:space-y-16 lg:space-y-24 min-w-0" onSubmit={handleInquirySubmit}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-12 sm:gap-x-8 lg:gap-x-10 min-w-0">
                    <div className="min-w-0 space-y-4 sm:space-y-8">
                      <label htmlFor="inquiry-name" className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-400">Name</label>
                      <input 
                        id="inquiry-name"
                        name="name"
                        type="text" 
                        autoComplete="name"
                        className="w-full min-w-0 max-w-full bg-transparent border-b-2 border-slate-100 py-4 sm:py-6 lg:py-8 focus:outline-none focus:border-black transition-colors text-xl sm:text-2xl lg:text-3xl font-medium tracking-tight"
                        placeholder="Full Name"
                        disabled={inquiryStatus === "sending"}
                      />
                    </div>
                    <div className="min-w-0 space-y-4 sm:space-y-8">
                      <label htmlFor="inquiry-org" className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-400">Organization</label>
                      <input 
                        id="inquiry-org"
                        name="organization"
                        type="text" 
                        autoComplete="organization"
                        className="w-full min-w-0 max-w-full bg-transparent border-b-2 border-slate-100 py-4 sm:py-6 lg:py-8 focus:outline-none focus:border-black transition-colors text-xl sm:text-2xl lg:text-3xl font-medium tracking-tight"
                        placeholder="Company Name"
                        disabled={inquiryStatus === "sending"}
                      />
                    </div>
                  </div>
                  <div className="space-y-4 sm:space-y-8 min-w-0">
                    <label htmlFor="inquiry-email" className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-400">Email</label>
                    <input 
                      id="inquiry-email"
                      name="email"
                      type="email" 
                      required
                      autoComplete="email"
                      className="w-full min-w-0 max-w-full bg-transparent border-b-2 border-slate-100 py-4 sm:py-6 lg:py-8 focus:outline-none focus:border-black transition-colors text-xl sm:text-2xl lg:text-3xl font-medium tracking-tight"
                      placeholder="email@organization.com"
                      disabled={inquiryStatus === "sending"}
                    />
                  </div>
                  <div className="space-y-4 sm:space-y-8 min-w-0">
                    <label htmlFor="inquiry-brief" className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-400">Brief</label>
                    <textarea 
                      id="inquiry-brief"
                      name="brief"
                      rows={4}
                      className="w-full min-w-0 max-w-full box-border bg-transparent border-b-2 border-slate-100 py-4 sm:py-6 lg:py-8 focus:outline-none focus:border-black transition-colors text-xl sm:text-2xl lg:text-3xl font-medium resize-y min-h-[7rem] sm:min-h-[8rem] tracking-tight"
                      placeholder="Project scope and objectives"
                      disabled={inquiryStatus === "sending"}
                    />
                  </div>

                  {inquiryStatus === "sent" && (
                    <p className="text-base sm:text-lg text-slate-600">
                      Sent. I’ll get back to you shortly.
                    </p>
                  )}
                  {inquiryStatus === "error" && (
                    <p className="text-base sm:text-lg text-red-600">
                      Couldn’t send your inquiry{inquiryError ? `: ${inquiryError}` : "."}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={inquiryStatus === "sending"}
                    className="group flex flex-wrap items-center gap-6 sm:gap-10 lg:gap-12 text-3xl sm:text-4xl lg:text-5xl font-bold border-b-[6px] sm:border-b-8 border-black pb-6 sm:pb-8 hover:border-slate-200 transition-all duration-500 w-full sm:w-auto justify-start disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {inquiryStatus === "sending" ? "Sending…" : "Submit Inquiry"}
                    <ArrowRight className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 shrink-0 group-hover:translate-x-4 sm:group-hover:translate-x-8 transition-transform duration-500" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-48 px-8 lg:px-16 border-t border-slate-200 bg-white">
        <div className="max-w-[1800px] mx-auto flex flex-col md:flex-row items-center justify-between gap-24">
          <div className="flex flex-col">
            <span className="text-3xl font-serif font-bold italic tracking-tighter">C. J. Casin</span>
            <span className="text-[9px] uppercase tracking-[0.6em] text-slate-400 font-black">Independent Engineering</span>
          </div>
          <div className="flex items-center gap-24 text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">
            <a href="/privacy.html" className="hover:text-black transition-colors">Privacy</a>
            <a href="/terms.html" className="hover:text-black transition-colors">Terms</a>
          </div>
          <div className="text-slate-400 text-[10px] font-black uppercase tracking-[0.6em]">
            © {new Date().getFullYear()} Mandaluyong, PH.
          </div>
        </div>
      </footer>
    </div>
  );
}
