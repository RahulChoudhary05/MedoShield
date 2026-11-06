/** MedoShield "Warm Clinical" design tokens — light only, humane, calm. */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    container: { center: true, padding: { DEFAULT: '1rem', md: '1.5rem', xl: '2rem' }, screens: { '2xl': '1280px' } },
    extend: {
      colors: {
        canvas: '#F8F4EC',      // warm ivory "cloud cream"
        paper: '#FFFDF9',
        cream: '#F3EDE2',
        line: '#E8E0D2',
        ink: { DEFAULT: '#1E1C19', 2: '#45403A', 3: '#6F685E', 4: '#A39B8E' },
        teal: {                  // primary — deep sage
          50: '#F1F5F1', 100: '#E1EBE3', 200: '#C5D8CB', 300: '#9DBDA9', 400: '#6E9B83', 500: '#4A7C64', 600: '#3A6652', 700: '#2F5444', 800: '#274538', 900: '#1F372D',
        },
        apricot: { 50: '#FBF2EC', 100: '#F6E2D5', 200: '#ECC4AB', 300: '#DFA180', 400: '#D08560', 500: '#C06D48', 600: '#A35738' },   // terracotta accent
        lilac: { 50: '#F4F2F6', 100: '#E9E5EE', 200: '#D3CCDD', 300: '#B6AAC5', 400: '#9789AA', 500: '#7B6C90', 600: '#655877' },     // dusty mauve (sparingly)
        butter: { 50: '#FBF6E8', 100: '#F5EBCB', 200: '#ECD99C', 300: '#DFC36B', 400: '#C9A845' },                                   // warm honey
        sky: { 50: '#F0F4F6', 100: '#E0E8EC', 200: '#C3D3DB', 300: '#9AB4C1', 400: '#7194A5', 500: '#55788A' },                       // slate mist
        rose: { 50: '#FBF0EE', 100: '#F5DDD8', 200: '#EBB9B0', 400: '#CF6B5C', 500: '#B8513F', 600: '#9A4031' },                       // clay red (alerts)
        risk: { low: '#4A7C64', medium: '#C9A845', high: '#B8513F', calibrating: '#7B6C90' },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'ui-serif', 'Georgia', 'serif'],
        sans: ['"Geist Variable"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"Geist Mono Variable"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        'display-sm': ['2.25rem', { lineHeight: '1.08', letterSpacing: '-0.03em' }],
        'display-md': ['3rem', { lineHeight: '1.04', letterSpacing: '-0.035em' }],
        'display-lg': ['4.25rem', { lineHeight: '0.98', letterSpacing: '-0.04em' }],
        'display-xl': ['5.75rem', { lineHeight: '0.94', letterSpacing: '-0.045em' }],
      },
      borderRadius: { xl: '0.875rem', '2xl': '1.25rem', '3xl': '1.75rem', '4xl': '2.25rem' },
      boxShadow: {
        soft: '0 1px 2px rgba(30,28,25,.04), 0 8px 24px -12px rgba(64,48,28,.12)',
        lift: '0 1px 2px rgba(30,28,25,.04), 0 24px 48px -20px rgba(64,48,28,.20)',
        glow: '0 10px 30px -12px rgba(47,84,68,.45)',
        'glow-violet': '0 10px 30px -12px rgba(30,28,25,.25)',
        'glow-apricot': '0 10px 30px -12px rgba(192,109,72,.45)',
        inset: 'inset 0 1px 0 rgba(255,255,255,.7), inset 0 -1px 0 rgba(22,24,29,.04)',
      },
      backgroundImage: {
        grain: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E\")",
        'dot-grid': 'radial-gradient(rgba(70,58,40,.10) 1px, transparent 1px)',
        'brand-grad': 'linear-gradient(135deg,#3A6652 0%,#2F5444 100%)',
        'warm-grad': 'linear-gradient(135deg,#D08560 0%,#C06D48 100%)',
        'sun-grad': 'linear-gradient(135deg,#F5EBCB 0%,#F6E2D5 100%)',
        aurora: 'radial-gradient(70% 60% at 50% -10%,rgba(197,216,203,.45),transparent 70%)',
      },
      keyframes: {
        'fade-up': { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'none' } },
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        blob: { '0%,100%': { transform: 'translate(0,0) scale(1)' }, '33%': { transform: 'translate(30px,-40px) scale(1.08)' }, '66%': { transform: 'translate(-25px,20px) scale(.95)' } },
        pulse2: { '0%': { transform: 'scale(.9)', opacity: .7 }, '100%': { transform: 'scale(2.2)', opacity: 0 } },
        shimmer: { from: { backgroundPosition: '-400px 0' }, to: { backgroundPosition: '400px 0' } },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        wave: { '0%,100%': { transform: 'scaleY(.35)' }, '50%': { transform: 'scaleY(1)' } },
      },
      animation: {
        'fade-up': 'fade-up .5s cubic-bezier(.2,.7,.2,1) both',
        marquee: 'marquee 40s linear infinite',
        float: 'float 6s ease-in-out infinite',
        blob: 'blob 18s ease-in-out infinite',
        pulse2: 'pulse2 1.8s cubic-bezier(.2,.7,.2,1) infinite',
        shimmer: 'shimmer 1.4s linear infinite',
        'spin-slow': 'spin-slow 24s linear infinite',
        wave: 'wave 1.1s ease-in-out infinite',
      },
      transitionTimingFunction: { spring: 'cubic-bezier(.2,.8,.2,1)' },
    },
  },
  plugins: [],
}
