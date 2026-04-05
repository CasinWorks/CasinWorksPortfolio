/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { type FormEvent } from "react";
import { motion } from "motion/react";
import { 
  ArrowRight, 
  Plus,
  ArrowUpRight
} from "lucide-react";
import { PARTNERS, SITE } from "./site";

function handleContactSubmit(e: FormEvent<HTMLFormElement>) {
  e.preventDefault();
  const form = e.currentTarget;
  const data = new FormData(form);
  const name = String(data.get("name") ?? "").trim();
  const organization = String(data.get("organization") ?? "").trim();
  const email = String(data.get("email") ?? "").trim();
  const brief = String(data.get("brief") ?? "").trim();
  if (!email) {
    window.alert("Please enter your email so we can reply.");
    return;
  }
  const subject = encodeURIComponent(
    `Inquiry from ${name || "Website"}${organization ? ` (${organization})` : ""}`
  );
  const body = encodeURIComponent(
    `Name: ${name}\nOrganization: ${organization}\nReply-to: ${email}\n\n---\n\n${brief}`
  );
  window.location.href = `mailto:${SITE.email}?subject=${subject}&body=${body}`;
}

export default function App() {
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

  const caseStudies = [
    {
      sector: "Energy & Utilities",
      title: "Grid Stability & Monitoring",
      outcome: "Implemented a distributed monitoring system for a regional utility, enabling automated fault detection and reducing manual inspection cycles by 40%."
    },
    {
      sector: "Automotive Manufacturing",
      title: "Throughput Optimization",
      outcome: "Developed a real-time factory floor monitoring suite for a parts manufacturer, identifying critical bottlenecks and increasing daily output by 18%."
    },
    {
      sector: "Professional Services",
      title: "Administrative Workflow Suite",
      outcome: "Engineered a secure, high-volume document processing and management system for a residential community association, automating 90% of recurring billing tasks."
    }
  ];

  return (
    <div id="top" className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-[#fcfcf9] text-[#1a1a1a] font-sans selection:bg-black selection:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 mix-blend-difference text-white">
        <div className="max-w-[1800px] mx-auto px-8 lg:px-16 min-h-32 py-6 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <a href="#top" className="flex flex-col leading-none w-fit hover:opacity-80 transition-opacity" aria-label="C. J. Casin — top of page">
            <span className="text-3xl font-serif font-bold tracking-tighter italic">C. J. Casin</span>
            <span className="text-[8px] uppercase tracking-[0.5em] opacity-50 font-black">Independent Engineering</span>
          </a>
          <div className="flex flex-wrap items-center gap-x-10 gap-y-3 sm:gap-x-12 md:gap-16 text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em]">
            <a href="#expertise" className="hover:opacity-50 transition-opacity">Expertise</a>
            <a href="#approach" className="hover:opacity-50 transition-opacity">Approach</a>
            <a href="#partners" className="hover:opacity-50 transition-opacity">Partners</a>
            <a href="#work" className="hover:opacity-50 transition-opacity">Case Studies</a>
            <a href="#contact" className="bg-white text-black px-6 py-3 md:px-8 rounded-full hover:bg-slate-200 transition-all font-bold">Consultation</a>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="pt-64 pb-32 lg:pt-80 lg:pb-80 px-8 lg:px-16 overflow-x-hidden overflow-y-visible">
          <div className="max-w-[1800px] mx-auto relative overflow-x-hidden">
            <motion.div 
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mb-24 flex items-center gap-8 text-[10px] font-black uppercase tracking-[0.6em] text-slate-400">
                <div className="w-24 h-[1px] bg-slate-200" />
                Mandaluyong, Philippines
              </div>
              
              <div className="relative">
                <h1 className="max-w-full text-[min(12vw,4.5rem)] sm:text-[min(12vw,8rem)] lg:text-[min(14vw,11rem)] font-serif font-bold tracking-tighter leading-[0.75] mb-32 break-words">
                  High-Stakes <br />
                  <span className="italic text-slate-200 ml-[max(0.5rem,6vw)] sm:ml-[10vw] block">Engineering.</span>
                </h1>
                
                <div className="grid lg:grid-cols-12 gap-24 items-start">
                  <div className="lg:col-span-5 lg:col-start-2">
                    <p className="text-3xl lg:text-5xl text-slate-600 leading-[1] font-medium tracking-tight">
                      Independent software architecture for enterprises that require mission-critical reliability and senior-level accountability.
                    </p>
                  </div>
                  <div className="lg:col-span-4 lg:col-start-9 flex justify-start lg:justify-end">
                    <a 
                      href="#contact" 
                      className="group flex flex-col gap-8 text-2xl font-bold"
                    >
                      <div className="w-24 h-24 rounded-full border-2 border-black flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all duration-500">
                        <ArrowRight className="w-10 h-10 group-hover:translate-x-2 transition-transform" />
                      </div>
                      <span className="border-b-2 border-black pb-2">Start a Consultation</span>
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
            
            {/* Background Accent — sized so it cannot extend past the viewport */}
            <div
              className="absolute -top-32 right-0 sm:-top-48 sm:-right-8 md:-right-16 translate-x-[20%] text-[min(40vw,28rem)] sm:text-[min(35vw,24rem)] font-serif font-black italic text-slate-50 pointer-events-none -z-10 select-none opacity-50 whitespace-nowrap"
              aria-hidden
            >
              CJC
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
                Detailed technical documentation and references are available upon request for qualified inquiries.
              </p>
            </div>
            
            <div className="divide-y divide-slate-800">
              {caseStudies.map((study, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1 }}
                  className="py-32 grid lg:grid-cols-12 gap-24 items-start group cursor-default"
                >
                  <div className="lg:col-span-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">{study.sector}</span>
                  </div>
                  <div className="lg:col-span-4">
                    <h4 className="text-5xl font-serif font-bold group-hover:text-slate-300 transition-colors leading-[0.9] tracking-tighter">{study.title}</h4>
                  </div>
                  <div className="lg:col-span-5">
                    <p className="text-slate-400 leading-tight text-3xl tracking-tight">{study.outcome}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="scroll-mt-36 py-64 px-8 lg:px-16 bg-white">
          <div className="max-w-[1800px] mx-auto">
            <div className="grid lg:grid-cols-12 gap-48">
              <div className="lg:col-span-5 space-y-24">
                <h2 className="max-w-full text-[min(10vw,3.75rem)] sm:text-[min(10vw,6rem)] lg:text-[min(10vw,8rem)] font-serif font-bold tracking-tighter leading-[0.75] break-words">
                  Start <br />
                  <span className="italic text-slate-200">Inquiry.</span>
                </h2>
                <p className="text-3xl text-slate-500 leading-tight tracking-tight">
                  I am currently accepting inquiries for high-stakes software contracts. Let's discuss how my expertise can drive efficiency in your operations.
                </p>
                <div className="space-y-16 pt-16">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-400 mb-6">Direct Correspondence</span>
                    <a href={`mailto:${SITE.email}`} className="group flex items-center gap-4 text-4xl font-bold hover:opacity-50 transition-opacity tracking-tighter break-all">
                      {SITE.email}
                      <ArrowUpRight className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7">
                <form className="space-y-32" onSubmit={handleContactSubmit}>
                  <div className="grid md:grid-cols-2 gap-32">
                    <div className="space-y-8">
                      <label htmlFor="inquiry-name" className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-400">Name</label>
                      <input 
                        id="inquiry-name"
                        name="name"
                        type="text" 
                        autoComplete="name"
                        className="w-full bg-transparent border-b-2 border-slate-100 py-8 focus:outline-none focus:border-black transition-colors text-3xl font-medium tracking-tight"
                        placeholder="Full Name"
                      />
                    </div>
                    <div className="space-y-8">
                      <label htmlFor="inquiry-org" className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-400">Organization</label>
                      <input 
                        id="inquiry-org"
                        name="organization"
                        type="text" 
                        autoComplete="organization"
                        className="w-full bg-transparent border-b-2 border-slate-100 py-8 focus:outline-none focus:border-black transition-colors text-3xl font-medium tracking-tight"
                        placeholder="Company Name"
                      />
                    </div>
                  </div>
                  <div className="space-y-8">
                    <label htmlFor="inquiry-email" className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-400">Email</label>
                    <input 
                      id="inquiry-email"
                      name="email"
                      type="email" 
                      required
                      autoComplete="email"
                      className="w-full bg-transparent border-b-2 border-slate-100 py-8 focus:outline-none focus:border-black transition-colors text-3xl font-medium tracking-tight"
                      placeholder="email@organization.com"
                    />
                  </div>
                  <div className="space-y-8">
                    <label htmlFor="inquiry-brief" className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-400">Brief</label>
                    <textarea 
                      id="inquiry-brief"
                      name="brief"
                      rows={4}
                      className="w-full bg-transparent border-b-2 border-slate-100 py-8 focus:outline-none focus:border-black transition-colors text-3xl font-medium resize-y min-h-[8rem] tracking-tight"
                      placeholder="Project scope and objectives"
                    />
                  </div>
                  <button type="submit" className="group flex items-center gap-12 text-5xl font-bold border-b-8 border-black pb-8 hover:border-slate-200 transition-all duration-500">
                    Submit Inquiry
                    <ArrowRight className="w-16 h-16 group-hover:translate-x-8 transition-transform duration-500" />
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
