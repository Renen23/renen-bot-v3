import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve("src/commands");
const rows = [];

function walk(dir, category) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(filePath, category || entry.name);
    else if (entry.name.endsWith(".js")) {
      const source = fs.readFileSync(filePath, "utf8");
      rows.push({ filePath, category, source });
    }
  }
}

walk(root, null);

for (const row of rows) {
  let command = null;
  let importError = null;
  try {
    const module = await import(pathToFileURL(row.filePath).href);
    command = module.default ?? module;
  } catch (error) {
    importError = error.message;
  }
  const source = row.source;
  const file = path.relative(process.cwd(), row.filePath);
  const effects = [];
  if (/groupParticipantsUpdate/.test(source)) effects.push("participantes");
  if (/groupSettingUpdate/.test(source)) effects.push("configuração do grupo");
  if (/sendMessage/.test(source)) effects.push("mensagens");
  if (/setPrefix|setWelcomeMessage|setExitMessage|setname|writeJSON|addWarn|muteMember/.test(source)) effects.push("persistência");
  rows[rows.indexOf(row)] = {
    file,
    category: row.category,
    name: command?.name ?? null,
    aliases: command?.commands ?? [],
    description: command?.description ?? null,
    usage: command?.usage ?? null,
    importError,
    checks: {
      group: /isGroup|isGroup\s*\(/.test(source),
      adminOrOwner: /isAdmin|checkPermission|isBotOwner/.test(source),
      parameterErrors: /InvalidParameterError|WarningError|DangerError/.test(source),
      replyOrResponse: /sendReply|sendSuccessReply|sendWarningReply|sendErrorReply/.test(source),
    },
    effects,
  };
}

console.log(JSON.stringify({ generatedAt: new Date().toISOString(), total: rows.length, commands: rows }, null, 2));
