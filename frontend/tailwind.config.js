/**
 * MedoShield "Clinical Swiss" design tokens — light only. See DESIGN.md.
 * Cool paper, deep navy ink, one cobalt primary, coral for live data, green for good.
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    container: { center: true, padding: { DEFAULT: '1.25rem', md: '2rem', xl: '2.5rem' }, screens: { '2xl': '1240px' } },
    extend: {
      colors: {
        // "Clinical Swiss" — cool paper, deep navy ink, one cobalt primary, coral for live data,
        // green reserved for good/low-risk, amber and red for warnings. Token names kept for compatibility:
        // teal-* = cobalt primary, apricot-* = coral signal, lilac-* = slate, mint-* = good/green.
        canvas: '#F4F6F9',   // page
        paper: '#FFFFFF',    // cards, inputs
        cream: '#EBEFF5',    // sunken / hover
        line: '#DFE4EC',     // hairlines
        ink: { DEFAULT: '#0B1526', 2: '#283347', 3: '#536075', 4: '#6B778B' },
        navy: { 800: '#111C31', 900: '#0B1526', 950: '#070E1B' },
        teal: { 50: '#EEF3FF', 100: '#DCE5FF', 200: '#B8CAFF', 300: '#8AA6FB', 400: '#5B7FF2', 500: '#3860E6', 600: '#2549CC', 700: '#1D3AA6', 800: '#182F80', 900: '#13235C' },
        apricot: { 50: '#FFF1EB', 100: '#FFDCCD', 200: '#FDB79C', 300: '#F98E66', 400: '#F06A3B', 500: '#D9522A', 600: '#B0401E' },
        lilac: { 50: '#F2F4F8', 100: '#E5E9F0', 200: '#D0D6E0', 300: '#A9B2C1', 400: '#8792A4', 500: '#677387', 600: '#4E596C' },
        butter: { 50: '#FFF7E5', 100: '#FDEABB', 200: '#F8D47A', 300: '#EBB43F', 400: '#C98A12' },
        sky: { 50: '#EEF6FB', 100: '#D6EAF5', 200: '#ADD3EA', 300: '#79B4D8', 400: '#4791BF', 500: '#2C729E' },
        rose: { 50: '#FFF0F0', 100: '#FFDADA', 200: '#F9B1B1', 400: '#E5534B', 500: '#C93A33', 600: '#A12D27' },
        mint: { 50: '#EAF8F0', 100: '#CFEFDD', 200: '#A0DDBB', 400: '#2FA968', 500: '#1E8A52', 600: '#176C40' },
        risk: { low: '#1E8A52', medium: '#C98A12', high: '#C93A33', calibrating: '#677387' },
      },
      fontFamily: {
        // Display voice: Schibsted Grotesk (Swiss-editorial grotesk). `serif` is an alias kept so
        // existing `font-serif` headings switch to the new display face everywhere.
        display: ['"Schibsted Grotesk Variable"', '"Geist Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Schibsted Grotesk Variable"', '"Geist Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Geist Variable"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"Geist Mono Variable"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        'display-sm': ['2.375rem', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'display-md': ['3.25rem', { lineHeight: '1.0', letterSpacing: '-0.025em' }],
        'display-lg': ['4.5rem', { lineHeight: '0.95', letterSpacing: '-0.03em' }],
        'display-xl': ['6.25rem', { lineHeight: '0.9', letterSpacing: '-0.035em' }],
      },
      borderRadius: { lg: '0.5rem', xl: '0.625rem', '2xl': '0.875rem', '3xl': '1rem', '4xl': '1.5rem' },
      boxShadow: {
        soft: '0 1px 2px rgba(11,21,38,.05)',
        card: '0 1px 2px rgba(11,21,38,.04), 0 4px 16px -8px rgba(11,21,38,.08)',
        lift: '0 1px 0 rgba(11,21,38,.03), 0 12px 32px -16px rgba(15,25,50,.22)',
        float: '0 24px 60px -28px rgba(15,25,50,.35)',
        glow: '0 1px 0 rgba(11,21,38,.03), 0 1px 3px rgba(11,21,38,.04)',
        'glow-violet': '0 1px 0 rgba(11,21,38,.03), 0 1px 3px rgba(11,21,38,.04)',
        'glow-apricot': '0 1px 0 rgba(11,21,38,.03), 0 1px 3px rgba(11,21,38,.04)',
        inset: 'inset 0 1px 0 rgba(255,255,255,.6)',
      },
      backgroundImage: {
        grain: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E\")",
        'dot-grid': 'radial-gradient(rgba(11,21,38,.09) 1px, transparent 1px)',
        'rule-grid': 'linear-gradient(rgba(11,21,38,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(11,21,38,.05) 1px, transparent 1px)',
        // legacy names → flat colours (no decorative gradients in this system)
        'brand-grad': 'linear-gradient(135deg,#2549CC,#1D3AA6)',
        'warm-grad': 'linear-gradient(#D9522A,#D9522A)',
        'sun-grad': 'linear-gradient(#EBEFF5,#EBEFF5)',
        aurora: 'none',
      },
      keyframes: {
        'fade-up': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        blob: { '0%,100%': { transform: 'none' } },
        pulse2: { '0%': { transform: 'scale(.9)', opacity: .7 }, '100%': { transform: 'scale(2.2)', opacity: 0 } },
        shimmer: { from: { backgroundPosition: '-400px 0' }, to: { backgroundPosition: '400px 0' } },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        wave: { '0%,100%': { transform: 'scaleY(.35)' }, '50%': { transform: 'scaleY(1)' } },
        scan: { '0%': { transform: 'translateY(-100%)' }, '100%': { transform: 'translateY(100%)' } },
      },
      animation: {
        'fade-up': 'fade-up .35s cubic-bezier(.2,.8,.2,1) both',
        'fade-in': 'fade-in .3s ease-out both',
        marquee: 'marquee 60s linear infinite',
        float: 'float 7s ease-in-out infinite',
        blob: 'none',
        pulse2: 'pulse2 2s cubic-bezier(.2,.8,.2,1) infinite',
        shimmer: 'shimmer 1.4s linear infinite',
        'spin-slow': 'spin-slow 30s linear infinite',
        wave: 'wave 1.1s ease-in-out infinite',
        scan: 'scan 3.2s cubic-bezier(.65,0,.35,1) infinite',
      },
      transitionTimingFunction: { spring: 'cubic-bezier(.2,.8,.2,1)', out: 'cubic-bezier(.2,.8,.2,1)' },
    },
  },
  plugins: [],
}
