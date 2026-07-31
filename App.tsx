import React, { useState, useEffect, lazy, Suspense } from 'react';
import ModeSelectorPage from './components/ModeSelectorPage';

type AppMode = 'home' | 'hotel-lpo' | 'general-lpo' | 'hotel-invoice' | 'general-invoice';

// Lazy-load modules for code splitting
const HotelLPOModule = lazy(() => import('./components/HotelLPOModule'));
const GeneralLPOModule = lazy(() => import('./components/generalLpo/GeneralLPOModule'));
const HotelInvoiceModule = lazy(() => import('./components/hotelInvoice/HotelInvoiceModule'));
const GeneralInvoiceModule = lazy(() => import('./components/generalInvoice/GeneralInvoiceModule'));

// Hash-based routing for GitHub Pages compatibility
const getModeFromHash = (): AppMode => {
  const hash = window.location.hash.replace('#/', '').replace('#', '');
  const validModes: AppMode[] = ['hotel-lpo', 'general-lpo', 'hotel-invoice', 'general-invoice'];
  return validModes.includes(hash as AppMode) ? (hash as AppMode) : 'home';
};

const setHashForMode = (mode: AppMode) => {
  if (mode === 'home') {
    window.history.pushState(null, '', window.location.pathname);
  } else {
    window.history.pushState(null, '', `#/${mode}`);
  }
};

// Simple loading fallback
const LoadingFallback = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#f8fafc',
    color: '#64748b',
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.875rem',
    fontWeight: 500,
  }}>
    Loading…
  </div>
);

export default function App() {
  const [currentMode, setCurrentMode] = useState<AppMode>(getModeFromHash);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handleHashChange = () => setCurrentMode(getModeFromHash());
    const handlePopState = () => setCurrentMode(getModeFromHash());

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const navigateTo = (mode: AppMode) => {
    setCurrentMode(mode);
    setHashForMode(mode);
    window.scrollTo(0, 0);
  };

  const navigateHome = () => navigateTo('home');

  if (currentMode === 'home') {
    return <ModeSelectorPage onSelectMode={(mode) => navigateTo(mode as AppMode)} />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      {currentMode === 'hotel-lpo' && <HotelLPOModule onNavigateHome={navigateHome} />}
      {currentMode === 'general-lpo' && <GeneralLPOModule onNavigateHome={navigateHome} />}
      {currentMode === 'hotel-invoice' && <HotelInvoiceModule onNavigateHome={navigateHome} />}
      {currentMode === 'general-invoice' && <GeneralInvoiceModule onNavigateHome={navigateHome} />}
    </Suspense>
  );
}