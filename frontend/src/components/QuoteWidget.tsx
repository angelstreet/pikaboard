import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    QuoteWidget: new (opts: any) => any;
  }
}

// Load script/css once
let loaded = false;
function loadWidget(): Promise<void> {
  if (loaded) return Promise.resolve();
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/widgets/quotes/quote-widget.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = '/widgets/quotes/quote-widget.js';
    script.onload = () => { loaded = true; resolve(); };
    document.head.appendChild(script);
  });
}

export default function QuoteWidgetLoader() {
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    loadWidget().then(() => {
      if (widgetRef.current) return; // already init
      const isDark = document.documentElement.classList.contains('dark');
      widgetRef.current = new window.QuoteWidget({
        quotesUrl: '/widgets/quotes/quotes.json',
        position: 'bottom-right',
        interval: 60000,   // 1 min between quotes
        duration: 10000,   // 10s visible
        theme: isDark ? 'dark' : 'light',
        animation: 'slide-up',
        maxWidth: 360,
        language: 'en',
      });
    });

    // Listen for dark mode changes
    const observer = new MutationObserver(() => {
      if (widgetRef.current) {
        const isDark = document.documentElement.classList.contains('dark');
        widgetRef.current.updateConfig({ theme: isDark ? 'dark' : 'light' });
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      observer.disconnect();
      if (widgetRef.current) {
        widgetRef.current.destroy();
        widgetRef.current = null;
      }
    };
  }, []);

  return null; // No visual output — widget injects its own DOM
}
