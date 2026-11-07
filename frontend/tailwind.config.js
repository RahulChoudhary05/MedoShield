/**
 * MedoShield "Cream & Sage" design tokens — light only.
 * Creamy paper canvas with a soft grain, warm ink, one deep sage/pine green primary,
 * a terracotta signal colour for data, amber / clay red reserved for status.
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    container: { center: true, padding: { DEFAULT: '1.25rem', md: '2rem', xl: '2.5rem' }, screens: { '2xl': '1240px' } },
    extend: {
      colors: {
        canvas: '#F6F2EA',   // cream
        paper: '#FCFAF6',    // card surface
        cream: '#EFE9DE',    // sunken / hover surface
        line: '#E3DCCF',     // hairlines
        ink: { DEFAULT: '#171614', 2: '#3B3833', 3: '#67615A', 4: '#8F887D' },
        // primary — sage / pine green
        teal: { 50: '#EEF3EF', 100: '#DCE7DF', 200: '#B9CFC0', 300: '#8EB09A', 400: '#5F8A71', 500: '#3F6D56', 600: '#2D5944', 700: '#234A38', 800: '#1B3B2D', 900: '#132C21' },
        // signal — terracotta (data highlights only)
        apricot: { 50: '#FBF0EA', 100: '#F5DCCD', 200: '#EBB79C', 300: '#DE9068', 400: '#CF7146', 500: '#B95A31', 600: '#984826' },
        // warm stone — chart secondary series, "calibrating"
        lilac: { 50: '#F4F2EF', 100: '#E9E5DF', 200: '#D4CDC3', 300: '#B5AC9F', 400: '#958B7D', 500: '#7A7064', 600: '#635A50' },
        butter: { 50: '#FAF5E6', 100: '#F2E7C4', 200: '#E6D293', 300: '#D4B660', 400: '#B8963A' },
        sky: { 50: '#EEF2F3', 100: '#DCE5E8', 200: '#B9CBD1', 300: '#8EA9B2', 400: '#678A95', 500: '#4D6E79' },
        rose: { 50: '#FAEEEC', 100: '#F3D9D4', 200: '#E6B1A8', 400: '#C9614F', 500: '#AF4A39', 600: '#8F3A2C' },
        mint: { 50: '#EEF3EF', 100: '#DCE7DF', 200: '#B9CFC0', 400: '#5F8A71', 500: '#3F6D56', 600: '#2D5944' },
        risk: { low: '#3F6D56', medium: '#B8963A', high: '#AF4A39', calibrating: '#7A7064' },
      },
      fontFamily: {
        display: ['"Geist Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'ui-serif', 'Georgia', 'Cambria', 'serif'],
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
      borderRadius: { lg: '0.5rem', xl: '0.75rem', '2xl': '1rem', '3xl': '1.25rem', '4xl': '1.75rem' },
      boxShadow: {
        soft: '0 1px 0 rgba(23,22,20,.03), 0 1px 3px rgba(23,22,20,.04)',
        lift: '0 1px 0 rgba(23,22,20,.03), 0 12px 32px -16px rgba(40,32,20,.22)',
        float: '0 24px 60px -28px rgba(40,32,20,.35)',
        glow: '0 1px 0 rgba(23,22,20,.03), 0 1px 3px rgba(23,22,20,.04)',
        'glow-violet': '0 1px 0 rgba(23,22,20,.03), 0 1px 3px rgba(23,22,20,.04)',
        'glow-apricot': '0 1px 0 rgba(23,22,20,.03), 0 1px 3px rgba(23,22,20,.04)',
        inset: 'inset 0 1px 0 rgba(255,255,255,.6)',
      },
      backgroundImage: {
        grain: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E\")",
        'dot-grid': 'radial-gradient(rgba(23,22,20,.09) 1px, transparent 1px)',
        'rule-grid': 'linear-gradient(rgba(23,22,20,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(23,22,20,.05) 1px, transparent 1px)',
        // legacy names → flat colours (no decorative gradients in this system)
        'brand-grad': 'linear-gradient(135deg,#2D5944,#234A38)',
        'warm-grad': 'linear-gradient(#B95A31,#B95A31)',
        'sun-grad': 'linear-gradient(#EFE9DE,#EFE9DE)',
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
