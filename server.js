import { createReadStream, statSync } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = __dirname;
const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 5173);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".vcf": "text/vcard; charset=utf-8",
  ".webp": "image/webp",
};

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

    if (requestUrl.pathname === "/healthz") {
      sendText(response, 200, "ok");
      return;
    }

    const filePath = await resolveStaticPath(requestUrl.pathname);
    const fileStats = statSync(filePath);

    response.writeHead(200, {
      "Cache-Control": cacheHeader(filePath),
      "Content-Length": fileStats.size,
      "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });

    createReadStream(filePath).pipe(response);
  } catch (error) {
    if (error.code === "ENOENT") {
      sendText(response, 404, "Not found");
      return;
    }

    console.error(error);
    sendText(response, 500, "Server error");
  }
});

server.listen(port, host, () => {
  console.log(`OneAria server listening at http://${host}:${port}`);
});

async function resolveStaticPath(pathname) {
  const decodedPath = decodeURIComponent(pathname);
  const normalizedPath = decodedPath === "/" ? "/index.html" : decodedPath;
  const filePath = path.normalize(path.join(root, normalizedPath));

  if (!filePath.startsWith(root + path.sep) && filePath !== root) {
    const error = new Error("Path traversal blocked");
    error.code = "ENOENT";
    throw error;
  }

  const fileStats = await stat(filePath).catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });

  if (fileStats?.isDirectory()) {
    const indexPath = path.join(filePath, "index.html");
    await access(indexPath);
    return indexPath;
  }

  if (!fileStats?.isFile()) {
    const error = new Error("Not found");
    error.code = "ENOENT";
    throw error;
  }

  return filePath;
}

function sendText(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(body);
}

function cacheHeader(filePath) {
  if (path.basename(filePath) === "index.html" || filePath.endsWith(".json")) {
    return "no-cache";
  }

  return "public, max-age=3600";
}
