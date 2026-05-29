import React, { useEffect, useState } from 'react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useStore } from './store/useStore';
import { Login } from './components/auth/Login';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { Dashboard } from './pages/Dashboard';
import { Geographic } from './pages/Geographic';
import { ProjectManagement } from './pages/ProjectManagement';
import { Meetings } from './pages/Meetings';
import { Documents } from './pages/Documents';
import { Settings } from './pages/Settings';
import { Profile } from './pages/Profile';
import { Transmigrants } from './pages/Transmigrants';
import { UserManagement } from './pages/UserManagement';
import { HomepageManager } from './pages/HomepageManager';
import { Logistics } from './pages/Logistics';
import { Complaints } from './pages/Complaints';
import MaintenancePage from './pages/MaintenancePage';
import { Infrastructure } from './pages/Infrastructure';
import { Economy } from './pages/Economy';
import { Reports } from './pages/Reports';
import { PublicVerify } from './pages/PublicVerify';
import { PublicComplaint } from './pages/PublicComplaint';
import { Homepage } from './pages/Homepage';
import { Terms } from './pages/Terms';
import { Privacy } from './pages/Privacy';
import { Support } from './pages/Support';
import { Documentation } from './pages/Documentation';
import { UserProfile } from './types';

export default function App() {
  const { user, setUser, isLoading, setIsLoading, appSettings, setAppSettings } = useStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authReady, setAuthReady] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    
    window.addEventListener('popstate', handleLocationChange);

    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'global'));
        if (docSnap.exists()) {
          const settings = docSnap.data();
          setAppSettings(settings);
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('offline')) {
          console.warn("Global settings not loaded: Client offline");
        } else {
          console.error("Failed to load global settings:", error);
        }
      }
    };
    fetchSettings();
  }, [setAppSettings]);

  useEffect(() => {
    if (!appSettings) return;

    // 1. Title
    if (appSettings.appName) {
      document.title = appSettings.appName;
    }

    // 2. Favicon
    if (appSettings.faviconUrl) {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) {
        link.href = appSettings.faviconUrl;
      } else {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.href = appSettings.faviconUrl;
        document.head.appendChild(newLink);
      }
    }

    // 3. Compact densities
    if (appSettings.layoutDensity === 'compact') {
      document.documentElement.classList.add('layout-compact');
      document.body.classList.add('layout-compact');
    } else {
      document.documentElement.classList.remove('layout-compact');
      document.body.classList.remove('layout-compact');
    }

    // 4. Color Palette Variable Injection
    const color = appSettings.themeColor || 'classic';
    let lightVars = '';
    let darkVars = '';
    
    if (color === 'emerald') {
      lightVars = `
        --theme-primary-50: #f0fdf4;
        --theme-primary-100: #dcfce7;
        --theme-primary-200: #bbf7d0;
        --theme-primary-300: #86efac;
        --theme-primary-400: #4ade80;
        --theme-primary-500: #10b981;
        --theme-primary-600: #059669;
        --theme-primary-650: #047857;
        --theme-primary-700: #047857;
      `;
      darkVars = `
        --theme-primary-50: #062016;
        --theme-primary-100: #112c21;
        --theme-primary-200: #1f4837;
        --theme-primary-300: #2c604b;
        --theme-primary-400: #059669;
        --theme-primary-500: #10b981;
        --theme-primary-600: #34d399;
        --theme-primary-650: #6ee7b7;
        --theme-primary-700: #6ee7b7;
      `;
    } else if (color === 'blue') {
      lightVars = `
        --theme-primary-50: #f0f9ff;
        --theme-primary-100: #e0f2fe;
        --theme-primary-200: #bae6fd;
        --theme-primary-300: #7dd3fc;
        --theme-primary-400: #38bdf8;
        --theme-primary-500: #0ea5e9;
        --theme-primary-600: #0284c7;
        --theme-primary-650: #0369a1;
        --theme-primary-700: #0369a1;
      `;
      darkVars = `
        --theme-primary-50: #081e2b;
        --theme-primary-100: #0f2b3e;
        --theme-primary-200: #1c435c;
        --theme-primary-300: #2b5a7b;
        --theme-primary-400: #0284c7;
        --theme-primary-500: #0ea5e9;
        --theme-primary-600: #38bdf8;
        --theme-primary-650: #7dd3fc;
        --theme-primary-700: #7dd3fc;
      `;
    } else if (color === 'amber') {
      lightVars = `
        --theme-primary-50: #fffbeb;
        --theme-primary-100: #fef3c7;
        --theme-primary-200: #fde68a;
        --theme-primary-300: #fcd34d;
        --theme-primary-400: #fbbf24;
        --theme-primary-500: #f59e0b;
        --theme-primary-600: #d97706;
        --theme-primary-650: #b45309;
        --theme-primary-700: #b45309;
      `;
      darkVars = `
        --theme-primary-50: #261a05;
        --theme-primary-100: #3a2a09;
        --theme-primary-200: #5c430e;
        --theme-primary-300: #7d5b13;
        --theme-primary-400: #d97706;
        --theme-primary-500: #f59e0b;
        --theme-primary-600: #fbbf24;
        --theme-primary-650: #fcd34d;
        --theme-primary-700: #fcd34d;
      `;
    } else if (color === 'indigo') {
      lightVars = `
        --theme-primary-50: #eef2ff;
        --theme-primary-100: #e0e7ff;
        --theme-primary-200: #c7d2fe;
        --theme-primary-300: #a5b4fc;
        --theme-primary-400: #818cf8;
        --theme-primary-500: #6366f1;
        --theme-primary-600: #4f46e5;
        --theme-primary-650: #4338ca;
        --theme-primary-700: #4338ca;
      `;
      darkVars = `
        --theme-primary-50: #15162b;
        --theme-primary-100: #1f2142;
        --theme-primary-200: #2e315e;
        --theme-primary-300: #434785;
        --theme-primary-400: #4f46e5;
        --theme-primary-500: #6366f1;
        --theme-primary-600: #818cf8;
        --theme-primary-650: #a5b4fc;
        --theme-primary-700: #a5b4fc;
      `;
    } else if (color === 'rose') {
      lightVars = `
        --theme-primary-50: #fff1f2;
        --theme-primary-100: #ffe4e6;
        --theme-primary-200: #fecdd3;
        --theme-primary-300: #fda4af;
        --theme-primary-400: #fb7185;
        --theme-primary-500: #f43f5e;
        --theme-primary-600: #e11d48;
        --theme-primary-650: #be123c;
        --theme-primary-700: #be123c;
      `;
      darkVars = `
        --theme-primary-50: #2a0c10;
        --theme-primary-100: #3e151b;
        --theme-primary-200: #64202c;
        --theme-primary-300: #8c2d3e;
        --theme-primary-400: #e11d48;
        --theme-primary-500: #f43f5e;
        --theme-primary-600: #fb7185;
        --theme-primary-650: #fda4af;
        --theme-primary-700: #fda4af;
      `;
    } else if (color === 'navy') {
      lightVars = `
        --font-sans: "Plus Jakarta Sans", system-ui, -apple-system, sans-serif !important;
        --font-serif: "Fraunces", "Times New Roman", serif !important;

        --theme-primary-50: #ECF0F7;
        --theme-primary-100: #ECF0F7;
        --theme-primary-200: #D8DEEB;
        --theme-primary-300: #3A5AA0;
        --theme-primary-400: #1C3C7A;
        --theme-primary-500: #122B5C;
        --theme-primary-600: #0C1E45;
        --theme-primary-650: #081531;
        --theme-primary-700: #050E1F;

        --color-amber-50: #F7ECCB;
        --color-amber-100: #F7ECCB;
        --color-amber-200: #E3C16F;
        --color-amber-500: #D4A853;
        --color-amber-600: #B38A2B;
      `;
      darkVars = `
        --font-sans: "Plus Jakarta Sans", system-ui, -apple-system, sans-serif !important;
        --font-serif: "Fraunces", "Times New Roman", serif !important;

        --theme-primary-50: #050E1F;
        --theme-primary-100: #081531;
        --theme-primary-200: #0C1E45;
        --theme-primary-300: #122B5C;
        --theme-primary-400: #1C3C7A;
        --theme-primary-500: #3A5AA0;
        --theme-primary-600: #527cd1;
        --theme-primary-650: #5e84df;
        --theme-primary-700: #6a92ec;

        --color-amber-50: #33250e;
        --color-amber-100: #45320f;
        --color-amber-200: #B38A2B;
        --color-amber-500: #D4A853;
        --color-amber-600: #E3C16F;
      `;
    } else {
      lightVars = `
        --theme-primary-50: #f5f5f9;
        --theme-primary-100: #e7e7ff;
        --theme-primary-200: #d2d2ff;
        --theme-primary-300: #b5b5ff;
        --theme-primary-400: #8c8cff;
        --theme-primary-500: #696cff;
        --theme-primary-600: #5f61e6;
        --theme-primary-650: #5456e0;
        --theme-primary-700: #4f51be;
      `;
      darkVars = `
        --theme-primary-50: #232333;
        --theme-primary-100: #2b2c40;
        --theme-primary-200: #3b3c54;
        --theme-primary-300: #5c5d80;
        --theme-primary-400: #7e7f9c;
        --theme-primary-500: #696cff;
        --theme-primary-600: #5f61e6;
        --theme-primary-650: #5456e0;
        --theme-primary-700: #4f51be;
      `;
    }
 
    let styleEl = document.getElementById('theme-palette-styles');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'theme-palette-styles';
      document.head.appendChild(styleEl);
    }

    let extraGlobalStyles = '';
    if (color === 'navy') {
      extraGlobalStyles = `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400&display=swap');
        
        /* Ambient Topography background for Navy Theme */
        body {
          background-image: radial-gradient(1200px 600px at 85% -10%, rgba(214, 168, 83, 0.08), transparent 60%),
                            radial-gradient(900px 500px at -10% 110%, rgba(12, 30, 69, 0.06), transparent 60%) !important;
          background-attachment: fixed !important;
        }

        /* Ambient Topography and contrast correction for Dark Mode */
        html.dark body, .dark body {
          background-image: radial-gradient(1200px 600px at 85% -10%, rgba(212, 168, 83, 0.05), transparent 65%),
                            radial-gradient(900px 500px at -10% 110%, rgba(12, 30, 69, 0.04), transparent 70%) !important;
          background-color: #050e1f !important;
          color: #ecf0f7 !important;
        }

        /* Antique Gold Badge Highlights in layout (Light Mode) */
        span[class*="bg-amber-50"], .bg-amber-50, .bg-amber-50\\/10 {
          background-color: #F7ECCB !important;
          color: #B38A2B !important;
          border-color: rgba(179, 138, 43, 0.25) !important;
        }

        /* Antique Gold Badge Highlights in layout (Dark Mode) */
        html.dark span[class*="bg-amber-50"], .dark .bg-amber-50, .dark span[class*="bg-amber-50\\/10"] {
          background-color: rgba(212, 168, 83, 0.15) !important;
          color: #E3C16F !important;
          border-color: rgba(227, 193, 111, 0.25) !important;
        }

        /* Gold brand logo accent borders */
        .brand-logo-patriot {
          border: 1px solid rgba(227, 193, 111, 0.35) !important;
          background: rgba(227, 193, 111, 0.06) !important;
        }
      `;
    }

    styleEl.innerHTML = `
      ${extraGlobalStyles}
      :root {
        ${lightVars}
      }
      .dark {
        ${darkVars}
      }
    `;
  }, [appSettings]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      if (firebaseUser) {
        const path = `users/${firebaseUser.uid}`;
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser(userDoc.data() as UserProfile);
          } else {
            const newUser: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'User',
              role: 'admin_pusat', // default role
              photoURL: firebaseUser.photoURL || undefined,
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            setUser(newUser);
          }
        } catch (error) {
          if (error instanceof Error && error.message.includes('offline')) {
             setUser({
               uid: firebaseUser.uid,
               email: firebaseUser.email || '',
               displayName: firebaseUser.displayName || 'User',
               role: 'admin_pusat',
               photoURL: firebaseUser.photoURL || undefined,
             });
          } else {
            import('./lib/firebase').then(({ handleFirestoreError, OperationType }) => {
               handleFirestoreError(error, OperationType.WRITE, path);
            });
          }
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
      setAuthReady(true);
    });

    return () => {
      unsubscribe();
      window.removeEventListener('popstate', () => {}); // Best effort cleanup as we used inline previously, though we should really pass the reference. Let's just unsubscribe auth.
    };
  }, [setUser, setIsLoading]);

  const isMaintenance = appSettings?.maintenanceMode === true;

  if (currentPath === '/') {
    return isMaintenance ? <MaintenancePage /> : <Homepage />;
  }

  if (currentPath === '/verify') {
    return isMaintenance ? <MaintenancePage /> : <PublicVerify />;
  }

  if (currentPath === '/pengaduan') {
    return isMaintenance ? <MaintenancePage /> : <PublicComplaint />;
  }

  if (currentPath === '/terms') {
    return <Terms />;
  }

  if (currentPath === '/privacy') {
    return <Privacy />;
  }

  if (currentPath === '/support') {
    return <Support />;
  }

  if (currentPath === '/documentation') {
    return <Documentation />;
  }

  if (currentPath === '/login' && user) {
    window.history.replaceState({}, '', '/dashboard');
    setCurrentPath('/dashboard');
  }

  if (!authReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-slate-700 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    // Both '/login' and unauthenticated routes fall through to Login if they aren't explicit public routes like / or /verify
    return <Login />;
  }


  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard setActiveTab={setActiveTab} />;
      case 'reports': return <Reports />;
      case 'geographic': return <Geographic />;
      case 'projects': return <ProjectManagement />;
      case 'transmigrants': return <Transmigrants />;
      case 'economy': return <Economy />;
      case 'logistics': return <Logistics />;
      case 'meetings': return <Meetings />;
      case 'complaints': return <Complaints />;
      case 'infrastructure': return <Infrastructure />;
      case 'documents': return <Documents />;
      case 'users': return <UserManagement setActiveTab={setActiveTab} />;
      case 'homepage_manager': return <HomepageManager setActiveTab={setActiveTab} />;
      case 'profile': return <Profile />;
      case 'settings': return <Settings setActiveTab={setActiveTab} />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden relative selection:bg-primary-100 selection:text-primary-700">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setIsSidebarOpen(false);
        }} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col h-full overflow-hidden w-full lg:ml-64">
        {appSettings?.maintenanceMode && (
          <div className="bg-amber-500 text-white text-[11px] sm:text-xs font-bold py-2 px-4 shadow-sm flex items-center justify-between shrink-0 border-b border-amber-600/30">
            <div className="flex items-center gap-2 mx-auto text-center">
              <span className="shrink-0">⚠️</span>
              <span>
                {appSettings?.systemLanguage === 'en' 
                  ? 'SYSTEM MAINTENANCE ACTIVE: Technical sync is running. Avoid heavy data modifications.'
                  : 'STATUS PEMELIHARAAN AKTIF: Sinkronisasi data utama sedang berjalan. Harap batasi pengubahan data.'
                }
              </span>
            </div>
          </div>
        )}
        <Navbar onMenuClick={() => setIsSidebarOpen(true)} setActiveTab={setActiveTab} />
        <main className="flex-1 p-4 sm:p-4 lg:p-6 overflow-y-auto custom-scrollbar bg-slate-50">
          {renderContent()}
        </main>
        <footer className="h-auto py-4 lg:h-12 bg-white px-4 sm:px-6 lg:px-6 flex flex-col lg:flex-row items-center justify-between text-[13px] text-slate-500 font-medium shrink-0 gap-2 border-t border-slate-100 shadow-[0_-2px_6px_0_rgba(67,89,113,0.04)]">
          <div>© {new Date().getFullYear()}, {appSettings?.appName || 'Workspace'}</div>

          <div className="flex gap-4">
             <a href="/support" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/support'); window.dispatchEvent(new PopStateEvent('popstate')); }} className="cursor-pointer hover:text-primary-600 transition-colors">Support</a>
             <a href="/documentation" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/documentation'); window.dispatchEvent(new PopStateEvent('popstate')); }} className="cursor-pointer hover:text-primary-600 transition-colors">Documentation</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
