import { getDoc, doc, addDoc, collection } from 'firebase/firestore';
import { db } from './firebase';
import { useStore } from '../store/useStore';

export interface NotificationPayload {
  ticketId?: string;
  user?: string;
  phone?: string;
  category?: string;
  priority?: string;
  subject?: string;
  description?: string;
  location?: string;
  status?: string;
  replyMessage?: string;
  replyUser?: string;
  documentTitle?: string;
  documentId?: string;
  signerName?: string;
  meetingTitle?: string;
  meetingDate?: string;
  meetingTime?: string;
  meetingLocation?: string;
  recipientEmail?: string;
  recipientPhone?: string;
}

// Central helper to fetch settings from Store with Firestore fallback
async function getNotificationSettings() {
  const storeSettings = useStore.getState().appSettings;
  if (storeSettings && storeSettings.fonnteKey) {
    return storeSettings;
  }
  
  try {
    const docSnap = await getDoc(doc(db, 'settings', 'global'));
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (error) {
    console.error("Failed to fetch notification settings in helper:", error);
  }
  
  return null;
}

export async function sendAppNotification(
  event: 'complaint_created' | 'complaint_updated' | 'document_signed' | 'meeting_created' | 'system_alert',
  payload: NotificationPayload
) {
  const settings = await getNotificationSettings();
  if (!settings) {
    console.warn("Notification system: No configured settings found.");
    return { wa: false, email: false, error: 'No configuration found' };
  }

  const results = { wa: false, email: false };

  // Parse global enable toggles (default is true if not set)
  const isWaEnabled = settings.waEnabled !== false;
  const isEmailEnabled = settings.emailEnabled !== false;

  // Determine which specific events are enabled in settings
  const shouldNotifyOnComplaintCreated = settings.notifyOnComplaintCreated !== false;
  const shouldNotifyOnComplaintUpdated = settings.notifyOnComplaintUpdated !== false;
  const shouldNotifyOnDocSigned = settings.notifyOnDocSigned !== false;
  const shouldNotifyOnMeetingCreated = settings.notifyOnMeetingCreated !== false;

  const appName = settings.appName || 'Sistem Terpadu Lokus 3T';
  const instansiName = settings.instansiName || 'Kementerian Transmigrasi';

  // Build target contacts
  const targetUserPhone = payload.phone || payload.recipientPhone || '';
  const targetUserEmail = payload.recipientEmail || '';
  const targetAdminPhone = settings.adminWaTarget || '';
  const targetAdminEmail = settings.adminEmailTarget || '';

  // 1. WhatsApp Delivery Routing
  if (isWaEnabled && settings.fonnteKey) {
    let adminMessage = '';
    let citizenMessage = '';

    if (event === 'complaint_created' && shouldNotifyOnComplaintCreated) {
      adminMessage = `🔔 *LAPORAN PENGADUAN BARU* 🔔\n\nHalo Admin,\nSistem terintegrasi mendeteksi laporan baru masuk dari masyarakat:\n\n*ID Tiket:* ${payload.ticketId}\n*Nama Pengadu:* ${payload.user}\n*No. Telp:* ${payload.phone}\n*Subjek:* ${payload.subject}\n*Kategori:* ${payload.category}\n*Prioritas:* ${payload.priority}\n*Lokasi:* ${payload.location}\n\n*Deskripsi:* ${payload.description}\n\nMohon segera masuk ke Dashboard Admin ${appName} untuk memverifikasi dan memberikan respon.\n\n_Terimakasih_\n_${instansiName}_`;
      citizenMessage = `✅ *PENGADUAN DIKIRIM* ✅\n\nHalo *${payload.user}*,\n\nTerima kasih telah melaporkan perkembangan atau pengaduan di daerah Anda melalui portal kami.\n\n*ID Tiket Anda:* ${payload.ticketId}\n*Subjek:* ${payload.subject}\n*Kategori:* ${payload.category}\n*Lokasi:* ${payload.location}\n\nLaporan Anda saat ini berstatus *Open* dan sedang diproses oleh admin instansi terkait.\nSimpan nomor tiket ini untuk keperluan pelacakan.\n\n_Hormat Kami,_\n_${instansiName}_`;
    } 
    else if (event === 'complaint_updated' && shouldNotifyOnComplaintUpdated) {
      citizenMessage = `💬 *PEMBARUAN STATUS PENGADUAN* 💬\n\nHalo *${payload.user}*,\n\nAda tanggapan terbaru terkait tiket pengaduan Anda.\n\n*ID Tiket:* ${payload.ticketId}\n*Subjek:* ${payload.subject}\n*Status Baru:* *${payload.status}*\n\n*Tanggapan Petugas:* \n_"${payload.replyMessage || 'Status laporan Anda telah diubah oleh petugas kami.'}"_\n\nSilakan cek detail tanggapan lengkap di sub-portal pengaduan.\n\n_Terimakasih_,\n_${instansiName}_`;
    } 
    else if (event === 'document_signed' && shouldNotifyOnDocSigned) {
      citizenMessage = `🔏 *DOKUMEN BERHASIL DISAHKAN (TTE)* 🔏\n\nHalo,\nDokumen penting bersistem TTE BSrE telah ditandatangani secara digital.\n\n*Nama Dokumen:* ${payload.documentTitle}\n*Ref ID:* ${payload.documentId}\n*Penandatangan:* ${payload.signerName}\n*Waktu:* ${new Date().toLocaleString('id-ID')}\n\nDokumen ini sudah dapat diunduh dan diverifikasi keasliannya menggunakan menu *Verifikasi TTE* pada Sistem ${appName}.\n\n_Terimakasih_\n_${instansiName}_`;
    } 
    else if (event === 'meeting_created' && shouldNotifyOnMeetingCreated) {
      citizenMessage = `📅 *UNDANGAN RAPAT KOORDINASI KAWASAN 3T* 📅\n\nHalo Anggota Tim,\n\nUndangan koordinasi terpadu baru saja diterbitkan:\n\n*Judul Rapat:* ${payload.meetingTitle}\n*Tanggal Rapat:* ${payload.meetingDate}\n*Waktu:* ${payload.meetingTime} WIB\n*Lokasi:* ${payload.meetingLocation || 'Video Conference / Kantor Pusat'}\n\nMohon segera cek detail, lampiran pembahasan, dan RSVP keterlibatan Anda.\n\n_Salam Sinergi_\n_${instansiName}_`;
    }
    else if (event === 'system_alert') {
      citizenMessage = `⚠️ *SINKRONISASI SISTEM NOTIFIKASI* ⚠️\n\nHalo Admin,\nIni adalah pesan konfirmasi bahwa Sinkronisasi WhatsApp & Email Gateway telah mendarat dengan aman dan aktif di seluruh portal ${appName}.\n\n_Sistem Berjalan Normal_`;
    }

    try {
      // Send warning to Admin if admin target configured
      if (adminMessage && targetAdminPhone) {
        await fetch('/api/notify/wa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target: targetAdminPhone,
            message: adminMessage,
            apiKey: settings.fonnteKey
          })
        });
      }

      // Send greeting to user/citizen
      if (citizenMessage && targetUserPhone) {
        const response = await fetch('/api/notify/wa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target: targetUserPhone,
            message: citizenMessage,
            apiKey: settings.fonnteKey
          })
        });
        const statusData = await response.json();
        if (statusData.status) {
          results.wa = true;
        }
      }
    } catch (e) {
      console.error("Failed to send WhatsApp message via Fonnte:", e);
    }
  }

  // 2. SMTP Email Delivery Routing
  if (isEmailEnabled && settings.smtpUser && settings.smtpPass) {
    const smtpConfig = {
      user: settings.smtpUser,
      pass: settings.smtpPass,
      host: settings.smtpHost || 'smtp.gmail.com',
      port: settings.smtpPort || '587'
    };

    let subject = '';
    let emailHtml = '';

    const themeBg = settings.themeColor === 'emerald' ? '#10b981' : 
                    settings.themeColor === 'blue' ? '#0ea5e9' : 
                    settings.themeColor === 'navy' ? '#122b5c' : 
                    settings.themeColor === 'amber' ? '#f59e0b' : 
                    settings.themeColor === 'indigo' ? '#6366f1' : 
                    settings.themeColor === 'rose' ? '#f43f5e' : '#696cff';

    // Generates a responsive, complete HTML Email template
    const makeEmailBody = (title: string, contentHtml: string) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
          .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(67, 89, 113, 0.08); border: 1px solid #e2e8f0; }
          .header { background-color: ${themeBg}; padding: 32px 24px; text-align: center; color: #ffffff; }
          .header h1 { font-size: 20px; font-weight: 800; margin: 0; letter-spacing: -0.025em; text-transform: uppercase; }
          .header p { font-size: 11px; margin: 6px 0 0 0; font-weight: bold; opacity: 0.85; letter-spacing: 0.08em; }
          .content { padding: 32px 24px; color: #334155; line-height: 1.6; }
          .content h2 { font-size: 16px; font-weight: 700; margin-top: 0; color: #1e293b; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px; }
          .table-info { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
          .table-info td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
          .table-info td.label { font-weight: 700; color: #64748b; width: 150px; text-transform: uppercase; font-size: 11px; tracking: 0.05em; }
          .table-info td.value { color: #1e293b; }
          .badge { display: inline-block; padding: 3px 8px; font-size: 11px; font-weight: 700; border-radius: 6px; text-transform: uppercase; }
          .badge-open { background-color: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; }
          .badge-review { background-color: #fffbeb; color: #d97706; border: 1px solid #fef3c7; }
          .badge-resolved { background-color: #f0fdf4; color: #16a34a; border: 1px solid #dcfce7; }
          .footer { background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; }
          .footer a { color: ${themeBg}; text-decoration: none; font-weight: bold; }
          .btn-action { display: inline-block; padding: 10px 20px; background-color: ${themeBg}; color: #ffffff !important; text-decoration: none; font-weight: bold; font-size: 13px; border-radius: 8px; margin-top: 16px; text-align: center; border: none; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${appName}</h1>
            <p>${instansiName}</p>
          </div>
          <div class="content">
            ${contentHtml}
          </div>
          <div class="footer">
            <p>Email ini dikirim secara otomatis oleh sistem gateway terpadu ${appName}.</p>
            <p>&copy; ${new Date().getFullYear()} ${instansiName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    if (event === 'complaint_created' && shouldNotifyOnComplaintCreated) {
      subject = `[${payload.ticketId}] Pengaduan Masyarakat Terdaftar - ${payload.subject}`;
      
      const adminHtml = makeEmailBody('Laporan Baru Masuk', `
        <h2>Laporan Pengaduan Baru Diterima</h2>
        <p>Halo Admin, laporan pengaduan baru telah diserahkan oleh masyarakat dengan data detil sebagai berikut:</p>
        <table class="table-info">
          <tr>
            <td class="label">ID Tiket</td>
            <td class="value"><strong>${payload.ticketId}</strong></td>
          </tr>
          <tr>
            <td class="label">Nama Pengadu</td>
            <td class="value">${payload.user}</td>
          </tr>
          <tr>
            <td class="label">No. Telepon</td>
            <td class="value">${payload.phone}</td>
          </tr>
          <tr>
            <td class="label">Kategori</td>
            <td class="value">${payload.category}</td>
          </tr>
          <tr>
            <td class="label">Prioritas</td>
            <td class="value"><span class="badge badge-open">${payload.priority}</span></td>
          </tr>
          <tr>
            <td class="label">Lokasi 3T</td>
            <td class="value">${payload.location}</td>
          </tr>
          <tr>
            <td class="label">Subjek</td>
            <td class="value">${payload.subject}</td>
          </tr>
          <tr>
            <td class="label">Temuan Lapangan</td>
            <td class="value">${payload.description}</td>
          </tr>
        </table>
        <p>Mohon segera tindak lanjuti laporan ini melalui ruang konsol administrator.</p>
      `);

      const citizenHtml = makeEmailBody('Terima Kasih Atas Laporan Anda', `
        <h2>Tanda Terima Laporan Pengaduan</h2>
        <p>Yth. Bapak/Ibu <strong>${payload.user}</strong>,</p>
        <p>Terima kasih telah berpartisipasi aktif dalam pelaporan dan pengaduan pembangunan kawasan daerah 3T. Laporan Anda telah berhasil masuk ke sistem kami.</p>
        <table class="table-info">
          <tr>
            <td class="label">Nomor Tiket</td>
            <td class="value"><strong>${payload.ticketId}</strong></td>
          </tr>
          <tr>
            <td class="label">Subjek Laporan</td>
            <td class="value">${payload.subject}</td>
          </tr>
          <tr>
            <td class="label">Kawasan</td>
            <td class="value">${payload.location}</td>
          </tr>
          <tr>
            <td class="label">Status Tiket</td>
            <td class="value"><span class="badge badge-open">OPEN</span></td>
          </tr>
        </table>
        <p>Sistem kami sedang mencocokkan laporan Anda ke instansi dinas teknis setempat. Kami akan memberikan pembaruan secara instan via Email & WhatsApp ketika petugas menindaklanjuti atau membalas pengaduan Anda.</p>
      `);

      try {
        let sentAny = false;
        if (targetAdminEmail) {
          const res = await fetch('/api/notify/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: targetAdminEmail, subject: `[ADMIN ALERT] New Complaint ${payload.ticketId}`, html: adminHtml, smtpConfig })
          });
          const resData = await res.json();
          if (resData.success) sentAny = true;
        }
        if (targetUserEmail) {
          const res = await fetch('/api/notify/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: targetUserEmail, subject, html: citizenHtml, smtpConfig })
          });
          const resData = await res.json();
          if (resData.success) sentAny = true;
        }
        if (sentAny) results.email = true;
      } catch (err) {
        console.error("Failed to route email for complaint creation:", err);
      }
    } 
    else if (event === 'complaint_updated' && shouldNotifyOnComplaintUpdated) {
      subject = `[${payload.ticketId}] Tanggapan & Status Pengaduan Anda Diperbarui`;
      const badgeClass = payload.status === 'Resolved' ? 'badge-resolved' : 'badge-review';
      
      const citizenHtml = makeEmailBody('Pembaruan Status Pengaduan', `
        <h2>Tanggapan Resmi Pengaduan Dipublikasi</h2>
        <p>Halo <strong>${payload.user}</strong>,</p>
        <p>Petugas kami baru saja menindaklanjuti dan merilis tanggapan terbaru mengenai tiket pengaduan Anda:</p>
        <table class="table-info">
          <tr>
            <td class="label">ID Tiket</td>
            <td class="value"><strong>${payload.ticketId}</strong></td>
          </tr>
          <tr>
            <td class="label">Subjek Laporan</td>
            <td class="value">${payload.subject}</td>
          </tr>
          <tr>
            <td class="label">Status Terbaru</td>
            <td class="value"><span class="badge ${badgeClass}">${payload.status}</span></td>
          </tr>
          <tr>
            <td class="label">Pemberi Balasan</td>
            <td class="value">${payload.replyUser || 'Petugas Desk'}</td>
          </tr>
        </table>
        <div style="background-color: #f1f5f9; border-left: 4px solid ${themeBg}; padding: 16px; margin: 20px 0; border-radius: 4px; font-style: italic;">
          "${payload.replyMessage || 'Tidak ada catatan tertulis.'}"
        </div>
        <p>Terima kasih atas kontribusi positif Anda dalam mewujudkan transparansi dan integrasi data yang tangguh.</p>
      `);

      try {
        if (targetUserEmail) {
          const res = await fetch('/api/notify/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: targetUserEmail, subject, html: citizenHtml, smtpConfig })
          });
          const resData = await res.json();
          if (resData.success) results.email = true;
        }
      } catch (err) {
        console.error("Failed to send email on complaint update:", err);
      }
    } 
    else if (event === 'document_signed' && shouldNotifyOnDocSigned) {
      subject = `🔏 Dokumen TTE Berhasil Disahkan - ${payload.documentTitle}`;
      
      const signHtml = makeEmailBody('Sertifikasi Dokumen TTE berhasil', `
        <h2>Sertifikat & Tanda Tangan Digital Berhasil Diterbitkan</h2>
        <p>Halo,</p>
        <p>Sebuah berkas penting telah tersertifikasi menggunakan Tanda Tangan Elektronik secara digital dan dijamin keutuhannya:</p>
        <table class="table-info">
          <tr>
            <td class="label">Nama Dokumen</td>
            <td class="value">${payload.documentTitle}</td>
          </tr>
          <tr>
            <td class="label">Ref ID</td>
            <td class="value"><code>${payload.documentId}</code></td>
          </tr>
          <tr>
            <td class="label">Penandatangan</td>
            <td class="value"><strong>${payload.signerName}</strong></td>
          </tr>
          <tr>
            <td class="label">Waktu TTE</td>
            <td class="value">${new Date().toLocaleString('id-ID')}</td>
          </tr>
          <tr>
            <td class="label">Otoritas Validasi</td>
            <td class="value">Balai Sertifikasi Elektronik (BSrE Simulation)</td>
          </tr>
        </table>
        <p>Anda dapat memverifikasi integritas berkas bertandatangan PDF ini secara instan di menu <strong>Verifikasi TTE</strong> kapan pun diperlukan.</p>
      `);

      try {
        const destEmail = targetUserEmail || targetAdminEmail;
        if (destEmail) {
          const res = await fetch('/api/notify/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: destEmail, subject, html: signHtml, smtpConfig })
          });
          const resData = await res.json();
          if (resData.success) results.email = true;
        }
      } catch (err) {
        console.error("Failed to send email for document sign:", err);
      }
    } 
    else if (event === 'meeting_created' && shouldNotifyOnMeetingCreated) {
      subject = `📅 Undangan Terintegrasi Rapat Koordinasi: ${payload.meetingTitle}`;
      
      const meetHtml = makeEmailBody('Undangan Koordinasi Terpadu', `
        <h2>Rapat Koordinasi Baru Diterbitkan</h2>
        <p>Halo Anggota Tim,</p>
        <p>Instansi baru saja menjadwalkan agenda rapat koordinasi strategis yang membutuhkan kehadiran Anda:</p>
        <table class="table-info">
          <tr>
            <td class="label">Topik Utama</td>
            <td class="value"><strong>${payload.meetingTitle}</strong></td>
          </tr>
          <tr>
            <td class="label">Hari / Tanggal</td>
            <td class="value">${payload.meetingDate}</td>
          </tr>
          <tr>
            <td class="label">Pukul</td>
            <td class="value">${payload.meetingTime} WIB</td>
          </tr>
          <tr>
            <td class="label">Tempat/Media</td>
            <td class="value">${payload.meetingLocation || 'Video Conference Online'}</td>
          </tr>
        </table>
        <p>Persiapkan berkas laporan dan presentasi program yang relevan. Terima kasih atas ketaatan agenda rapat terpadu ini.</p>
      `);

      try {
        const destEmail = targetUserEmail || targetAdminEmail;
        if (destEmail) {
          const res = await fetch('/api/notify/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: destEmail, subject, html: meetHtml, smtpConfig })
          });
          const resData = await res.json();
          if (resData.success) results.email = true;
        }
      } catch (err) {
        console.error("Failed to send meeting notification:", err);
      }
    }
  }

  // Log notification to Firestore for history and auditing
  try {
    await addDoc(collection(db, 'notification_logs'), {
      event,
      payload,
      timestamp: new Date().toISOString(),
      channels: {
        wa: results.wa,
        email: results.email
      },
      waEnabled: isWaEnabled && !!settings.fonnteKey,
      emailEnabled: isEmailEnabled && !!settings.smtpUser && !!settings.smtpPass,
      recipientEmail: targetUserEmail || null,
      recipientPhone: targetUserPhone || null,
      subject: payload.subject || payload.documentTitle || payload.meetingTitle || 'System Alert',
      appName,
      instansiName
    });
  } catch (error) {
    console.error("Failed to write to notification_logs:", error);
  }

  return results;
}
