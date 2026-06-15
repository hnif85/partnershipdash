import { createServer } from "http";

export default async () => {
  const MWX_API_KEY =
    process.env.MWX_API_KEY ||
    "5E227228E812.70d941ecced60ed3786d3b10685303aa4998683e";
  const MWX_BASE_URL = "https://ai-module.mwxmarket.ai";
  const PROXY_PORT = 3456;

  const server = createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    // Handle /v1/models for model discovery
    if (url.pathname === "/v1/models" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          object: "list",
          data: [
            {
              id: "gemini-3.5-flash",
              object: "model",
              created: Math.floor(Date.now() / 1000),
              owned_by: "mwx",
            },
          ],
        })
      );
      return;
    }

    // Handle OpenAI-compatible chat completions
    if (url.pathname === "/v1/chat/completions" && req.method === "POST") {
      let bodyStr = "";
      for await (const chunk of req) bodyStr += chunk;

      try {
        const openaiReq = JSON.parse(bodyStr);

        const mwxRes = await fetch(`${MWX_BASE_URL}/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-key": MWX_API_KEY,
            accept: "application/json",
          },
          body: JSON.stringify({
            service: "Marketing Strategi",
            ai: "vertex",
            model: openaiReq.model,
            messages: openaiReq.messages,
            temperature: openaiReq.temperature ?? 0.7,
            top_p: openaiReq.top_p ?? 1,
            debug: false,
          }),
        });

        const mwxData = await mwxRes.json();

        const openaiRes = {
          id: `chatcmpl-${Date.now()}`,
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: openaiReq.model,
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: mwxData.data?.content || "",
              },
              finish_reason: "stop",
            },
          ],
          usage: mwxData.data?.usage || {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
          },
        };

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(openaiRes));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { message: String(err) } }));
      }
      return;
    }

    res.writeHead(404);
    res.end("Not Found");
  });

  server.listen(PROXY_PORT);

  return {
    config: (cfg) => {
      cfg.provider = cfg.provider || {};
      cfg.provider.mwx = {
        npm: "@ai-sdk/openai-compatible",
        name: "MWX AI Module",
        options: {
          baseURL: `http://localhost:${PROXY_PORT}/v1`,
        },
        models: {
          "gemini-3.5-flash": {
            name: "Gemini 3.5 Flash",
            tool_call: true,
            attachment: true,
            limit: { context: 1000000, output: 8192 },
            cost: { input: 0, output: 0 },
          },
        },
      };
    },

    dispose: async () => {
      server.close();
    },
  };
};
