import React from 'react';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  Briefcase, 
  Users, 
  FileText, 
  Settings as SettingsIcon,
  ChevronRight,
  Package,
  MessageSquare,
  AlertCircle,
  Calendar,
  Building2,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useStore } from '../../store/useStore';
import { translations } from '../../lib/translations';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, onClose }) => {
  const mainItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'geographic', label: 'Peta Geografis', icon: MapIcon },
    { id: 'projects', label: 'Project Tracking', icon: Briefcase },
    { id: 'transmigrants', label: 'Data Transmigran', icon: Users },
    { id: 'economy', label: 'Ekonomi Masyarakat', icon: TrendingUp },
    { id: 'infrastructure', label: 'Infrastruktur 3T', icon: Building2 },
    { id: 'logistics', label: 'Logistik & Jadup', icon: Package },
    { id: 'meetings', label: 'Rapat & Notulen', icon: Calendar },
    { id: 'complaints', label: 'Pusat Pengaduan', icon: AlertCircle },
    { id: 'documents', label: 'Cloud Dokumen', icon: FileText },
    { id: 'reports', label: 'Laporan & Analisis', icon: BarChart3 },
  ];

  const { user, appSettings, language } = useStore();
  const t = translations[language];

  const systemItems = [
    ...(user?.role === 'superadmin' || user?.role === 'admin_pusat' || user?.role === 'admin_daerah' 
      ? [
          { id: 'homepage_manager', label: 'Manajemen Beranda', icon: LayoutDashboard },
          { id: 'users', label: 'Manajemen User', icon: Users }
        ] 
      : []),
    { id: 'settings', label: 'Pengaturan App', icon: SettingsIcon },
  ];

  const renderItem = (item: { id: string, label: string, icon: any }) => {
    const isActive = activeTab === item.id;
    const Icon = item.icon;
    const localizedLabel = (t as any)[`sidebar_${item.id}`] || item.label;
    return (
      <button
        key={item.id}
        onClick={() => setActiveTab(item.id)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-[9px] rounded-lg transition-all text-[14.5px] font-medium my-0.5 outline-none font-sans border-none relative overflow-hidden",
          isActive 
            ? "bg-primary-600/10 text-primary-600 font-bold" 
            : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
        )}
      >
        {isActive && (
          <div className="absolute left-0 top-[20%] bottom-[20%] w-[4px] bg-primary-500 rounded-r-md" />
        )}
        <div className="flex items-center gap-3 pl-1">
          <Icon className={cn("w-[19px] h-[19px]", isActive ? "text-primary-500" : "text-slate-450")} />
          <span>{localizedLabel}</span>
        </div>
        {isActive && (
          <ChevronRight className="w-3.5 h-3.5 text-primary-500 stroke-[3]" />
        )}
      </button>
    );
  };

  return (
    <div className={cn(
      "w-64 h-screen bg-white text-slate-600 flex flex-col fixed left-0 top-0 border-r border-slate-100 z-50 transition-transform duration-300 transform lg:translate-x-0 outline-none shadow-[2px_0_10px_0_rgba(67,89,113,0.03)]",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="px-6 py-5.5 flex items-center justify-between border-b border-slate-50">
        <div className="flex items-center gap-3 mt-1">
          {appSettings?.logoUrl ? (
            <img src={appSettings.logoUrl} alt="Logo" className="max-h-8 object-contain" />
          ) : (
            <div className="w-[32px] h-[32px] bg-primary-500 rounded-lg flex items-center justify-center shadow-[0_4px_10px_rgba(25,118,210,0.3)] shrink-0">
              <span className="text-white font-black text-lg leading-none font-mono tracking-tighter">
                {appSettings?.appName ? appSettings.appName.charAt(0).toUpperCase() : 'T'}
              </span>
            </div>
          )}
          <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-800 flex items-center cursor-pointer select-none">
            {appSettings?.appName || 'Trans3T'}
            <span className="w-1.5 h-1.5 bg-primary-500 rounded-full ml-0.5 mt-2"></span>
          </h1>
        </div>
        <button onClick={onClose} className="lg:hidden p-1 text-slate-400 hover:text-slate-600">
          <ChevronRight className="w-5 h-5 rotate-180" />
        </button>
      </div>
  
        <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto custom-scrollbar bg-white">
          <div>
            <div className="px-4 py-3 text-[11px] font-semibold text-slate-400 tracking-[0.1em] uppercase mb-1">
              {t.appsPages} 
            </div>
            <div className="space-y-0.5">
              {mainItems.map(renderItem)}
            </div>
          </div>
          <div>
            <div className="px-4 py-3 text-[11px] font-semibold text-slate-400 tracking-[0.1em] uppercase mb-1">
              {t.management}
            </div>
            <div className="space-y-0.5">
              {systemItems.map(renderItem)}
            </div>
          </div>
        </nav>
      </div>
    );
  };
