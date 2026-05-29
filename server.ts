import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import nodemailer from "nodemailer";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Gemini API setup
  const genAI = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY || "",
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Gemini Chat Endpoint
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { prompt, systemInstruction } = req.body;
      const model = genAI.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: { systemInstruction }
      });
      const response = await model;
      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini API Error:", error.message);
      if (error.message && (error.message.includes("429") || error.message.toLowerCase().includes("rate"))) {
        return res.status(429).json({ error: "Rate limit exceeded. Silakan coba beberapa saat lagi." });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // WhatsApp Notification (Fonnte)
  app.post("/api/notify/wa", async (req, res) => {
    const { target, message, apiKey } = req.body;
    try {
      const activeKey = apiKey || process.env.FONNTE_API_KEY;
      if (!activeKey) {
        console.log("No Fonnte API Key found, simulating WA sent to", target);
        return res.json({ status: true, message: "Simulated sending" });
      }
      const response = await axios.post('https://api.fonnte.com/send', {
        target,
        message,
      }, {
        headers: { Authorization: activeKey }
      });
      res.json(response.data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Fonnte Webhook
  app.post("/api/whatsapp/webhook", async (req, res) => {
    console.log("Fonnte webhook received:", req.body);
    // You can process delivery status, reply messages, etc. here
    res.json({ status: "success" });
  });

  // Email Notification (SMTP)
  app.post("/api/notify/email", async (req, res) => {
    const { to, subject, html, smtpConfig } = req.body;
    try {
      const user = smtpConfig?.user || process.env.SMTP_EMAIL;
      const pass = smtpConfig?.pass || process.env.SMTP_PASSWORD;
      const host = smtpConfig?.host || 'smtp.gmail.com';
      const port = smtpConfig?.port || 465;

      if (!user || !pass) {
        console.log("No SMTP credentials found, simulating email sent to", to);
        return res.json({ success: true, messageId: "simulated-" + Date.now() });
      }
      
      const transporter = nodemailer.createTransport({
        host: host,
        port: parseInt(port),
        secure: parseInt(port) === 465, // true for 465, false for other ports
        auth: {
          user,
          pass,
        },
      });

      const info = await transporter.sendMail({
        from: `"Wordesk" <${user}>`,
        to,
        subject,
        html,
      });

      res.json({ success: true, messageId: info.messageId });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Location Validation Endpoint
  app.post("/api/validate-location", (req, res) => {
    const { lat, lng, kawasan } = req.body;
    
    // Master Kawasan locations dictionary
    const MASTER_LOKASI = [
      { id: '1', name: 'Kawasan Merauke (Muting) - 3T', lat: -8.115, lng: 140.755 },
      { id: '4', name: 'Kawasan Sorong (Klamono) - 3T', lat: -1.050, lng: 131.500 },
      { id: '5', name: 'Kawasan Nabire (Teluk Kimi)', lat: -3.366, lng: 135.500 },
      { id: '7', name: 'Kawasan Asmat - 3T', lat: -5.538, lng: 138.134 },
      { id: '8', name: 'Kawasan Pegunungan Bintang - 3T', lat: -4.567, lng: 140.316 },
      { id: '2', name: 'Kawasan Sumba Timur - 3T', lat: -9.658, lng: 120.264 },
      { id: '3', name: 'Kawasan Mentawai - 3T', lat: -2.040, lng: 99.553 },
      { id: '10', name: 'Kawasan Natuna - 3T', lat: 3.949, lng: 108.142 },
      { id: '11', name: 'Kawasan Pulau Morotai - 3T', lat: 2.045, lng: 128.293 },
      { id: '6', name: 'Kawasan Konawe', lat: -3.850, lng: 122.050 },
    ];

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return res.json({ valid: false, error: "Format koordinat tidak valid (harus angka)." });
    }

    const refKawasan = MASTER_LOKASI.find(k => k.name === kawasan || k.name.includes(kawasan) || (kawasan && kawasan.includes(k.name)));
    
    if (!refKawasan) {
      // General Indonesia bounds check if Kawasan is not identified explicitly
      if (latNum >= -11.5 && latNum <= 6.5 && lngNum >= 94.0 && lngNum <= 142.0) {
        return res.json({ valid: true });
      }
      return res.json({ valid: false, error: "Koordinat berada di luar wilayah Indonesia atau Kawasan Transmigrasi yang terdaftar." });
    }

    // Border validation: max variance allowed from coordinates is ~ 2.0 degrees (~222 km)
    const MAX_DEVIATION = 2.0;

    const diffLat = Math.abs(latNum - refKawasan.lat);
    const diffLng = Math.abs(lngNum - refKawasan.lng);

    if (diffLat <= MAX_DEVIATION && diffLng <= MAX_DEVIATION) {
      return res.json({ valid: true });
    }

    res.json({ 
      valid: false, 
      error: `Titik koordinat (${latNum}, ${lngNum}) gagal pada verifikasi batas (radius) untuk kawasan ${refKawasan.name}. Data koordinat tidak valid atau palsu.` 
    });
  });

  // TTE Signing (BSrE Placeholder)
  app.post("/api/tte/sign", async (req, res) => {
    const { documentId, userId, passphrase } = req.body;
    try {
      // In production, this would use axios to call the BSrE API
      // with the provided passphrase and certificates.
      console.log(`Signing document ${documentId} for user ${userId}`);
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));

      res.json({ 
        success: true, 
        message: "Dokumen berhasil ditandatangani secara elektronik (BSrE Simulation)",
        metadata: {
          signedAt: new Date().toISOString(),
          certificateRef: "BSRE-CERT-SAMPLE-2024",
          visualStampRef: "WORDESK-QR-XXXX"
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
