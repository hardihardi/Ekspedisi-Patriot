import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Users,
  Map as MapIcon,
  Briefcase,
  FileCheck,
  TrendingUp,
  Calendar,
  ArrowUpRight,
  AlertCircle,
  Clock,
  ExternalLink,
  MapPin,
  BarChart3,
  MessageSquare,
  Mail,
  Database,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { cn } from "../lib/utils";
import { useStore } from "../store/useStore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, onSnapshot, getDocs } from "firebase/firestore";

const ANALYTICS_DATA = [
  { month: "Jan", value: 400 },
  { month: "Feb", value: 600 },
  { month: "Mar", value: 800 },
  { month: "Apr", value: 500 },
  { month: "Mei", value: 900 },
  { month: "Jun", value: 1100 },
];

interface DashboardProps {
  setActiveTab?: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setActiveTab }) => {
  const { user, appSettings, language } = useStore();
  const isEn = language === "en";

  const [stats, setStats] = useState([
    {
      label: isEn ? "Total Transmigrants" : "Total Transmigran",
      value: "...",
      change: "...",
      icon: Users,
      color: "text-primary-600",
      bg: "bg-primary-600/10",
    },
    {
      label: isEn ? "Active Area" : "Kawasan Aktif",
      value: "...",
      change: "...",
      icon: MapIcon,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: isEn ? "Infrastructure Projects" : "Proyek Infrastruktur",
      value: "...",
      change: "...",
      icon: Briefcase,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: isEn ? "TTE-Signed Documents" : "Dokumen Ber-TTE",
      value: "...",
      change: "...",
      icon: FileCheck,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: isEn ? "Remote 3T Locus" : "Kawasan 3T Terpencil",
      value: "...",
      change: "...",
      icon: MapPin,
      color: "text-rose-600",
      bg: "bg-rose-50",
    },
  ]);
  const [recentComplaints, setRecentComplaints] = useState<any[]>([]);
  const [recentMeetings, setRecentMeetings] = useState<any[]>([]);
  const [pieData, setPieData] = useState([
    { name: isEn ? "Papua (3T)" : "Papua (3T)", value: 0, color: "#2563eb" },
    {
      name: isEn ? "Outside Papua (3T)" : "Luar Papua (3T)",
      value: 0,
      color: "#10b981",
    },
    {
      name: isEn ? "Independent Area" : "Kawasan Mandiri",
      value: 0,
      color: "#f59e0b",
    },
  ]);
  const [gatewayLogs, setGatewayLogs] = useState<any[]>([]);
  const [totalNotifications, setTotalNotifications] = useState<number>(0);

  useEffect(() => {
    let transmigrantsCount = 0;
    let unsLogs: any = null;
    let projectsCount = 0;
    let tasksCount = 0;
    let docsCount = 0;
    let terpencilCount = 0;

    // Default 5 stats layout
    // We add 'Kawasan 3T Terpencil' as requested
    const defaultStats = [
      {
        label: isEn ? "Total Transmigrants" : "Total Transmigran",
        value: "...",
        change: "...",
        icon: Users,
        color: "text-primary-600",
        bg: "bg-primary-600/10",
      },
      {
        label: isEn ? "Active Area" : "Kawasan Aktif",
        value: "...",
        change: "...",
        icon: MapIcon,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
      },
      {
        label: isEn ? "Infrastructure Projects" : "Proyek Infrastruktur",
        value: "...",
        change: "...",
        icon: Briefcase,
        color: "text-purple-600",
        bg: "bg-purple-50",
      },
      {
        label: isEn ? "TTE-Signed Documents" : "Dokumen Ber-TTE",
        value: "...",
        change: "...",
        icon: FileCheck,
        color: "text-amber-600",
        bg: "bg-amber-50",
      },
      {
        label: isEn ? "Remote 3T Locus" : "Kawasan 3T Terpencil",
        value: "...",
        change: "...",
        icon: MapPin,
        color: "text-rose-600",
        bg: "bg-rose-50",
      },
    ];
    setStats(defaultStats);

    const qTrans = query(collection(db, "transmigrants"));
    const unsT = onSnapshot(qTrans, (snap) => {
      transmigrantsCount = snap.size;
      updateStats();
    });

    const qProj = query(collection(db, "projects"));
    const unsP = onSnapshot(qProj, (snap) => {
      projectsCount = snap.size;

      let papua3T = 0;
      let luarPapua3T = 0;
      let mandiri = 0;
      let terpencil = 0;

      snap.forEach((doc) => {
        const data = doc.data();
        // Menghitung kawasan yang masuk kategori Terpencil atau merupakan 3T secara general
        if (
          data.is3T ||
          (data.category && data.category.toLowerCase() === "terpencil")
        ) {
          terpencil++;
        }

        if (data.is3T) {
          if ((data.region || "").toLowerCase().includes("papua")) {
            papua3T++;
          } else {
            luarPapua3T++;
          }
        } else {
          mandiri++;
        }
      });

      terpencilCount = terpencil;
      const total = papua3T + luarPapua3T + mandiri;
      if (total > 0) {
        setPieData([
          {
            name: "Papua (3T)",
            value: Math.round((papua3T / total) * 100),
            color: "#2563eb",
          },
          {
            name: "Luar Papua (3T)",
            value: Math.round((luarPapua3T / total) * 100),
            color: "#10b981",
          },
          {
            name: "Kawasan Mandiri",
            value: Math.round((mandiri / total) * 100),
            color: "#f59e0b",
          },
        ]);
      }

      updateStats();
    });

    const qTasks = query(collection(db, "tasks"));
    const unsTa = onSnapshot(qTasks, (snap) => {
      tasksCount = snap.size;
      updateStats();
    });

    const qDocs = query(collection(db, "documents"));
    const unsD = onSnapshot(qDocs, (snap) => {
      let count = 0;
      snap.forEach((d) => {
        if (d.data().isSigned) count++;
      });
      docsCount = count;
      updateStats();
    });

    const qComp = query(collection(db, "complaints"));
    const unsComp = onSnapshot(qComp, (snap) => {
      const items = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .slice(0, 3);
      setRecentComplaints(items as any);
    });

    // Register real-time notification logs and count
    const qLogs = query(collection(db, "notification_logs"));
    unsLogs = onSnapshot(qLogs, (snapshot) => {
      setTotalNotifications(snapshot.size);
      const sorted = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort(
          (a: any, b: any) =>
            new Date(b.timestamp || 0).getTime() -
            new Date(a.timestamp || 0).getTime(),
        )
        .slice(0, 4);
      setGatewayLogs(sorted);
    });

    const qMeet = query(collection(db, "meetings"));
    const unsMeet = onSnapshot(qMeet, (snap) => {
      const items = snap.docs
        .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
        .filter((m) => m.status === "Scheduled")
        .sort((a, b) => {
          const dateA = new Date(`${a.date || ""}T${a.time || "00:00"}`);
          const dateB = new Date(`${b.date || ""}T${b.time || "00:00"}`);
          return dateA.getTime() - dateB.getTime();
        })
        .slice(0, 3);
      setRecentMeetings(items);
    });

    const updateStats = () => {
      setStats([
        {
          label: "Total Transmigran",
          value: transmigrantsCount.toString(),
          change: "+Active",
          icon: Users,
          color: "text-primary-600",
          bg: "bg-primary-600/10",
        },
        {
          label: "Kawasan Aktif",
          value: projectsCount.toString(),
          change: "+Active",
          icon: MapIcon,
          color: "text-emerald-600",
          bg: "bg-emerald-50",
        },
        {
          label: "Proyek Infrastruktur",
          value: tasksCount.toString(),
          change: "Progress",
          icon: Briefcase,
          color: "text-purple-600",
          bg: "bg-purple-50",
        },
        {
          label: "Dokumen Ber-TTE",
          value: docsCount.toString(),
          change: "Signed",
          icon: FileCheck,
          color: "text-amber-600",
          bg: "bg-amber-50",
        },
        {
          label: "Kawasan 3T Terpencil",
          value: terpencilCount.toString(),
          change: "Critical",
          icon: MapPin,
          color: "text-rose-600",
          bg: "bg-rose-50",
        },
      ]);
    };

    return () => {
      unsT();
      unsP();
      unsTa();
      unsD();
      unsComp();
      unsMeet();
      if (unsLogs) unsLogs();
    };
  }, [language]);

  // Additional static data for Sneat-style micro widgets in Dashboard
  const weeklyVisitors = [
    { day: "M", value: 24 },
    { day: "T", value: 43 },
    { day: "W", value: 15 },
    { day: "T", value: 65 },
    { day: "F", value: 32 },
    { day: "S", value: 54 },
    { day: "S", value: 28 },
  ];

  const activityWave = [
    { name: "A1", value: 12 },
    { name: "A2", value: 34 },
    { name: "A3", value: 18 },
    { name: "A4", value: 56 },
    { name: "A5", value: 38 },
    { name: "A6", value: 80 },
    { name: "A7", value: 45 },
    { name: "A8", value: 72 },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans animate-fade-in">
      {/* Top Welcome & Micro Stats Bento Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
        {/* Left Column: Welcome + 4 Micro Stats */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-xl border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] relative overflow-hidden flex flex-col justify-center min-h-[190px]">
            <div className="space-y-4 max-w-[65%]">
              <h3 className="text-base sm:text-lg font-bold text-primary-500">
                {isEn
                  ? `Welcome Back, ${user?.displayName || "User"}! 🎉`
                  : `Selamat Datang, ${user?.displayName || "User"}! 🎉`}
              </h3>
              <p className="text-[12.5px] sm:text-[13.5px] font-medium text-slate-500">
                {appSettings?.instansiName || "Sistem Terpadu Lokus 3T"}
              </p>
              <div>
                <span className="text-[28px] sm:text-[32px] font-black text-primary-500 tracking-tight block leading-none mb-2">
                  {stats[0]?.value || "Rp 48.9k"}
                </span>
                <button
                  onClick={() => setActiveTab?.("projects")}
                  className="px-4 py-2 bg-primary-500 text-white text-[12.5px] font-bold rounded-lg hover:bg-primary-600 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer shadow-[0_2px_4px_rgba(105,108,255,0.4)] shadow-primary-500/40"
                >
                  Lihat Capaian
                </button>
              </div>
            </div>
            {/* Trophy Graphic Element exactly placed on RHS bottom */}
            <div className="absolute right-4 bottom-2 md:right-8 md:bottom-2 select-none pointer-events-none">
              <svg
                className="w-32 h-32 md:w-40 md:h-40 text-primary-200/45"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M18 2H6v2H1v6c0 3.87 3.13 7 7 7h1c1.55 1.55 3.5 2.5 5.5 2.83V21H10v2h4v-2h-3v-1.17c2-.33 3.95-1.28 5.5-2.83h1c3.87 0 7-3.13 7-7V4h-5V2zm-10 11H8c-2.76 0-5-2.24-5-5V6h5v7zm13-5c0 2.76-2.24 5-5 5v-7h5v2z" />
              </svg>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.slice(0, 4).map((stat, i) => {
              const Icon = stat.icon;
              let targetTab = "dashboard";
              if (i === 0) targetTab = "transmigrants";
              if (i === 1) targetTab = "geographic";
              if (i === 2) targetTab = "projects";
              if (i === 3) targetTab = "documents";

              const localizedLabel =
                stat.label === "Total Transmigran" ||
                stat.label === "Total Transmigrants"
                  ? isEn
                    ? "Total Transmigrants"
                    : "Total Transmigran"
                  : stat.label === "Kawasan Aktif" ||
                      stat.label === "Active Area"
                    ? isEn
                      ? "Active Area"
                      : "Kawasan Aktif"
                    : stat.label === "Proyek Infrastruktur" ||
                        stat.label === "Infrastructure Projects"
                      ? isEn
                        ? "Infrastructure Projects"
                        : "Proyek"
                      : stat.label === "Dokumen Ber-TTE" ||
                          stat.label === "TTE-Signed Documents"
                        ? isEn
                          ? "Signed Docs"
                          : "Dokumen TTE"
                        : stat.label;

              const localizedChange =
                stat.change === "+Active"
                  ? isEn
                    ? "+Active"
                    : "+Aktif"
                  : stat.change === "Progress"
                    ? isEn
                      ? "Progress"
                      : "Proses"
                    : stat.change === "Signed"
                      ? isEn
                        ? "Signed"
                        : "TTE"
                      : stat.change === "Critical"
                        ? isEn
                          ? "Critical"
                          : "Kritis"
                        : stat.change;

              return (
                <motion.div
                  key={i}
                  whileHover={{ y: -4, scale: 1.02 }}
                  onClick={() => setActiveTab?.(targetTab)}
                  className="bg-white p-5 rounded-xl border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] cursor-pointer transition-all flex flex-col justify-between h-[150px]"
                >
                  <div className="flex items-start justify-between">
                    <div
                      className={cn(
                        "w-[42px] h-[42px] rounded-xl flex items-center justify-center shrink-0",
                        stat.bg,
                      )}
                    >
                      <Icon className={cn("w-5 h-5", stat.color)} />
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-[13px] text-slate-500 font-semibold block truncate leading-none mb-2">
                      {localizedLabel}
                    </span>
                    <span className="text-2xl font-bold text-slate-700 tracking-tight block leading-none mb-1">
                      {stat.value}
                    </span>
                    <span
                      className={cn(
                        "text-[12px] font-bold",
                        stat.change === "Critical"
                          ? "text-rose-500"
                          : stat.change === "Signed"
                            ? "text-amber-500"
                            : stat.change === "Progress"
                              ? "text-purple-500"
                              : "text-emerald-500",
                      )}
                    >
                      ▲ {localizedChange}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Mini Charts */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-6 flex-1 h-[190px]">
            <div className="bg-white p-5 rounded-xl border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] flex flex-col justify-between overflow-hidden">
              <div>
                <div className="text-slate-500 text-[13px] font-semibold">
                  New Visitors
                </div>
                <div className="text-2xl font-bold text-slate-700 mt-1">
                  23%
                </div>
              </div>
              <div className="h-[60px] w-[120%] -ml-[10%] -mb-5 relative bottom-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyVisitors}>
                    <Bar
                      dataKey="value"
                      fill="var(--theme-primary-500)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] flex flex-col justify-between overflow-hidden relative">
              <div>
                <div className="text-slate-500 text-[13px] font-semibold">
                  Activity
                </div>
                <div className="text-2xl font-bold text-slate-700 mt-1">
                  82%
                </div>
              </div>
              <div className="h-[60px] w-[120%] -ml-[10%] -mb-5 relative bottom-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityWave}>
                    <defs>
                      <linearGradient
                        id="greenWave"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="var(--color-emerald-500)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--color-emerald-500)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="var(--color-emerald-500)"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#greenWave)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] flex-1 h-[150px] relative overflow-hidden flex flex-col justify-center">
            <div className="flex items-center gap-4">
              <div className="w-[84px] h-[84px] border-[6px] border-primary-500 border-r-transparent rounded-full rotate-45 transform"></div>
              <div>
                <h4 className="text-[14px] text-slate-500 font-semibold mb-1">
                  Expenses
                </h4>
                <div className="text-2xl font-bold text-slate-700 mb-1">
                  78%
                </div>
                <p className="text-[11px] text-slate-400">
                  Total Expenses more than last month
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Grid - Operational KPI Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Total Income Area Chart */}
        <div className="col-span-12 lg:col-span-8 bg-white rounded-xl border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-700">
                Total Anggaran Terdistribusi
              </h3>
              <p className="text-[12px] text-slate-400 font-medium">
                Monitoring Penyerapan Alokasi Pos Logistik & Infrastruktur 3T
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs bg-slate-50 border-0 px-2.5 py-1 rounded-lg">
              <b className="text-primary-500">2026</b>
              <span className="text-slate-400">| Seluruh Kawasan</span>
            </div>
          </div>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ANALYTICS_DATA}>
                <defs>
                  <linearGradient id="purpleReport" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--theme-primary-500)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--theme-primary-500)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--theme-slate-200)"
                />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "var(--theme-slate-400)",
                    fontSize: 11,
                    fontWeight: 650,
                  }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "var(--theme-slate-400)",
                    fontSize: 11,
                    fontWeight: 650,
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--theme-slate-100)",
                    border: "1px solid var(--theme-slate-200)",
                    borderRadius: "8px",
                    color: "var(--theme-slate-700)",
                    fontSize: "11px",
                    fontWeight: 600,
                    boxShadow: "0 4px 12px rgba(67, 89, 113, 0.15)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--theme-primary-500)"
                  strokeWidth={3.5}
                  fillOpacity={1}
                  fill="url(#purpleReport)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Report Stats List Panel */}
        <div className="col-span-12 lg:col-span-4 bg-white rounded-xl border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5 border-b border-slate-50 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-700">
                  Laporan Bulanan
                </h3>
                <p className="text-[12px] text-slate-400 font-semibold">
                  Rata-rata Penanganan Rp 45.57M
                </p>
              </div>
              <TrendingUp className="w-5 h-5 text-primary-500" />
            </div>

            <div className="space-y-4">
              {/* Row 1 */}
              <div
                onClick={() => setActiveTab?.("projects")}
                className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center font-bold">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-slate-700">
                      Infrastruktur
                    </h4>
                    <p className="text-[11px] text-slate-400 font-semibold">
                      {stats[2]?.value || "12"} Proyek Terpantau
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[13px] font-bold text-primary-500">
                    +Rp 42.84M
                  </span>
                  <span className="text-[10px] text-emerald-500 font-bold block">
                    ▲ +2.34%
                  </span>
                </div>
              </div>

              {/* Row 2 */}
              <div
                onClick={() => setActiveTab?.("documents")}
                className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-amber-100 text-amber-500 rounded-lg flex items-center justify-center font-bold">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-slate-700">
                      Dokumen Sah
                    </h4>
                    <p className="text-[11px] text-slate-400 font-semibold">
                      {stats[3]?.value || "8"} Sertifikat Ber-TTE
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[13px] font-bold text-amber-600">
                    -Rp 38.65M
                  </span>
                  <span className="text-[10px] text-red-500 font-bold block">
                    ▼ -1.15%
                  </span>
                </div>
              </div>

              {/* Row 3 */}
              <div
                onClick={() => setActiveTab?.("transmigrants")}
                className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-100 text-emerald-500 rounded-lg flex items-center justify-center font-bold">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-slate-700">
                      Transmigran
                    </h4>
                    <p className="text-[11px] text-slate-400 font-semibold">
                      {stats[0]?.value || "14"} Terdaftar Aktif
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[13px] font-bold text-emerald-600">
                    +Rp 18.22M
                  </span>
                  <span className="text-[10px] text-emerald-500 font-bold block">
                    ▲ +1.35%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-50 text-center">
            <button
              onClick={() => setActiveTab?.("documents")}
              className="text-[11px] font-bold text-primary-500 tracking-wider uppercase hover:underline cursor-pointer"
            >
              Unduh Laporan Operasional
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Geographic distributions, Complaints, & Agenda Rapat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pie Distribution Card (4 cols) */}
        <div
          onClick={() => setActiveTab?.("geographic")}
          className="lg:col-span-4 bg-white rounded-xl border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] p-6 cursor-pointer hover:shadow-[0_4px_12px_0_rgba(67,89,113,0.15)] transition-all"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[15px] font-bold text-slate-700">
              Distribusi Wilayah 3T
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-50 text-slate-400 uppercase">
              National
            </span>
          </div>
          <div className="h-[180px] w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => {
                    const fillCol =
                      entry.color === "#2563eb"
                        ? "var(--theme-primary-500)"
                        : entry.color === "#10b981"
                          ? "var(--color-emerald-600)"
                          : "var(--color-amber-500)";
                    return <Cell key={`cell-${index}`} fill={fillCol} />;
                  })}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--theme-slate-100)",
                    color: "var(--theme-slate-700)",
                    borderRadius: "8px",
                    border: "1px solid var(--theme-slate-200)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center mt-[-4px]">
              <span className="text-[20px] font-black text-slate-700 block select-none">
                3T
              </span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block select-none">
                Wilayah
              </span>
            </div>
          </div>
          <div className="mt-6 space-y-2 border-t border-slate-50 pt-4">
            {pieData.map((item) => {
              const fillCol =
                item.color === "#2563eb"
                  ? "var(--theme-primary-500)"
                  : item.color === "#10b981"
                    ? "var(--color-emerald-600)"
                    : "var(--color-amber-500)";
              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-xs py-1 hover:bg-slate-50/50 px-1 rounded transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: fillCol }}
                    />
                    <span className="text-slate-550 font-medium">
                      {item.name}
                    </span>
                  </div>
                  <span className="font-bold text-slate-700">
                    {item.value}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Complaints List Card (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-xl border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[15px] font-bold text-slate-700">
              Pengaduan Lapangan
            </h3>
            <button
              onClick={() => setActiveTab?.("complaints")}
              className="text-[11px] font-bold text-rose-500 hover:text-rose-600 hover:underline cursor-pointer bg-transparent border-none outline-none"
            >
              Lihat Semua
            </button>
          </div>
          <div className="space-y-4 max-h-[295px] overflow-y-auto custom-scrollbar pr-1">
            {recentComplaints.length === 0 ? (
              <p className="text-[13px] text-slate-500 text-center py-10">
                Tidak ada pengaduan pending.
              </p>
            ) : (
              recentComplaints.map((c, i) => (
                <div
                  key={i}
                  onClick={() => setActiveTab?.("complaints")}
                  className="flex flex-col p-3 rounded-lg border-0 bg-slate-50/40 hover:bg-slate-50 transition-all cursor-pointer relative gap-1 shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded uppercase">
                      {c.category || "Prioritas"}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {c.createdAt
                        ? new Date(c.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                          })
                        : "Hari ini"}
                    </span>
                  </div>
                  <p className="text-[13px] font-bold text-slate-750 line-clamp-1 mt-1">
                    {c.subject}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium line-clamp-1">
                    {c.description || "Sedang dalam review teknis..."}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Agenda Rapat Card (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-xl border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[15px] font-bold text-slate-700">
              Agenda Rapat Terdekat
            </h3>
            <button
              onClick={() => setActiveTab?.("meetings")}
              className="text-[11.5px] font-black text-primary-500 hover:text-primary-600 hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none outline-none"
            >
              Atur Pertemuan <Calendar className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-4 max-h-[295px] overflow-y-auto custom-scrollbar pr-1">
            {recentMeetings.length === 0 ? (
              <p className="text-[13px] text-slate-500 text-center py-10">
                Tidak ada agenda rapat terjadwal.
              </p>
            ) : (
              recentMeetings.map((m, i) => {
                const dateObj = m.date ? new Date(m.date) : new Date();
                const dayDate = isNaN(dateObj.getDate())
                  ? "-"
                  : dateObj.getDate();
                const monthStr = isNaN(dateObj.getDate())
                  ? "-"
                  : dateObj.toLocaleDateString("id-ID", { month: "short" });
                return (
                  <div
                    key={i}
                    onClick={() => setActiveTab?.("meetings")}
                    className="flex items-center justify-between p-3 rounded-lg border-0 bg-slate-50/40 hover:bg-slate-50 transition-all cursor-pointer group shadow-xs hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-[42px] h-[42px] rounded-lg bg-primary-100/60 flex flex-col items-center justify-center text-primary-501 font-black text-[10px] uppercase leading-none shrink-0 select-none">
                        <span className="text-[14px]">{dayDate}</span>
                        <span className="text-[8px] mt-0.5 font-bold">
                          {monthStr}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-slate-750 truncate group-hover:text-primary-500 transition-colors">
                          {m.title}
                        </p>
                        <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                          Jam {m.time || "-"} • {m.type}
                        </p>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-350 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
