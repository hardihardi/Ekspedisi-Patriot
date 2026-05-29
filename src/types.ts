export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  nip?: string;
  instansi?: string;
  role: 'superadmin' | 'admin_pusat' | 'admin_daerah' | 'petugas_lapangan' | 'pimpinan';
  photoURL?: string;
  coverUrl?: string;
}

export interface Project {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  region: string;
  status: 'Persiapan' | 'Pelaksanaan' | 'Pembinaan';
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: 'To-Do' | 'In Progress' | 'Done';
  assigneeId?: string;
  dueDate?: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  link?: string;
  attendees: string[];
  status: 'Scheduled' | 'Ongoing' | 'Completed';
  notes?: string;
}

export interface CloudDocument {
  id: string;
  name: string;
  url: string;
  folder: string;
  projectId?: string;
  isSigned: boolean;
  signedAt?: string;
  signedBy?: string;
  version: number;
}
