const fs = require("fs");
const path = require("path");

const sourcePath = path.join(__dirname, "../src/components/Menu.vue");
const source = fs.readFileSync(sourcePath, "utf8");

const logDir = path.join(__dirname, "../logs/room-tests");
fs.mkdirSync(logDir, { recursive: true });
const stamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-")
  .replace("T", "_")
  .replace("Z", "");
const logPath = path.join(logDir, `room-mobile-menu-source-${stamp}.log`);

function writeLog(level, message, data) {
  const line = JSON.stringify({ at: new Date().toISOString(), level, message, data });
  fs.appendFileSync(logPath, `${line}\n`);
  console.log(`[${level}] ${message}${data === undefined ? "" : ` ${JSON.stringify(data)}`}`);
}

function assertContains(pattern, message) {
  const ok = pattern.test(source);
  writeLog(ok ? "PASS" : "FAIL", message, { pattern: pattern.source });
  if (!ok) throw new Error(message);
}

try {
  writeLog("INFO", "mobile menu source test started", { sourcePath, logPath });
  assertContains(/@media\s*\(max-width:\s*600px\)/, "mobile breakpoint exists");
  assertContains(/#controls\s*\{[\s\S]*?padding-right:\s*0;/, "mobile controls remove desktop padding");
  assertContains(/\.menu\s*\{[\s\S]*?position:\s*fixed;/, "mobile menu is fixed to viewport");
  assertContains(/\.menu\s*\{[\s\S]*?width:\s*50px;/, "mobile closed menu keeps cog tappable");
  assertContains(/&\.open\s*\{[\s\S]*?width:\s*min\(220px,\s*calc\(100vw - 10px\)\);/, "mobile open menu stays within viewport width");
  assertContains(/&:not\(\.open\)\s+ul\s*\{[\s\S]*?display:\s*none;/, "mobile closed menu hides offscreen list");
  assertContains(/ul\s*\{[\s\S]*?max-height:\s*calc\(100vh - 55px\);[\s\S]*?overflow-y:\s*auto;/, "mobile menu list scrolls when tall");
  writeLog("PASS", "mobile menu source test completed", { logPath });
} catch (error) {
  writeLog("FAIL", "mobile menu source test failed", { error: error.message, stack: error.stack });
  process.exit(1);
}
