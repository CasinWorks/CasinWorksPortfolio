/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  ExternalLink,
  Check,
  Copy,
  Info,
  Palette,
  X,
  Shield,
  MapPin,
  Bookmark
} from "lucide-react";
import { APPS_DATA, DESIGN_COLORS, DESIGN_TYPOGRAPHY, GENERAL_SPECS } from "./data";
import { AppItem } from "./types";

export default function App() {
  // UI Interactive States
  const [activeTab, setActiveTab] = useState<"apps" | "design">("apps");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Modals
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);
  const [selectedApp, setSelectedApp] = useState<AppItem | null>(null);

  // Copy value helper
  const triggerCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div id="casin-works-root" className="min-h-screen bg-[#F5F3EE] text-[#0D0D0B] font-sans relative selection:bg-brand-teal/10 selection:text-brand-teal">
      
      <div className="min-h-screen bg-brand-cream text-brand-dark flex flex-col justify-between">
        {/* Top Navigation */}
        <header className="border-b border-brand-dark/10 py-5 px-4 md:px-8 bg-brand-cream/95 backdrop-blur-sm sticky top-0 z-30">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            {/* Brand Logo */}
            <div className="flex items-center gap-4">
              <span className="font-serif text-xl font-medium tracking-tight">
                CASIN WORKS <span className="font-light text-brand-teal/60">/</span>
              </span>
              <span className="text-[9px] uppercase tracking-[0.25em] text-brand-teal/80 font-bold bg-brand-teal/5 border border-brand-teal/10 px-2 py-0.5 rounded-sm">
                APPS FOR EVERYONE
              </span>
            </div>

            {/* Nav Actions */}
            <div className="flex items-center gap-4 md:gap-8">
              <div className="flex items-center gap-5 sm:gap-7">
                <button
                  onClick={() => {
                    setActiveTab("apps");
                  }}
                  className={`text-xs uppercase tracking-[0.16em] font-medium transition-colors cursor-pointer relative py-1 ${
                    activeTab === "apps" ? "text-brand-dark font-semibold" : "text-brand-teal/60 hover:text-brand-dark"
                  }`}
                >
                  <span>Apps</span>
                  {activeTab === "apps" && (
                    <motion.div layoutId="navIndicator" className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-brand-dark" />
                  )}
                </button>
                <button
                  onClick={() => setShowAboutModal(true)}
                  className="text-xs uppercase tracking-[0.16em] font-medium text-brand-teal/60 hover:text-brand-dark transition-colors cursor-pointer py-1"
                >
                  About
                </button>
                <Link
                  to="/"
                  className="text-xs uppercase tracking-[0.16em] font-bold text-brand-dark hover:text-brand-teal transition-colors cursor-pointer py-1 flex items-center gap-1 group/site"
                >
                  <span>CasinWorks.com</span>
                  <ExternalLink className="w-3 h-3 text-brand-teal group-hover/site:translate-x-0.5 group-hover/site:-translate-y-0.5 transition-transform" />
                </Link>
                <button
                  onClick={() => {
                    setActiveTab("design");
                  }}
                  className={`text-xs uppercase tracking-[0.16em] font-medium transition-colors cursor-pointer py-1 flex items-center gap-1.5 ${
                    activeTab === "design" ? "text-brand-dark font-semibold" : "text-brand-teal/60 hover:text-brand-dark"
                  }`}
                >
                  <Palette className="w-3 h-3 text-brand-teal/60" />
                  <span className="hidden sm:inline">Brand System</span>
                  <span className="inline sm:hidden">Design</span>
                  {activeTab === "design" && (
                    <motion.div layoutId="navIndicator" className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-brand-dark" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* MAIN CONTENT AREA */}
            <main className="flex-grow">
              <AnimatePresence mode="wait">
                {activeTab === "apps" ? (
                  /* Standard Live Application Hub Grid View */
                  <motion.div
                    key="apps-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4 }}
                    className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-16 relative"
                  >
                    {/* Hero Section */}
                    <div className="mb-12 md:mb-18 relative z-10 max-w-4xl">
                      <div className="absolute right-0 top-0 opacity-15 pointer-events-none select-none -translate-y-8 z-0">
                        <span className="text-[12vw] font-serif italic font-light text-brand-lavender leading-none">
                          Built for you.
                        </span>
                      </div>

                      {/* Location Badge */}
                      <div className="flex items-center gap-2 mb-4 text-[10px] font-bold uppercase tracking-[0.25em] text-brand-teal">
                        <MapPin className="w-3 h-3 text-brand-teal" />
                        <span>Mandaluyong, Philippines — Free Tools</span>
                      </div>

                      {/* Title */}
                      <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl leading-[0.98] font-light tracking-tight text-brand-dark">
                        Apps For <br />
                        <span className="font-serif italic font-light text-brand-teal">Everyone.</span>
                      </h1>

                      {/* Subtitle */}
                      <p className="mt-6 text-sm md:text-md text-brand-teal/85 leading-relaxed font-sans max-w-xl">
                        Independent software, built for Filipinos — from free consumer tools to subscription business apps, with clean, practical UX.
                      </p>
                    </div>

                    {/* Applications Matrix Header */}
                    <div className="border-b border-brand-dark/10 pb-3 mb-8 flex justify-between items-end">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-[0.25em] text-brand-dark font-bold">Releases</span>
                        <span className="text-[9px] bg-brand-dark/5 text-brand-teal px-1.5 rounded-sm font-sans font-bold">{APPS_DATA.length} ITEMS</span>
                      </div>
                      <span className="text-[10px] font-mono text-brand-teal/50 hidden xs:inline">
                        Updated 2026 UTC
                      </span>
                    </div>

                    {/* App Grid Matrix (3-2-1 columns layout) */}
                    <div id="applications-grid-matrix" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                      {APPS_DATA.map((app) => (
                          <motion.div
                            key={app.id}
                            whileHover={{ y: -3 }}
                            transition={{ duration: 0.35, ease: "easeOut" }}
                            className="group relative flex flex-col justify-between p-6 md:p-8 min-h-[300px] transition-all duration-300 border border-brand-dark/10 hover:border-brand-dark/50 bg-transparent"
                          >
                            <div>
                              {/* Card Grid Header Row */}
                              <div className="flex justify-between items-start mb-6 gap-2">
                                <span className="text-[10px] uppercase tracking-[0.15em] text-brand-teal font-semibold font-sans">
                                  {app.category}
                                </span>

                                <div className="flex flex-col items-end gap-1">
                                  {app.caseStudy && (
                                    <span className="text-[9px] uppercase tracking-[0.15em] font-bold px-2.5 py-1 rounded-sm font-sans border bg-transparent text-brand-dark border-brand-dark/20">
                                      Case Study
                                    </span>
                                  )}
                                  <span className={`text-[9px] uppercase tracking-[0.15em] font-bold px-2.5 py-1 rounded-sm font-sans border bg-transparent ${
                                    app.status === "COMING SOON"
                                      ? "text-brand-dark/70 border-brand-dark/25"
                                      : "text-brand-teal border-brand-teal/30"
                                  }`}>
                                    {app.demoLabel ?? (app.status === "COMING SOON" ? "COMING SOON" : "LIVE DEMO")}
                                  </span>
                                </div>
                              </div>

                              {app.image && (
                                <img
                                  src={app.image}
                                  alt={`${app.name} logo`}
                                  className="mb-4 h-12 w-12 object-cover border border-brand-dark/15"
                                />
                              )}

                              {/* App Name */}
                              <h3 className="font-serif text-2xl lg:text-3xl font-medium text-brand-dark tracking-tight leading-none group-hover:text-brand-teal transition-colors">
                                {app.name}
                              </h3>

                              {/* Simple Line */}
                              <div className="h-[1px] w-12 bg-brand-dark/10 my-4" />

                              {/* App Description */}
                              <p className="text-xs text-brand-teal/85 leading-relaxed font-sans mb-6">
                                {app.description}
                              </p>
                              {app.platforms && (
                                <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-brand-teal/70 font-sans -mt-3 mb-6">
                                  {app.platforms}
                                </p>
                              )}
                            </div>

                            {/* Card Footer Stack */}
                            <div className="space-y-4 pt-4 border-t border-brand-dark/5 flex flex-col items-start">
                              {/* Tech chips */}
                              {app.technologies && (
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                  {app.technologies.slice(0, 3).map((tech, idx) => (
                                    <span key={idx} className="text-[8.5px] font-mono tracking-wider font-medium text-brand-teal/70 bg-brand-teal/5 px-1.5 py-0.5">
                                      {tech}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <div className="flex flex-wrap items-center gap-2">
                                {app.status === "COMING SOON" ? (
                                  app.url ? (
                                    <a
                                      href={app.url}
                                      target="_blank"
                                      referrerPolicy="no-referrer"
                                      rel="noopener noreferrer"
                                      className="py-2.5 px-6 border border-brand-dark/20 text-brand-dark hover:border-brand-dark/50 transition-all duration-300 font-sans text-[11px] uppercase tracking-[0.15em] font-semibold flex items-center justify-center gap-1.5 cursor-pointer rounded-full max-w-fit"
                                    >
                                      <span>Preview</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  ) : (
                                    <span className="py-2.5 px-6 border border-brand-dark/15 text-brand-teal/70 font-sans text-[11px] uppercase tracking-[0.15em] font-semibold rounded-full">
                                      Coming soon
                                    </span>
                                  )
                                ) : (
                                  app.url && (
                                    <a
                                      href={app.url}
                                      target="_blank"
                                      referrerPolicy="no-referrer"
                                      rel="noopener noreferrer"
                                      className="py-2.5 px-6 bg-brand-dark text-white hover:bg-brand-teal transition-all duration-300 font-sans text-[11px] uppercase tracking-[0.15em] font-semibold flex items-center justify-center gap-1.5 cursor-pointer rounded-full max-w-fit"
                                    >
                                      <span>View Live Demo</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )
                                )}
                                {app.details && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedApp(app)}
                                    className="py-2.5 px-5 border border-brand-dark/15 hover:border-brand-dark/40 text-brand-dark font-sans text-[11px] uppercase tracking-[0.15em] font-semibold rounded-full cursor-pointer transition-colors"
                                  >
                                    Overview
                                  </button>
                                )}
                              </div>
                            </div>
                          </motion.div>
                      ))}
                    </div>

                    {/* Sandboxed notice strip */}
                    <div className="mt-16 bg-[#F1EDE5] border border-brand-dark/10 p-5 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                      <div className="flex gap-3">
                        <Shield className="w-5 h-5 text-brand-teal flex-shrink-0 mt-0.5 sm:mt-0" />
                        <div>
                          <p className="text-xs uppercase tracking-wider text-brand-dark font-bold">
                            Independent Client-Side Directory
                          </p>
                          <p className="text-xs text-brand-teal/95 mt-1 leading-normal max-w-2xl font-sans">
                            {GENERAL_SPECS.hostingHint} Each Philippine tool launched above persists its state inside separate browser partitions (using native local storage limits). Neither C.J. Casin nor any web scraper can intercept your active databases. Zero server overhead.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowAboutModal(true)}
                        className="py-2 px-4 border border-brand-dark/15 hover:border-brand-dark/40 text-[10px] uppercase tracking-wider font-bold transition-all flex items-center gap-1 bg-[#FCFAF6] cursor-pointer"
                      >
                        <Info className="w-3 h-3" />
                        <span>Security Protocol</span>
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  
                  /* BRAND SYSTEM PREVIEW / INTERACTIVE SPECIFICATION PANEL DIRECTLY IN APP */
                  <motion.div
                    key="design-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4 }}
                    className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-16"
                  >
                    <div className="mb-10 max-w-3xl">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-brand-teal font-bold flex items-center gap-1.5 mb-2">
                        <Palette className="w-4 h-4" /> DESIGN TOKENS & COMPILE BLUEPRINTS
                      </span>
                      <h1 className="font-serif text-4xl sm:text-5xl font-light text-brand-dark leading-tight">
                        Casin Works <span className="font-serif italic text-brand-teal">System Guidelines.</span>
                      </h1>
                      <p className="text-xs text-brand-teal/85 mt-2 max-w-xl font-sans leading-relaxed">
                        Design specifications for the Casin Works physical paper aesthetic. Built to resemble luxurious architectural schematics. Full specifications are structured below.
                      </p>
                    </div>

                    {/* Section 1: Color Palette */}
                    <div className="mb-12">
                      <h2 className="text-[11px] uppercase tracking-[0.25em] text-brand-dark font-bold mb-4 pb-2 border-b border-brand-dark/10 flex justify-between">
                        <span>1. Color Tokens System</span>
                        <span className="text-brand-teal/40 font-mono">LEXICAL MAPS</span>
                      </h2>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {DESIGN_COLORS.map((color) => (
                          <div key={color.slug} className="bg-[#FCFAF6] border border-brand-dark/10 p-5 flex flex-col justify-between h-48 relative">
                            {/* Color Swatch Panel */}
                            <div className="h-10 border border-brand-dark/10 mb-4" style={{ backgroundColor: color.hex }} />

                            <div>
                              <div className="flex justify-between items-center">
                                <h3 className="font-serif text-lg font-medium text-brand-dark">{color.name}</h3>
                                <button
                                  onClick={() => triggerCopy(color.hex, color.slug)}
                                  className="text-[9px] font-mono hover:text-brand-teal flex items-center gap-1 bg-brand-dark/5 hover:bg-brand-dark/10 px-1.5 py-0.5 transition-all"
                                  title="Copy Hex Code"
                                >
                                  {copiedId === color.slug ? <Check className="w-2.5 h-2.5 text-green-700" /> : <Copy className="w-2.5 h-2.5" />}
                                  <span>{color.hex}</span>
                                </button>
                              </div>

                              <p className="text-[10px] uppercase tracking-wider text-brand-teal/60 font-bold font-sans mt-2">
                                Variable: <span className="font-mono lowercase text-[9.5px]">--color-{color.slug}</span>
                              </p>
                              <p className="text-[10px] text-brand-teal/80 font-sans mt-1.5 leading-relaxed">
                                {color.role}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Section 2: Typography Scale */}
                    <div className="mb-12">
                      <h2 className="text-[11px] uppercase tracking-[0.25em] text-brand-dark font-bold mb-6 pb-2 border-b border-brand-dark/10 flex justify-between">
                        <span>2. Typography & Hierarchy Matrix</span>
                        <span className="text-brand-teal/40 font-mono">FONT SCALES</span>
                      </h2>

                      <div className="bg-[#FCFAF6] border border-brand-dark/10 divide-y divide-brand-dark/10">
                        {DESIGN_TYPOGRAPHY.map((typo, idx) => (
                          <div key={idx} className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                            {/* Metadata */}
                            <div className="lg:col-span-4 space-y-1">
                              <span className="text-[9px] font-mono tracking-widest text-[#2D4A5A] uppercase font-bold">
                                {typo.level}
                              </span>
                              <h3 className="text-sm font-serif font-bold text-brand-dark">
                                {typo.fontFamily}
                              </h3>
                              <p className="text-[11px] text-brand-teal/70 max-w-sm">
                                <strong>Size:</strong> {typo.size} | <strong>Weight:</strong> {typo.weight}
                              </p>
                              <p className="text-[10px] text-brand-teal/60 capitalize">
                                <strong>Role:</strong> {typo.useCase}
                              </p>
                            </div>

                            {/* Render Example */}
                            <div className="lg:col-span-8 bg-[#F5F3EE]/50 border border-brand-dark/5 p-4 overflow-hidden flex items-center min-h-[5rem]">
                              {idx === 0 && (
                                <h1 className="font-serif text-3xl sm:text-4.25xl tracking-normal text-brand-dark leading-none">
                                  Apps For <span className="font-serif italic text-[#2D4A5A]">Everyone</span>
                                </h1>
                              )}
                              {idx === 1 && (
                                <h2 className="font-serif text-2xl text-brand-dark">
                                  Casin Works Portal Blueprint <span className="font-serif italic opacity-70">Detail #42</span>
                                </h2>
                              )}
                              {idx === 2 && (
                                <h3 className="font-serif text-lg font-bold text-brand-dark">
                                  VigilKeep Renewal Companion
                                </h3>
                              )}
                              {idx === 3 && (
                                <span className="text-xs uppercase tracking-[0.22em] text-[#0D0D0B] font-medium font-sans">
                                  MANDALUYONG, PHILIPPINES — PERSONAL RENEWAL
                                </span>
                              )}
                              {idx === 4 && (
                                <p className="text-xs text-brand-teal/95 leading-relaxed font-sans max-w-xl">
                                  A beautiful, physical paper aesthetic that aligns luxury consultant guidelines directly with strict frontend responsive code. No heavy gradients, dark frames, or generic animations are tolerated.
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Section 3: Component Specifications */}
                    <div className="mb-12">
                      <h2 className="text-[11px] uppercase tracking-[0.25em] text-brand-dark font-bold mb-4 pb-2 border-b border-brand-dark/10 flex justify-between">
                        <span>3. Component Visual Specifications</span>
                        <span className="text-brand-teal/40 font-mono">WIREFRAMES</span>
                      </h2>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Component Card Spec */}
                        <div className="bg-[#FCFAF6] border border-brand-dark/10 p-6 space-y-4">
                          <span className="text-[9px] font-mono text-brand-teal uppercase font-bold">COMPONENT SPEC: App Card Module</span>
                          <div className="border border-brand-dark/20 p-5 bg-[#F5F3EE] space-y-4 relative">
                            {/* Visual guide markers */}
                            <div className="absolute -left-1 -top-1 w-2 h-2 border-l border-t border-brand-dark" />
                            <div className="absolute -right-1 -top-1 w-2 h-2 border-r border-t border-brand-dark" />
                            <div className="absolute -left-1 -bottom-1 w-2 h-2 border-l border-b border-brand-dark" />
                            <div className="absolute -right-1 -bottom-1 w-2 h-2 border-r border-b border-brand-dark" />

                            <div className="flex justify-between items-center text-[9px] font-mono text-[#2D4A5A]/50">
                              <span>CATEGORY CODES (DM Sans Uppercase, spacing-0.2)</span>
                              <span>LIVE / COMING BADGE</span>
                            </div>
                            <h4 className="font-serif text-xl font-medium">App Display Name (Cormorant Garamond H3)</h4>
                            <div className="h-[1px] w-10 bg-[#0D0D0B]/20" />
                            <p className="text-[11px] leading-relaxed text-[#2D4A5A]">
                              Humanist summary block (DM Sans Regular, size 12px, line-height 1.6). Fully responsive width scaling. Inline layout specs.
                            </p>
                            <div className="pt-2 border-t border-[#0D0D0B]/5 flex justify-between items-center">
                              <span className="text-[8px] font-mono text-brand-teal/60">TECHNOLOGIES CHIPS</span>
                              <span className="bg-[#0D0D0B] text-[#F5F3EE] px-4 py-1.5 uppercase text-[9px] tracking-widest font-bold">LAUNCH ACTION</span>
                            </div>
                          </div>
                          
                          <div className="text-xs text-[#2D4A5A] leading-relaxed font-sans space-y-1 pt-2">
                            <p><strong>Borders:</strong> Subtle dark borders <span className="font-mono">#0D0D0B</span> with 10% opacity, switching to 40% opacity on active user hover focus states.</p>
                            <p><strong>Sizing:</strong> Adaptive bento structures. Desktop: 3-columns grid | Tablet: 2-columns grid | Mobile: Single modular block stretch.</p>
                          </div>
                        </div>

                        {/* Component Button Spec */}
                        <div className="bg-[#FCFAF6] border border-brand-dark/10 p-6 space-y-4">
                          <span className="text-[9px] font-mono text-brand-teal uppercase font-bold">COMPONENT SPEC: Responsive Launch Button</span>
                          <div className="border border-brand-dark/20 p-5 bg-[#F5F3EE] space-y-4 relative">
                            {/* Visual guide markers */}
                            <div className="absolute -left-1 -top-1 w-2 h-2 border-l border-t border-brand-dark" />
                            <div className="absolute -right-1 -top-1 w-2 h-2 border-r border-t border-brand-dark" />
                            <div className="absolute -left-1 -bottom-1 w-2 h-2 border-l border-b border-brand-dark" />
                            <div className="absolute -right-1 -bottom-1 w-2 h-2 border-r border-b border-brand-dark" />

                            <span className="text-[9px] font-mono text-[#2D4A5A]/50 block">VISUAL INTERACTIVE STATE (Desktop Hover Scale)</span>
                            <div className="bg-[#0D0D0B] text-[#FCFAF6] py-2.5 px-6 text-center text-[10px] uppercase tracking-widest font-bold rounded-full max-w-xs mx-auto flex items-center justify-center gap-1.5 cursor-pointer">
                              <span>LAUNCH APP</span>
                              <ExternalLink className="w-3 h-3 text-brand-teal" />
                            </div>
                            <div className="text-[9px] text-[#2D4A5A]/40 text-center uppercase tracking-widest font-sans">
                              (Radius: Full-pill shape, active pointer cursor)
                            </div>
                          </div>

                          <div className="text-xs text-[#2D4A5A] leading-relaxed font-sans space-y-1 pt-2">
                            <p><strong>Hover effect:</strong> Scale transformation with ease-out timing to provide direct kinesthetic feedback.</p>
                            <p><strong>Constraints:</strong> Restrict stretch width using responsive <span className="font-mono">max-w-fit</span> bounds ensuring clean, localized alignment.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section 4: Architecture and Specs */}
                    <div className="bg-[#FCFAF6] border border-brand-dark/10 p-6 md:p-8">
                      <h3 className="font-serif text-xl font-bold text-brand-dark mb-4">Core System Constraints Summary</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-brand-teal/90 leading-relaxed font-sans">
                        <div className="space-y-2">
                          <p className="font-bold text-brand-dark uppercase tracking-wider text-[10px]">I. Typography scale pairings</p>
                          <p>Display components default to Cormorant Garamond Serif to recreate high-end Manila software consultant portfolios. Spaced DM Sans is paired for navigational control tags.</p>
                        </div>
                        <div className="space-y-2">
                          <p className="font-bold text-brand-dark uppercase tracking-wider text-[10px]">II. Strict offline sandbox</p>
                          <p>All configurations, inputs, calculations, and app launches remain strictly local on your target device client. Absolutely zero cloud databases or scrapers are connected.</p>
                        </div>
                        <div className="space-y-2">
                          <p className="font-bold text-brand-dark uppercase tracking-wider text-[10px]">III. Responsive layout</p>
                          <p>All canvas elements adapt on container changes. Touch regions are structured at 44px minimum sizing to preserve premium physical handling on phone screens.</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </main>

            {/* General Footer */}
            <footer className="border-t border-brand-dark/10 bg-[#EFECE5] py-10 px-4 md:px-8 text-xs font-sans">
              <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-center md:text-left space-y-1">
                  <p className="font-serif text-md font-medium text-brand-dark">Casin Works</p>
                  <p className="text-[10px] uppercase tracking-widest text-brand-teal/70">
                    Independent Software Engineering — Mandaluyong City, Metro Manila
                  </p>
                </div>

                {/* Footer Links */}
                <div className="flex gap-6 text-[10px] uppercase tracking-[0.15em] font-medium text-brand-teal/75">
                  <Link to="/" className="hover:text-brand-dark font-bold transition-colors">
                    Official Website (casinworks.com)
                  </Link>
                </div>

                <div className="text-[9px] font-mono text-brand-teal/50">
                  © 2026 CASIN WORKS. ZERO TRACKERS.
                </div>
              </div>
            </footer>

            {/* Elegant Vertical Rail from Luxury Theme */}
            <div className="hidden xl:block absolute right-8 top-1/2 -translate-y-1/2 rotate-180 [writing-mode:vertical-rl] text-[10px] font-semibold tracking-[0.25em] uppercase text-brand-teal/30 pointer-events-none select-none z-10">
              INDEPENDENT SOFTWARE DIRECTORY
            </div>
          </div>

      {/* 3. ABOUT & SECURITY PROTOCOL MODAL */}
      <AnimatePresence>
        {showAboutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Modal Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAboutModal(false)}
              className="absolute inset-0 bg-brand-dark"
            />

            {/* Modal Body Container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#FCFAF6] border border-brand-dark/20 w-full max-w-2xl p-6 md:p-8 relative z-10 rounded-none shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              {/* Corner Close Button */}
              <button
                onClick={() => setShowAboutModal(false)}
                className="absolute right-4 top-4 text-brand-teal/60 hover:text-brand-dark transition-colors p-1"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-6">
                <div>
                  <span className="text-[9px] font-mono tracking-widest text-brand-teal uppercase font-bold block mb-1">
                    MISSION PROFILE & MANIFESTO
                  </span>
                  <h2 className="font-serif text-3xl font-medium text-brand-dark">
                    About C.J. Casin <br />
                    <span className="font-serif italic text-brand-teal font-light">& Casin Works</span>
                  </h2>
                </div>

                {/* Substantive Description block */}
                <div className="space-y-4 text-xs sm:text-sm text-brand-teal/95 leading-relaxed font-sans">
                  <p>
                    <strong>Casin Works</strong> represents the sovereign engineering and independent design agency of C.J. Casin, a senior consultant and software engineer based in the geographic hub of <strong>Mandaluyong, Philippines</strong>.
                  </p>
                  <p>
                    This dedicated hub directory is a deliberate response to the modern over-commercialized, heavyweight, tracker-filled web interfaces. It is styled with physical paper elegance, utilizing balanced margins, high typographic contrast, and silent micro-animations that stay out of the visitor&apos;s way.
                  </p>
                  <p>
                    Every application listed in this launcher is completely free, does not show advertisements, is fully functional on mobile viewports, and runs client-first to maximize security.
                  </p>
                </div>

                {/* Secure Architecture section */}
                <div className="bg-[#F5F3EE] border border-brand-dark/15 p-4 space-y-3">
                  <h4 className="font-serif font-bold text-sm text-brand-dark flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-brand-teal" />
                    <span>User Privacy Declaration</span>
                  </h4>
                  <ul className="text-xs text-brand-teal/90 space-y-2 list-disc pl-4 font-sans leading-relaxed">
                    <li>
                      <strong>Zero Cloud Servers:</strong> No third-party servers, trackers, analytics, or background databases are integrated inside this framework.
                    </li>
                    <li>
                      <strong>100% Client-First:</strong> All tools process data directly on your own device to maximize speed and local safety.
                    </li>
                    <li>
                      <strong>Storage Isolation:</strong> Stored settings and persistent state are isolated entirely inside local sandboxed cache partitions on your device.
                    </li>
                  </ul>
                </div>

                {/* Bottom metadata tags */}
                <div className="pt-4 border-t border-brand-dark/5 flex flex-wrap justify-between items-center text-[10px] font-mono text-brand-teal/65">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> Mandaluyong, NCR, Philippines
                  </span>
                  <span>IP/LAT: 14.5794° N, 121.0359° E</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {selectedApp?.details && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedApp(null)}
              className="absolute inset-0 bg-brand-dark"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#FCFAF6] border border-brand-dark/20 w-full max-w-2xl p-6 md:p-8 relative z-10 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="absolute right-4 top-4 text-brand-teal/60 hover:text-brand-dark transition-colors p-1"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-5 pr-6">
                <div>
                  <span className="text-[9px] font-mono tracking-widest text-brand-teal uppercase font-bold block mb-1">
                    {selectedApp.category}
                  </span>
                  <h2 className="font-serif text-3xl font-medium text-brand-dark">{selectedApp.name}</h2>
                  <p className="text-xs text-brand-teal/90 mt-2 leading-relaxed">{selectedApp.description}</p>
                </div>

                <section>
                  <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-brand-dark mb-2">Primary Outcome</h3>
                  <p className="text-xs text-brand-teal/95 leading-relaxed">{selectedApp.details.primaryOutcome}</p>
                </section>

                {(
                  [
                    ["The Problem", selectedApp.details.problem],
                    ["The Solution", selectedApp.details.solution],
                    ["Key Features", selectedApp.details.keyFeatures],
                    ["Feasibility", selectedApp.details.feasibility],
                    ...(selectedApp.details.nextSteps
                      ? [["Next Steps", selectedApp.details.nextSteps] as const]
                      : []),
                  ] as const
                ).map(([title, items]) => (
                  <section key={title}>
                    <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-brand-dark mb-2">{title}</h3>
                    <ul className="text-xs text-brand-teal/90 space-y-1.5 list-disc pl-4 leading-relaxed">
                      {items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </section>
                ))}

                <a
                  href={selectedApp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex py-2.5 px-6 bg-brand-dark text-white hover:bg-brand-teal transition-colors font-sans text-[11px] uppercase tracking-[0.15em] font-semibold items-center gap-1.5 rounded-full"
                >
                  View Live Demo
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
