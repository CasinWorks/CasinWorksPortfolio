import React, { useState } from 'react';
import { UserRole } from '../types';
import { ArrowRight, Lock, Mail, Shield, Check } from 'lucide-react';

interface SignInScreenProps {
  onSignIn: (role: UserRole) => void;
}

export const SignInScreen: React.FC<SignInScreenProps> = ({ onSignIn }) => {
  const [role, setRole] = useState<UserRole>('client');
  const [email, setEmail] = useState('c.casin@aethelgard-defense.com');
  const [password, setPassword] = useState('••••••••••••');
  const [rememberMe, setRememberMe] = useState(true);

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    if (newRole === 'client') {
      setEmail('c.casin@aethelgard-defense.com');
    } else {
      setEmail('marcus.vance@casinworks-fellow.com');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSignIn(role);
  };

  return (
    <div id="signin-screen" className="px-6 py-8 sm:py-12 max-w-md mx-auto flex flex-col justify-between min-h-[580px]">
      {/* Top Branding Section */}
      <div>
        <div className="flex items-center justify-between pb-6 border-b border-[#17171A]/10">
          <div>
            <div className="text-xs font-mono uppercase tracking-[0.2em] font-semibold text-[#17171A]">
              CASINWORKS
            </div>
            <div className="text-[10px] font-mono text-[#8A93AD] tracking-wider uppercase mt-0.5">
              Independent Engineering Consultancy
            </div>
          </div>
          <div className="flex items-center space-x-1.5 text-[10px] font-mono text-[#8A93AD] uppercase border border-[#8A93AD]/30 px-2 py-0.5 rounded">
            <Shield className="w-3 h-3 text-[#8A93AD]" />
            <span>Encrypted Portal</span>
          </div>
        </div>

        {/* Headline with upright serif weight paired with italic accent in muted blue-grey (#8A93AD) */}
        <div className="mt-8 space-y-2">
          <h1 className="text-3xl sm:text-4xl font-serif text-[#17171A] leading-[1.15]">
            Your work, <span className="italic text-[#8A93AD]">in one place.</span>
          </h1>
          <p className="text-xs font-mono uppercase tracking-wider text-[#17171A]/60 pt-1">
            High-Stakes Engineering. <span className="text-[#8A93AD]">— We make things work.</span>
          </p>
        </div>

        {/* Role Toggle: "I'm a client" vs. "I'm looking for work" */}
        <div className="mt-8">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#8A93AD] mb-2">
            Select Your Workspace
          </div>
          <div
            id="role-toggle-group"
            className="p-1 bg-[#FAF8F5] border border-[#17171A]/15 rounded-full flex items-center"
          >
            <button
              type="button"
              id="role-toggle-client"
              onClick={() => handleRoleChange('client')}
              className={`flex-1 py-2 px-3 rounded-full text-xs font-medium transition-all text-center ${
                role === 'client'
                  ? 'bg-[#17171A] text-[#EDEAE2] shadow-sm font-semibold'
                  : 'text-[#17171A]/70 hover:text-[#17171A]'
              }`}
            >
              I'm a client
            </button>
            <button
              type="button"
              id="role-toggle-subcontractor"
              onClick={() => handleRoleChange('subcontractor')}
              className={`flex-1 py-2 px-3 rounded-full text-xs font-medium transition-all text-center ${
                role === 'subcontractor'
                  ? 'bg-[#17171A] text-[#EDEAE2] shadow-sm font-semibold'
                  : 'text-[#17171A]/70 hover:text-[#17171A]'
              }`}
            >
              I'm looking for work
            </button>
          </div>
          <p className="text-[11px] text-[#8A93AD] mt-2 font-sans">
            {role === 'client'
              ? 'Access real-time fairway milestone tracking, telemetry, and executive approvals.'
              : 'Browse vetted high-complexity subcontractor engagements, retainers, and test runs.'}
          </p>
        </div>

        {/* Sign In Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Email input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-[#17171A]/80">
              Corporate / Security Cleared Email
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@organization.com"
                className="w-full px-3.5 py-2.5 bg-white border border-[#17171A]/20 rounded text-sm text-[#17171A] placeholder-[#8A93AD]/60 focus:outline-none focus:border-[#17171A] transition-colors font-sans"
              />
              <Mail className="w-4 h-4 text-[#8A93AD] absolute right-3.5 top-3" />
            </div>
          </div>

          {/* Password input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-mono uppercase tracking-wider text-[#17171A]/80">
                Security Key / Passphrase
              </label>
              <a href="#reset" onClick={(e) => e.preventDefault()} className="text-[11px] text-[#8A93AD] hover:underline font-mono">
                Forgot?
              </a>
            </div>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter passphrase"
                className="w-full px-3.5 py-2.5 bg-white border border-[#17171A]/20 rounded text-sm text-[#17171A] placeholder-[#8A93AD]/60 focus:outline-none focus:border-[#17171A] transition-colors font-sans"
              />
              <Lock className="w-4 h-4 text-[#8A93AD] absolute right-3.5 top-3" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center space-x-2 text-xs text-[#17171A]/70 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-[#17171A]/30 text-[#17171A] focus:ring-0"
              />
              <span>Remember hardware token</span>
            </label>
            <span className="text-[10px] font-mono text-[#8A93AD]">FIPS 140-2 LEVEL 3</span>
          </div>

          {/* Black Pill CTA "Continue" with an arrow (Prompt Requirement) */}
          <div className="pt-3">
            <button
              type="submit"
              id="continue-cta-btn"
              className="w-full py-3.5 px-6 bg-[#17171A] text-[#EDEAE2] rounded-full text-sm font-semibold tracking-wide flex items-center justify-center space-x-2 hover:bg-black active:scale-[0.99] transition-all cursor-pointer group"
            >
              <span>Continue as {role === 'client' ? 'Client' : 'Subcontractor'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </form>
      </div>

      {/* Footer info & Direct Switcher Links */}
      <div className="pt-8 border-t border-[#17171A]/10 mt-6 text-center space-y-2">
        <p className="text-xs text-[#17171A]/60">
          Need partner access or security clearance endorsement?{' '}
          <a href="#contact" onClick={(e) => e.preventDefault()} className="text-[#17171A] font-medium underline underline-offset-2">
            Contact Senior Partner
          </a>
        </p>
        <p className="text-[10px] font-mono text-[#8A93AD] uppercase tracking-widest">
          CasinWorks Independent Engineering Advisory © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};
