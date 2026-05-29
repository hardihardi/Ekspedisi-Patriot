import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, User, Menu, LogOut, Settings as SettingsIcon, AlertCircle, MessageSquare, CheckCircle2, Clock, X, Check, Sun, Moon, Monitor, Globe } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { auth, db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { translations } from '../../lib/translations';

interface NavbarProps {
  onMenuClick: () => void;
  setActiveTab?: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick, setActiveTab }) => {
  const { user, appSettings, language, setLanguage } = useStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(
    (localStorage.getItem('theme') as any) || 'system'
  );
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const themeDropdownRef = useRef<HTMLDivElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  const t = translations[language];

  // Mock Notifications Data
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'Laporan Baru Masuk',
      desc: 'Terdapat pengaduan infrastruktur baru di Distrik Muting.',
      time: 'Baru saja',
      type: 'alert',
      isUnread: true
    },
    {
      id: 2,
      title: 'Balasan Diskusi',
      desc: 'Admin Pusat memberikan tanggapan pada laporan logistik.',
      time: '1 jam yang lalu',
      type: 'message',
      isUnread: true
    },
    {
      id: 3,
      title: 'Laporan Selesai',
      desc: 'Keluhan terkait aksesibilitas telah ditandai selesai.',
      time: 'Kemarin',
      type: 'success',
      isUnread: false
    }
  ]);
  
  const unreadCount = notifications.filter(n => n.isUnread).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isUnread: false })));
  };

  const [toastPopup, setToastPopup] = useState<any>(null);

  useEffect(() => {
    if (user?.role !== 'admin_pusat' && user?.role !== 'superadmin') return;

    const mountTime = Date.now();

    const q = query(
      collection(db, 'complaints'),
      where('priority', '==', 'High')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const comp = change.doc.data();
          const compTime = new Date(comp.createdAt).getTime();

          if (compTime > mountTime) {
            const newNotif = {
              id: Date.now() + Math.random(),
              title: 'Laporan Mendesak Baru',
              desc: `Pengaduan High: ${comp.subject}`,
              time: 'Baru saja',
              type: 'alert',
              isUnread: true
            };
            
            setNotifications(prev => [newNotif, ...prev]);
            setToastPopup(newNotif);
            
            setTimeout(() => setToastPopup(null), 5000);
          }
        }
      });
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const applyTheme = () => {
      const isDark = theme === 'dark' || (theme === 'system' && mediaQuery.matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    
    applyTheme();

    const listener = () => applyTheme();
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target as Node)) {
        setIsThemeOpen(false);
      }
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleProfileClick = (tabId: string) => {
    if (setActiveTab) {
      setActiveTab(tabId);
    }
    setIsProfileOpen(false);
  };

  return (
    <div className="px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 pb-2 sticky top-0 z-40 bg-slate-50/90 backdrop-blur-md">
      <div className="h-14 sm:h-[62px] bg-white rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] flex items-center justify-between px-3 sm:px-6 border-0">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <button 
            onClick={onMenuClick}
            className="lg:hidden p-1.5 sm:p-2 text-slate-500 hover:bg-slate-50 rounded-lg shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="lg:hidden flex items-center gap-1.5 mr-1 min-w-0">
            {appSettings?.logoUrl && <img src={appSettings.logoUrl} alt="Logo" className="h-5 sm:h-6 object-contain shrink-0" />}
            <span className="font-bold text-slate-800 text-xs sm:text-sm tracking-tight truncate max-w-[80px] min-[380px]:max-w-[120px] sm:max-w-none">
              {appSettings?.appName || 'Workspace'}
            </span>
          </div>
          <div className="hidden md:flex items-center gap-2 w-64 text-slate-400 group">
            <Search className="w-4 h-4 group-focus-within:text-primary-600 transition-colors" />
            <input 
              type="text" 
              placeholder={t.search} 
              className="bg-transparent border-none outline-none text-[15px] font-sans w-full text-slate-600 placeholder-slate-400 focus:ring-0"
            />
          </div>
        </div>
  
        <div className="flex items-center gap-1.5 sm:gap-3 font-sans shrink-0">
          {/* Language Switcher */}
          <div className="relative flex items-center" ref={langDropdownRef}>
            <button 
              onClick={() => setIsLangOpen(!isLangOpen)}
              className={cn(
                "relative flex items-center gap-1 p-1 sm:p-2 transition-all rounded-full border border-slate-100 bg-slate-50/55 shadow-xs",
                isLangOpen ? "bg-primary-600/10 text-primary-600 border-primary-200" : "text-slate-500 hover:text-primary-600 hover:bg-primary-600/10 hover:border-primary-100"
              )}
              title={language === 'id' ? 'Ubah Bahasa' : 'Change Language'}
            >
              <Globe className="w-[16px] sm:w-[20px] h-[16px] sm:h-[20px] text-slate-500 hover:text-primary-600" />
              <span className="text-[10px] sm:text-[12px] font-bold uppercase tracking-wider pr-0.5 select-none text-slate-700">
                {language === 'id' ? 'ID' : 'EN'}
              </span>
            </button>
            
            <AnimatePresence>
              {isLangOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden z-50 flex flex-col py-2"
                >
                  <div className="px-4 py-1.5 border-b border-slate-50 mb-1.5">
                    <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">
                      {language === 'id' ? 'Pilih Bahasa' : 'Select Language'}
                    </span>
                  </div>

                  <button 
                    onClick={() => { setLanguage('id'); setIsLangOpen(false); }} 
                    className={cn(
                      "flex items-center justify-between px-4 py-2.5 text-[13px] font-bold transition-all text-left", 
                      language === 'id' ? "text-primary-600 bg-primary-600/5" : "text-slate-650 hover:bg-slate-50"
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-base">🇮🇩</span> {t.indonesian}
                    </span>
                    {language === 'id' && <Check className="w-4 h-4 text-primary-600 stroke-[3]" />}
                  </button>

                  <button 
                    onClick={() => { setLanguage('en'); setIsLangOpen(false); }} 
                    className={cn(
                      "flex items-center justify-between px-4 py-2.5 text-[13px] font-bold transition-all text-left", 
                      language === 'en' ? "text-primary-600 bg-primary-600/5" : "text-slate-650 hover:bg-slate-50"
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-base">🇬🇧</span> {t.english}
                    </span>
                    {language === 'en' && <Check className="w-4 h-4 text-primary-600 stroke-[3]" />}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Theme Switcher */}
          <div className="relative flex items-center" ref={themeDropdownRef}>
            <button 
              onClick={() => setIsThemeOpen(!isThemeOpen)}
              className={cn(
                "relative p-1.5 sm:p-2 transition-colors rounded-full",
                isThemeOpen ? "bg-primary-600/10 text-primary-600" : "text-slate-400 hover:text-primary-600 hover:bg-primary-600/10"
              )}
            >
              {theme === 'light' && <Sun className="w-[18px] sm:w-[22px] h-[18px] sm:h-[22px]" />}
              {theme === 'dark' && <Moon className="w-[18px] sm:w-[22px] h-[18px] sm:h-[22px]" />}
              {theme === 'system' && <Monitor className="w-[18px] sm:w-[22px] h-[18px] sm:h-[22px]" />}
            </button>
            
            <AnimatePresence>
              {isThemeOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-40 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden z-50 flex flex-col py-2"
                >
                  <button onClick={() => { setTheme('light'); setIsThemeOpen(false); }} className={cn("flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold transition-colors", theme === 'light' ? "text-primary-600 bg-primary-600/10" : "text-slate-650 hover:bg-slate-50")}>
                    <Sun className="w-[18px] h-[18px]" /> {t.light}
                  </button>
                  <button onClick={() => { setTheme('dark'); setIsThemeOpen(false); }} className={cn("flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold transition-colors", theme === 'dark' ? "text-primary-600 bg-primary-600/10" : "text-slate-650 hover:bg-slate-50")}>
                    <Moon className="w-[18px] h-[18px]" /> {t.dark}
                  </button>
                  <button onClick={() => { setTheme('system'); setIsThemeOpen(false); }} className={cn("flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold transition-colors", theme === 'system' ? "text-primary-600 bg-primary-600/10" : "text-slate-650 hover:bg-slate-50")}>
                    <Monitor className="w-[18px] h-[18px]" /> {t.system}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Notifications Dropdown */}
          <div className="relative flex items-center" ref={notifDropdownRef}>
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className={cn(
                "relative p-1.5 sm:p-2 transition-colors rounded-full",
                isNotificationsOpen ? "bg-primary-600/10 text-primary-600" : "text-slate-400 hover:text-primary-600 hover:bg-primary-600/10"
              )}
            >
              <Bell className="w-[18px] sm:w-[22px] h-[18px] sm:h-[22px]" />
              {unreadCount > 0 && (
                <span className="absolute top-[4px] right-[4px] sm:top-[6px] sm:right-[6px] w-[7px] sm:w-[9px] h-[7px] sm:h-[9px] bg-red-500 rounded-full border border-white animate-pulse"></span>
              )}
            </button>

            <AnimatePresence>
              {isNotificationsOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-[280px] min-[380px]:w-[340px] sm:w-[380px] bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden z-50 flex flex-col"
                >
                  <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">{t.notifications}</h3>
                      <p className="text-[11px] text-slate-500 font-medium font-sans">
                        {language === 'id' ? `Anda memiliki ${unreadCount} pesan belum dibaca` : `You have ${unreadCount} unread messages`}
                      </p>
                    </div>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllAsRead} 
                        className="text-[11px] font-bold text-primary-600 hover:bg-primary-600/10 px-2 py-1 rounded-md transition-colors flex items-center gap-1 font-sans"
                      >
                        <Check className="w-3 h-3" /> {t.markAsRead}
                      </button>
                    )}
                  </div>
                  
                  <div className="flex flex-col max-h-[380px] overflow-y-auto custom-scrollbar bg-white">
                    {notifications.length === 0 ? (
                      <div className="py-10 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                          <Bell className="w-5 h-5 text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-600">{t.noNewNotif}</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          className={cn(
                            "px-5 py-4 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-4 relative cursor-pointer group",
                            notif.isUnread ? "bg-primary-600/5" : "bg-white"
                          )}
                        >
                          {notif.isUnread && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-600/10"></div>}
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                            notif.type === 'alert' ? "bg-red-50 text-red-500" :
                            notif.type === 'message' ? "bg-primary-600/10 text-primary-600" :
                            "bg-green-50 text-green-600"
                          )}>
                            {notif.type === 'alert' && <AlertCircle className="w-5 h-5" />}
                            {notif.type === 'message' && <MessageSquare className="w-5 h-5" />}
                            {notif.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                              <h4 className={cn("text-[13px] font-bold truncate pr-3 group-hover:text-primary-600 transition-colors", notif.isUnread ? "text-slate-900" : "text-slate-700")}>
                                {notif.title}
                              </h4>
                              <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap flex items-center gap-1 shrink-0 mt-0.5">
                                <Clock className="w-3 h-3" /> {notif.time}
                              </span>
                            </div>
                            <p className="text-[12px] text-slate-500 leading-snug line-clamp-2">
                              {notif.desc}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div className="p-3 border-t border-slate-100 bg-white text-center">
                    <button className="text-[12px] font-bold text-slate-600 hover:text-primary-600 uppercase tracking-widest hover:bg-slate-50 w-full py-2 rounded-lg transition-colors">
                      {t.viewAllNotif}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <div 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="relative flex items-center gap-2 rounded-full transition-transform cursor-pointer hover:scale-105 active:scale-95"
            >
              <div className="w-[30px] sm:w-[38px] h-[30px] sm:h-[38px] bg-primary-600/10 rounded-full flex items-center justify-center overflow-hidden border-2 border-slate-100 shadow-sm shrink-0">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-[14px] sm:w-[18px] h-[14px] sm:h-[18px] text-primary-600" />
                )}
              </div>
              <span className="absolute bottom-0 right-0 w-[8px] sm:w-[10px] h-[8px] sm:h-[10px] bg-[#28c76f] border-2 border-white rounded-full"></span>
            </div>
  
            <AnimatePresence>
              {isProfileOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden z-50 flex flex-col py-2"
                >
                  <div className="px-4 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-600/10 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                       {user?.photoURL ? (
                        <img src={user.photoURL} alt="profile" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-primary-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{user?.displayName || 'User'}</p>
                      <p className="text-[11px] text-slate-500 font-medium capitalize truncate mt-0.5">{user?.role?.replace('_', ' ') || 'Admin'}</p>
                    </div>
                  </div>
                  <div className="h-[1px] bg-slate-100 my-1"></div>
                  <div className="px-2 space-y-0.5">
                    <button 
                      onClick={() => handleProfileClick('profile')}
                      className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-slate-600 hover:text-primary-600 hover:bg-primary-600/10 rounded-lg transition-colors font-medium"
                    >
                      <User className="w-[18px] h-[18px]" />
                      {t.profile}
                    </button>
                    <button 
                      onClick={() => handleProfileClick('settings')}
                      className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-slate-600 hover:text-primary-600 hover:bg-primary-600/10 rounded-lg transition-colors font-medium"
                    >
                      <SettingsIcon className="w-[18px] h-[18px]" />
                      {t.settings}
                    </button>
                  </div>
                  <div className="h-[1px] bg-slate-100 my-1"></div>
                  <div className="px-2 mt-1">
                    <button 
                      onClick={() => auth.signOut()}
                      className="w-full flex items-center gap-3 px-3 py-2 text-[14px] font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <LogOut className="w-[18px] h-[18px]" />
                      {t.logout}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {toastPopup && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-20 right-4 sm:right-8 z-50 bg-white shadow-xl shadow-red-500/10 border border-red-100 rounded-xl p-4 flex gap-3 max-w-sm"
          >
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">{toastPopup.title}</h4>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{toastPopup.desc}</p>
            </div>
            <button onClick={() => setToastPopup(null)} className="absolute top-2 right-2 text-slate-400 hover:text-slate-600">
               <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
