import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import Footer from './Footer';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';

const ContactSection: React.FC = () => {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  // Tracks the "reset to idle" timer so a stale one can't fire into a later
  // submit (corrupting its status) or leak after unmount.
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  const scheduleIdleReset = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setStatus('idle'), 5000);
  }, []);

  const handleFieldChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    // Cancel any pending idle-reset from a previous submit before starting.
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    setStatus('loading');

    try {
      const response = await fetchWithTimeout('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to send message';
        try {
          const data = await response.json();
          if (data.error) {
            errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
          }
        } catch {
          // Server returned non-JSON response
        }
        throw new Error(errorMessage);
      }

      await response.json();

      setStatus('success');
      setFormData({ name: '', email: '', phone: '', message: '' });
      scheduleIdleReset();
    } catch (error) {
      console.error('Error sending message:', error);
      setStatus('error');
      scheduleIdleReset();
    }
  }, [formData, scheduleIdleReset]);

  return (
    <div className="relative z-20 md:min-h-screen pt-12 md:pt-32 pb-8 px-4 md:px-12 lg:px-24 bg-gradient-to-t from-blue-900/5 to-transparent flex flex-col justify-center">
      <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-6 md:gap-20 items-start">
        <div className="space-y-4 md:space-y-16">
          <h2 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-light tracking-tighter leading-[0.9] font-heading">
            Get <br className="hidden md:block" />
            <span className="text-blue-300 font-medium">In Touch.</span>
          </h2>

          <p className="text-white/75 text-base md:text-xl font-light max-w-md leading-relaxed font-body">
            Let's enable earlier detection—without changing how labs work.
          </p>

          <div className="space-y-4 md:space-y-12">
            <div className="group">
              <span className="text-xs text-white/75 uppercase tracking-[0.3em] font-bold mb-2 md:mb-4 block font-heading">Product & Partnerships</span>
              <a href="mailto:contact@arogyabiox.com" className="text-xl md:text-4xl font-light text-white group-hover:text-blue-300 transition-colors duration-300 break-words leading-tight font-heading">
                contact@arogyabiox.com
              </a>
            </div>
          </div>
        </div>

        <div className="glass-effect p-5 md:p-8 lg:p-12 rounded-2xl md:rounded-[32px] lg:rounded-[40px] border border-white/10 hover:border-blue-400/30 hover:bg-white/[0.04] transition-colors duration-500 w-full group">
          <span className="text-xs text-blue-400/80 uppercase tracking-[0.4em] font-bold mb-4 md:mb-8 block font-heading">Inquiry Form</span>

          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-8">
            <fieldset disabled={status === 'loading'} className="space-y-4 md:space-y-8">
              <div className="space-y-2">
                <label htmlFor="contact-name" className="text-xs text-white/75 uppercase tracking-[0.2em] font-medium ml-1 font-heading">Full Name</label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  placeholder="Name"
                  className="w-full bg-white/5 border border-white/20 rounded-full px-6 py-4 text-sm text-white focus:outline-none focus:border-blue-400/50 transition-all placeholder:text-white/20 font-body disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="contact-email" className="text-xs text-white/75 uppercase tracking-[0.2em] font-medium ml-1 font-heading">Email Address</label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  placeholder="Email"
                  className="w-full bg-white/5 border border-white/20 rounded-full px-6 py-4 text-sm text-white focus:outline-none focus:border-blue-400/50 transition-all placeholder:text-white/20 font-body disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="contact-phone" className="text-xs text-white/75 uppercase tracking-[0.2em] font-medium ml-1 font-heading">Contact Number</label>
                <input
                  id="contact-phone"
                  type="tel"
                  required
                  pattern="[0-9]{10}"
                  title="Please enter a valid 10-digit phone number"
                  value={formData.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="Phone Number (10 digits)"
                  className="w-full bg-white/5 border border-white/20 rounded-full px-6 py-4 text-sm text-white focus:outline-none focus:border-blue-400/50 transition-all placeholder:text-white/20 font-body disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="contact-message" className="text-xs text-white/75 uppercase tracking-[0.2em] font-medium ml-1 font-heading">Message</label>
                <textarea
                  id="contact-message"
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => handleFieldChange('message', e.target.value)}
                  placeholder="How can we help?"
                  className="w-full bg-white/5 border border-white/20 rounded-3xl px-6 py-4 text-sm text-white focus:outline-none focus:border-blue-400/50 transition-all placeholder:text-white/20 resize-none font-body disabled:opacity-50"
                />
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full py-4 md:py-5 bg-blue-400 hover:bg-blue-500 disabled:bg-blue-400/50 disabled:cursor-not-allowed text-white rounded-full text-xs font-bold tracking-[0.3em] uppercase transition-colors shadow-[0_10px_30px_rgba(96,165,250,0.2)] active:scale-[0.98] font-heading"
              >
                {status === 'loading' ? 'Sending...' : 'Send Message'}
              </button>
            </fieldset>

            {status === 'success' && (
              <p className="text-center text-sm text-green-400 font-medium">Thank you! Our partnership team will respond within 24 hours.</p>
            )}
            {status === 'error' && (
              <p className="text-center text-sm text-red-400 font-medium">Failed to send message. Please try again or contact us directly via email.</p>
            )}
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default memo(ContactSection);