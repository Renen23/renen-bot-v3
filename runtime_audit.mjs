import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve("src");
const failures = [];
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(filePath);
    else if (entry.name.endsWith(".js") && filePath !== path.join(root, "index.js")) files.push(filePath);
  }
}

walk(root);
for (const file of files) {
  try {
    await import(pathToFileURL(file).href);
  } catch (error) {
    failures.push({ file: path.relative(process.cwd(), file), error: error.message });
  }
}

console.log(JSON.stringify({ total: files.length, failures }, null, 2));
if (failures.length) process.exitCode = 1;
