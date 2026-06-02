const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = __dirname;
const publicDir = path.join(root, "public");
const apiDir = path.join(root, "api");
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 5173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type });
  res.end(body);
}

function makeResponse(res) {
  return {
    status(code) {
      res.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      res.setHeader(name, value);
      return this;
    },
    json(payload) {
      send(res, res.statusCode || 200, JSON.stringify(payload), "application/json; charset=utf-8");
    },
    end(payload = "") {
      res.end(payload);
    }
  };
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname.startsWith("/api/")) {
      const endpoint = url.pathname.replace("/api/", "").replace(/[^a-z0-9_-]/gi, "");
      const file = path.join(apiDir, `${endpoint}.js`);
      if (!fs.existsSync(file)) return send(res, 404, JSON.stringify({ error: "API endpoint not found" }));

      req.query = Object.fromEntries(url.searchParams.entries());
      const mod = require(file);
      return mod(req, makeResponse(res));
    }

    let filePath = path.join(publicDir, url.pathname === "/" ? "index.html" : url.pathname);
    if (url.pathname.startsWith("/quote/") || url.pathname.startsWith("/research/")) {
      filePath = path.join(publicDir, "index.html");
    }

    if (!filePath.startsWith(publicDir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(publicDir, "index.html");
    }

    const ext = path.extname(filePath);
    send(res, 200, fs.readFileSync(filePath), types[ext] || "application/octet-stream");
  } catch (error) {
    send(res, 500, JSON.stringify({ error: error.message || "Server error" }));
  }
});

server.listen(port, host, () => {
  console.log(`SEC stock research site running at http://${host}:${port}`);
});
