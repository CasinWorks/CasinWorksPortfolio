import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv, type Plugin } from "vite";

function firebaseConfigDevApi(): Plugin {
  return {
    name: "firebase-config-dev-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] !== "/api/firebase-config") {
          next();
          return;
        }
        if (req.method !== "GET") {
          res.statusCode = 405;
          res.end();
          return;
        }
        const env = loadEnv(server.config.mode, server.config.root, "");
        const payload = {
          apiKey: env.FIREBASE_API_KEY ?? "",
          authDomain: env.FIREBASE_AUTH_DOMAIN ?? "",
          projectId: env.FIREBASE_PROJECT_ID ?? "",
          storageBucket: env.FIREBASE_STORAGE_BUCKET ?? "",
          messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID ?? "",
          appId: env.FIREBASE_APP_ID ?? "",
        };
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        if (!payload.apiKey || !payload.projectId || !payload.appId) {
          res.statusCode = 503;
          res.end(JSON.stringify({ error: "Firebase is not configured on the server." }));
          return;
        }
        res.statusCode = 200;
        res.end(JSON.stringify(payload));
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [firebaseConfigDevApi(), react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== "true",
    },
  };
});
