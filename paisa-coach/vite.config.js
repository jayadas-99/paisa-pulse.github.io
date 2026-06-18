import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.1-8b-instant";

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function groqDevApiPlugin(env) {
  return {
    name: "paisa-coach-groq-dev-api",
    configureServer(server) {
      server.middlewares.use("/api/groq", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        const apiKey = process.env.GROQ_API_KEY || env.GROQ_API_KEY;
        if (!apiKey) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Groq API key is not configured." }));
          return;
        }

        try {
          const body = JSON.parse(await readRequestBody(req));
          const model = process.env.GROQ_MODEL || env.GROQ_MODEL || DEFAULT_MODEL;
          const response = await fetch(GROQ_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages: body.messages,
              temperature: body.temperature ?? 0.4,
            }),
          });

          const text = await response.text();
          res.statusCode = response.status;
          res.setHeader("Content-Type", "application/json");
          res.end(text);
        } catch {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Groq request failed." }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), groqDevApiPlugin(env)],
  };
});
