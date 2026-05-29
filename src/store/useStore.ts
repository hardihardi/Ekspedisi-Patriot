import { create } from 'zustand';
import { UserProfile, Project } from '../types';

export interface UserManageType {
  id: string;
  name: string;
  email: string;
  role: string;
  lastActive: string;
  nip?: string;
  department?: string;
  phone?: string;
  address?: string;
  photoURL?: string;
}

const INITIAL_USERS: UserManageType[] = [
  { id: '1', name: 'Admin Utama', email: 'admin@example.com', role: 'superadmin', lastActive: 'Aktif Sekarang', nip: '198001012005011001', department: 'Pusat', phone: '08123456789', address: 'Jakarta' },
  { id: '2', name: 'Dewi Lestari', email: 'dewi@papua.go.id', role: 'admin_daerah', lastActive: '2 Jam lalu', nip: '198501012010012002', department: 'Daerah Papua', phone: '08129876543', address: 'Merauke' },
  { id: '3', name: 'Johan Bakrie', email: 'johan@bps.go.id', role: 'petugas_lapangan', lastActive: 'Kemarin', nip: '199001012015011003', department: 'BPS', phone: '08561234567', address: 'Jakarta' },
  { id: '4', name: 'User Baru', email: 'user@example.com', role: 'petugas_lapangan', lastActive: 'Aktif Kembali', nip: '', department: '', phone: '', address: '' },
];

interface AppState {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  projects: Project[];
  setProjects: (projects: Project[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  managedUsers: UserManageType[];
  setManagedUsers: (users: UserManageType[]) => void;
  updateManagedUser: (id: string, data: Partial<UserManageType>) => void;
  syncUserToManagedList: (email: string, data: Partial<UserManageType>) => void;
  appSettings: any;
  setAppSettings: (settings: any) => void;
  language: 'id' | 'en';
  setLanguage: (lang: 'id' | 'en') => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  projects: [],
  setProjects: (projects) => set({ projects }),
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  appSettings: {
    appName: 'Sistem Informasi 3T',
    instansiName: 'Kementerian Desa PDTT',
    supportEmail: 'support@sistem-3t.go.id',
    supportHotline: '1500-123',
    supportAddress: 'Ditjen PKP2Trans, Kementerian Desa PDTT\nJalan TMP Kalibata No.17, Pancoran,\nKota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12750\nGedung Utama Lt. 4',
    footerDescription: 'Sistem Informasi Terpadu Pelaporan, Pendataan, dan Evaluasi Perkembangan Kawasan Transmigrasi Lokus 3T.',
    footerDescriptionEn: 'Integrated Information System for Reporting, Recording, and Progress Evaluation of 3T Transmigration Areas.',
    docsVersion: '1.2.0'
  },
  setAppSettings: (settings) => set((state) => ({ appSettings: { ...state.appSettings, ...settings } })),
  language: (localStorage.getItem('language') as 'id' | 'en') || 'id',
  setLanguage: (lang) => {
    localStorage.setItem('language', lang);
    set({ language: lang });
  },
  managedUsers: INITIAL_USERS,
  setManagedUsers: (users) => set({ managedUsers: users }),
  updateManagedUser: (id, data) => set((state) => ({
    managedUsers: state.managedUsers.map(u => u.id === id ? { ...u, ...data } : u)
  })),
  syncUserToManagedList: (email, data) => set((state) => {
    const exists = state.managedUsers.some(u => u.email === email);
    if (exists) {
      return {
        managedUsers: state.managedUsers.map(u => u.email === email ? { ...u, ...data } : u)
      };
    } else {
       // if not exists, create new
       return {
         managedUsers: [...state.managedUsers, { id: Math.random().toString(), name: data.name || '', email: email, role: data.role || 'petugas_lapangan', lastActive: 'Baru Saja', ...data }]
       }
    }
  }),
}));
