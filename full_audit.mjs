import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve("src");
const commandRoot = path.join(root, "commands");
const findings = [];
const files = [];

function add(severity, area, file, line, finding, recommendation) {
  findings.push({ severity, area, file, line, finding, recommendation });
}

function lineOf(source, token) {
  const index = source.indexOf(token);
  return index < 0 ? null : source.slice(0, index).split("\n").length;
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(filePath);
    else if (entry.name.endsWith(".js")) files.push(filePath);
  }
}

walk(root);

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const relative = path.relative(process.cwd(), file);
  if (/TODO|FIXME|XXX/.test(source)) {
    add("low", "qualidade", relative, lineOf(source, "TODO") || lineOf(source, "FIXME") || lineOf(source, "XXX"), "Marcador de trabalho pendente encontrado.", "Resolver ou documentar a pendência.");
  }
  if (/console\.log\(/.test(source)) {
    add("low", "logging", relative, lineOf(source, "console.log("), "Uso de console.log em código de produção.", "Usar o logger centralizado e controlar o nível de detalhe por ambiente.");
  }
  if (/process\.exit\(/.test(source)) {
    add("medium", "resiliência", relative, lineOf(source, "process.exit("), "Encerramento direto do processo encontrado.", "Preferir retorno controlado ou reinício supervisionado quando possível.");
  }
  if (/catch\s*\{\s*\}/.test(source)) {
    add("medium", "observabilidade", relative, lineOf(source, "catch {}"), "Erro engolido sem log.", "Registar o erro com contexto, sem expor dados sensíveis.");
  }
  if (/JSON\.parse\(/.test(source) && /readFileSync/.test(source)) {
    add("medium", "persistência", relative, lineOf(source, "JSON.parse("), "Leitura de JSON sem proteção transacional ou recuperação de ficheiro corrompido.", "Validar o conteúdo e usar escrita atómica com ficheiro temporário e rename.");
  }
}

const groups = {};
for (const category of fs.readdirSync(commandRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
  groups[category.name] = [];
  const dir = path.join(commandRoot, category.name);
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith(".js"))) {
    const filePath = path.join(dir, file);
    try {
      const module = await import(pathToFileURL(filePath).href);
      const command = module.default ?? module;
      groups[category.name].push({ file: path.relative(process.cwd(), filePath), command });
      if (!command.name) add("high", "comandos", path.relative(process.cwd(), filePath), null, "Comando sem propriedade name.", "Definir um nome estável para logs, ajuda e auditoria.");
      if (!Array.isArray(command.commands) || !command.commands.length) add("high", "comandos", path.relative(process.cwd(), filePath), null, "Comando sem lista de aliases.", "Definir pelo menos o nome principal em commands.");
      if (!command.description) add("medium", "comandos", path.relative(process.cwd(), filePath), null, "Comando sem descrição.", "Adicionar descrição clara e curta.");
      if (!command.usage) add("medium", "comandos", path.relative(process.cwd(), filePath), null, "Comando sem usage.", "Documentar a sintaxe esperada.");
    } catch (error) {
      add("critical", "imports", path.relative(process.cwd(), filePath), null, `Falha ao importar o comando: ${error.message}`, "Corrigir imports, sintaxe ou dependências antes de executar o bot.");
    }
  }
}

const aliases = new Map();
for (const [category, commands] of Object.entries(groups)) {
  for (const { file, command } of commands) {
    for (const alias of command.commands ?? []) {
      const key = String(alias).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
      const owners = aliases.get(key) ?? [];
      owners.push({ category, file, alias });
      aliases.set(key, owners);
    }
  }
}
for (const [alias, owners] of aliases) {
  const commandFiles = new Set(owners.map((owner) => owner.file));
  if (commandFiles.size > 1) {
    add("critical", "aliases", owners.map((owner) => `${owner.category}:${owner.file}:${owner.alias}`).join(", "), null, `Alias normalizado pertence a comandos diferentes: ${alias}.`, "Renomear um dos comandos ou criar uma regra explícita de resolução.");
  } else if (owners.length > 1) {
    add("info", "aliases", owners.map((owner) => `${owner.file}:${owner.alias}`).join(", "), null, `Aliases equivalentes mantidos no mesmo comando: ${alias}.`, "Manter apenas se a compatibilidade com comandos antigos for desejada.");
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  sourceFiles: files.length,
  commandFiles: Object.values(groups).reduce((total, values) => total + values.length, 0),
  categories: Object.fromEntries(Object.entries(groups).map(([key, values]) => [key, values.length])),
  findings,
};

console.log(JSON.stringify(report, null, 2));
