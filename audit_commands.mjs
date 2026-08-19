import fs from "node:fs";
import path from "node:path";

const root = "/home/ubuntu/repo_renen/src/commands";
const rows = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(filePath);
    else if (entry.name.endsWith(".js")) {
      const source = fs.readFileSync(filePath, "utf8");
      const category = path.relative(root, path.dirname(filePath)).split(path.sep)[0];
      const name = source.match(/\bname:\s*["'`]([^"'`]+)["'`]/)?.[1] ?? "(sem nome)";
      const description = source.match(/\bdescription:\s*["'`]([^"'`]+)["'`]/s)?.[1]?.replace(/\s+/g, " ") ?? "(sem descrição)";
      const usage = source.match(/\busage:\s*`([^`]+)`/)?.[1] ?? "(sem usage)";
      const block = source.match(/\bcommands:\s*(\[[\s\S]*?\])/)?.[1] ?? "[]";
      const aliases = [...block.matchAll(/["'`]([^"'`]+)["'`]/g)].map((match) => match[1]);
      rows.push({ category, file: path.relative(root, filePath), name, aliases, usage, description });
    }
  }
}

walk(root);
rows.sort((a, b) => `${a.category}/${a.file}`.localeCompare(`${b.category}/${b.file}`));
const normalise = (value) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
const aliasMap = new Map();
for (const row of rows) {
  for (const alias of row.aliases) {
    const key = normalise(alias);
    aliasMap.set(key, [...(aliasMap.get(key) ?? []), `${row.category}/${row.file}:${alias}`]);
  }
}
const duplicates = [...aliasMap].filter(([, owners]) => owners.length > 1);
const inversePairs = [["abrir", "fechar"], ["on", "off"], ["mute", "unmute"], ["warn", "unwarn"], ["welcome", "exit"], ["promover", "rebaixar"], ["antilink", "confiavel"], ["setwelcome", "setexit"]];
const byName = new Map(rows.map((row) => [normalise(row.name), row]));
console.log(JSON.stringify({ totalFiles: rows.length, rows, duplicates, inversePairs: inversePairs.map(([a,b]) => ({ a, b, aFound: !!byName.get(normalise(a)), bFound: !!byName.get(normalise(b)) })) }, null, 2));
