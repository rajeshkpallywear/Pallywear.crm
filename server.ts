import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import cors from "cors"; // 1. Imported CORS package
import { initDB } from "./db";
import apiRouter from "./api";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.NODE_ENV = process.env.NODE_ENV || "development";

async function startServer() {
  await initDB();

  const app = express();

  // 2. Enabled CORS so your frontend can communicate seamlessly with this backend
  app.use(cors({
    origin: "*", // Allows requests from any origin; change to your specific domain in strict production setups
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }));

  app.use(express.json());

  app.use((req, res, next) => {
    console.log(`[HTTP Request] ${req.method} ${req.url}`);
    next();
  });

  // Register API endpoints
  app.use("/api", apiRouter);

  // Catch-all API 404 fallback to return JSON instead of default HTML
  app.use("/api/*", (req, res) => {
    res.status(404).json({
      success: false,
      message: `API endpoint ${req.method} ${req.originalUrl} not found on this server.`
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // Development SPA fallback for page reloads on custom paths
    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      if (url.includes(".") || url.startsWith("/api")) {
        return next();
      }
      try {
        const templatePath = path.resolve(__dirname, "index.html");
        const template = fs.readFileSync(templatePath, "utf-8");
        const html = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (e) {
        next(e);
      }
    });
  } else {
    // In production, serve static files from the dist directory
    const distPath = path.join(__dirname, "dist");
    console.log("Serving static files from distPath:", distPath);
    console.log("index.html exists:", fs.existsSync(path.join(distPath, "index.html")));
    app.use(express.static(distPath));

    // SPA fallback: serve index.html for all non-file requests
    app.get("*", (req, res) => {
      console.log("SPA fallback requested for URL:", req.url);
      const indexPath = path.join(distPath, "index.html");
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error("Error sending index.html:", err);
          res.status(500).send(err.message);
        }
      });
    });
  }

  // Fallback pattern to respect your .env file or default securely
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Listen on '0.0.0.0' to ensure the server accepts connections from external network interfaces
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running securely on port ${PORT}`);
  });
}

startServer();