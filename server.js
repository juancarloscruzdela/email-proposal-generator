"use strict";

// A deliberately dependency-free server: data lives in .data/proposal-data.json.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

// Local convenience only. In production, set these in the hosting control panel.
const envFile = path.join(__dirname, ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

const port = Number(process.env.PORT || 3000);
const root = __dirname;
const dataDir = path.join(root, ".data");
const dataFile = path.join(dataDir, "proposal-data.json");

function emptyData() { return { drafts: [], templates: [], settings: {} }; }
function readData() {
  try { return { ...emptyData(), ...JSON.parse(fs.readFileSync(dataFile, "utf8")) }; }
  catch (error) { return emptyData(); }
}
function writeData(data) {
  fs.mkdirSync(dataDir, { recursive: true });
  const temporary = dataFile + ".tmp";
  fs.writeFileSync(temporary, JSON.stringify(data, null, 2));
  fs.renameSync(temporary, dataFile);
}
function userFor(request) { return request.proposalUser || "Local user"; }
function credentialsMatch(actual, expected) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}
function authenticate(request, response) {
  const username = process.env.PROPOSAL_USERNAME;
  const password = process.env.PROPOSAL_PASSWORD;
  if (!username || !password) {
    send(response, 503, { error: "Set PROPOSAL_USERNAME and PROPOSAL_PASSWORD before starting the app." });
    return false;
  }
  const header = request.headers.authorization || "";
  const token = header.startsWith("Basic ") ? header.slice(6) : "";
  let suppliedUsername = "", suppliedPassword = "";
  try { [suppliedUsername, suppliedPassword] = Buffer.from(token, "base64").toString("utf8").split(/:(.*)/s); }
  catch (error) { /* invalid credentials are unauthorized */ }
  if (credentialsMatch(suppliedUsername, username) && credentialsMatch(suppliedPassword, password)) {
    request.proposalUser = username;
    return true;
  }
  response.writeHead(401, { "WWW-Authenticate": 'Basic realm="Proposal Generator", charset="UTF-8"', "Content-Type": "text/plain; charset=utf-8" });
  response.end("Authentication required.");
  return false;
}
function send(response, status, value, contentType = "application/json; charset=utf-8") {
  response.writeHead(status, { "Content-Type": contentType, "Cache-Control": "no-store" });
  response.end(contentType.startsWith("application/json") ? JSON.stringify(value) : value);
}
function listDrafts(data) {
  return data.drafts.map(({ json, ...draft }) => draft);
}

function call(method, args, request) {
  const data = readData();
  const now = new Date().toISOString();
  const user = userFor(request);
  switch (method) {
    case "getUser": return user;
    case "listDrafts": return listDrafts(data);
    case "saveDraft": {
      const [key, name, json] = args;
      if (!key || !name || typeof json !== "string") throw new Error("Invalid draft");
      const draft = data.drafts.find(item => item.key === key);
      if (draft) Object.assign(draft, { name, json, lastEditedBy: user, lastEditedAt: now });
      else data.drafts.push({ key, name, status: "Draft", createdBy: user, createdAt: now, lastEditedBy: user, lastEditedAt: now, json });
      writeData(data); return listDrafts(data);
    }
    case "loadDraft": { const draft = data.drafts.find(item => item.key === args[0]); return draft ? draft.json : null; }
    case "deleteDraft": data.drafts = data.drafts.filter(item => item.key !== args[0]); writeData(data); return listDrafts(data);
    case "setDraftStatus": {
      const draft = data.drafts.find(item => item.key === args[0]);
      if (draft) Object.assign(draft, { status: String(args[1] || "Draft"), lastEditedBy: user, lastEditedAt: now });
      writeData(data); return listDrafts(data);
    }
    case "listTemplates": return data.templates.map(({ name, json }) => ({ name, json }));
    case "saveTemplate": {
      const [name, json] = args; if (!name || typeof json !== "string") throw new Error("Invalid template");
      const template = data.templates.find(item => item.name === name);
      if (template) Object.assign(template, { json, savedBy: user, savedAt: now });
      else data.templates.push({ name, json, savedBy: user, savedAt: now });
      writeData(data); return data.templates.map(({ name: n, json: j }) => ({ name: n, json: j }));
    }
    case "deleteTemplate": data.templates = data.templates.filter(item => item.name !== args[0]); writeData(data); return data.templates.map(({ name, json }) => ({ name, json }));
    case "getMyDefaults": return data.settings[user] || null;
    case "saveMyDefaults": data.settings[user] = String(args[0] || ""); writeData(data); return true;
    default: throw new Error("Unknown API method");
  }
}

const server = http.createServer((request, response) => {
  if (!authenticate(request, response)) return;
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/Index.html" || !url.pathname.includes("."))) {
    return send(response, 200, fs.readFileSync(path.join(root, "Index.html"), "utf8"), "text/html; charset=utf-8");
  }
  if (request.method === "POST" && (url.pathname === "/api" || url.pathname.endsWith("/api"))) {
    let body = "";
    request.on("data", chunk => { body += chunk; if (body.length > 1_000_000) request.destroy(); });
    return request.on("end", () => {
      try { const { method, args = [] } = JSON.parse(body); send(response, 200, { result: call(method, args, request) }); }
      catch (error) { send(response, 400, { error: error.message || "Request failed" }); }
    });
  }
  send(response, 404, { error: "Not found" });
});

server.listen(port, () => console.log(`Proposal Generator running at http://localhost:${port}`));
