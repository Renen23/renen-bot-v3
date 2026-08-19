/**
 * Funções diversas.
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { pathToFileURL } from "node:url";
import { COMMANDS_DIR, PREFIX } from "../config.js";
import { errorLog } from "./logger.js";

export function question(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => rl.question(message, resolve));
}

function extractInteractiveResponseId(paramsJson) {
  if (!paramsJson) {
    return null;
  }

  try {
    const params = JSON.parse(paramsJson);

    return (
      params.id ||
      params.selectedId ||
      params.selectedRowId ||
      params.rowId ||
      params.buttonId ||
      params.button_id ||
      null
    );
  } catch {
    return null;
  }
}

export function extractDataFromMessage(webMessage) {
  const textMessage = webMessage.message?.conversation;
  const extendedTextMessage = webMessage.message?.extendedTextMessage;
  const extendedTextMessageText = extendedTextMessage?.text;
  const imageTextMessage = webMessage.message?.imageMessage?.caption;
  const videoTextMessage = webMessage.message?.videoMessage?.caption;
  const buttonsResponseMessage =
    webMessage.message?.buttonsResponseMessage?.selectedButtonId;
  const templateButtonReplyMessage =
    webMessage.message?.templateButtonReplyMessage?.selectedId;
  const listResponseMessage =
    webMessage.message?.listResponseMessage?.singleSelectReply?.selectedRowId;
  const interactiveResponseMessage =
    webMessage.message?.interactiveResponseMessage?.nativeFlowResponseMessage;
  const interactiveResponseId = extractInteractiveResponseId(
    interactiveResponseMessage?.paramsJson,
  );

  let fullMessage =
    textMessage ||
    extendedTextMessageText ||
    imageTextMessage ||
    videoTextMessage ||
    buttonsResponseMessage ||
    templateButtonReplyMessage ||
    listResponseMessage ||
    interactiveResponseId;

  if (!fullMessage) {
    fullMessage = "#auto-command";
  }

  const isReply =
    !!extendedTextMessage && !!extendedTextMessage.contextInfo?.quotedMessage;

  const replyLid =
    !!extendedTextMessage && !!extendedTextMessage.contextInfo?.participant
      ? extendedTextMessage.contextInfo.participant
      : null;

  const replyTextType1 =
    extendedTextMessage?.contextInfo?.quotedMessage?.conversation;

  const replyTextType2 =
    extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text;

  const replyTextType3 =
    extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage?.caption;

  const replyText = replyTextType1 || replyTextType2 || replyTextType3 || "";

  const userLid = webMessage?.key?.participant?.replace(
    /:[0-9][0-9]|:[0-9]/g,
    "",
  );

  const [command, ...args] = fullMessage.split(" ");
  const prefix = command.charAt(0);

  const commandWithoutPrefix = command.replace(new RegExp(`^[${PREFIX}]+`), "");

  return {
    args: splitByCharacters(args.join(" "), ["\\", "|", "/"]),
    words: splitWords(args),
    commandName: formatCommand(commandWithoutPrefix),
    fullArgs: args.join(" "),
    fullMessage,
    isReply,
    prefix,
    remoteJid: webMessage?.key?.remoteJid,
    replyLid,
    replyText,
    userLid,
  };
}

export function splitByCharacters(str, characters) {
  characters = characters.map((char) => (char === "\\" ? "\\\\" : char));
  const regex = new RegExp(`[${characters.join("")}]`);

  return str
    .split(regex)
    .map((str) => str.trim())
    .filter(Boolean);
}

export function splitWords(args) {
  return args.join(" ").split(/\s+/).filter(Boolean);
}

export function formatCommand(text) {
  return onlyLettersAndNumbers(
    removeAccentsAndSpecialCharacters(text.toLocaleLowerCase().trim()),
  );
}

export function isGroup(remoteJid) {
  return remoteJid.endsWith("@g.us");
}

export function onlyLettersAndNumbers(text) {
  return text.replace(/[^a-zA-Z0-9]/g, "");
}

export function removeAccentsAndSpecialCharacters(text) {
  if (!text) return "";

  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function isTrue(word) {
  if (!word) return false;

  return ["1", "ativar", "ligado", "ligar", "on", "sim", "true"].includes(
    removeAccentsAndSpecialCharacters(word.toLowerCase()),
  );
}

export function isFalse(word) {
  if (!word) return false;

  return [
    "0",
    "desativar",
    "desligado",
    "desligar",
    "off",
    "nao",
    "não",
    "false",
  ].includes(removeAccentsAndSpecialCharacters(word.toLowerCase()));
}

export function baileysIs(webMessage, context) {
  return !!getContent(webMessage, context);
}

export function getContent(webMessage, context) {
  return (
    webMessage?.message?.[`${context}Message`] ||
    webMessage?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.[
      `${context}Message`
    ] ||
    webMessage?.message?.viewOnceMessage?.message?.[`${context}Message`] ||
    webMessage?.message?.extendedTextMessage?.contextInfo?.quotedMessage
      ?.viewOnceMessage?.message?.[`${context}Message`] ||
    webMessage?.message?.viewOnceMessageV2?.message?.[`${context}Message`] ||
    webMessage?.message?.extendedTextMessage?.contextInfo?.quotedMessage
      ?.viewOnceMessageV2?.message?.[`${context}Message`]
  );
}

export function readDirectoryRecursive(dir) {
  const results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of list) {
    const itemPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      results.push(...readDirectoryRecursive(itemPath));
    } else if (
      !item.name.startsWith("_") &&
      (item.name.endsWith(".js") || item.name.endsWith(".ts"))
    ) {
      results.push(itemPath);
    }
  }

  return results;
}

export async function findCommandImport(commandName) {
  const command = await readCommandImports();

  let typeReturn = "";
  let targetCommandReturn = null;

  for (const [type, commands] of Object.entries(command)) {
    if (!commands.length) {
      continue;
    }

    try {
      const targetCommand = commands.find((cmd) => {
        if (!cmd?.commands || !Array.isArray(cmd.commands)) {
          errorLog(
            `Erro no comando do tipo "${type}": A propriedade "commands" precisa existir e ser um ["array"] com os nomes dos comandos! Arquivo errado: ${cmd.name}.js`,
          );

          return false;
        }

        return cmd.commands
          .map((cmdName) => formatCommand(cmdName))
          .includes(commandName);
      });

      if (targetCommand) {
        typeReturn = type;
        targetCommandReturn = targetCommand;
        break;
      }
    } catch (error) {
      console.error(`Erro ao processar comandos do tipo "${type}":`, error);
    }
  }

  return {
    type: typeReturn,
    command: targetCommandReturn,
  };
}

export async function readCommandImports() {
  const subdirectories = fs
    .readdirSync(COMMANDS_DIR, { withFileTypes: true })
    .filter((directory) => directory.isDirectory())
    .map((directory) => directory.name);

  const commandImports = {};

  await Promise.all(
    subdirectories.map(async (subdir) => {
      const subdirectoryPath = path.join(COMMANDS_DIR, subdir);

      const files = await Promise.all(
        readDirectoryRecursive(subdirectoryPath).map(async (filePath) => {
          try {
            const module = await import(pathToFileURL(filePath).href);
            return module.default ?? module;
          } catch (err) {
            console.error(`Erro ao importar ${filePath}:`, err);
            return null;
          }
        }),
      );

      commandImports[subdir] = files.filter(Boolean);
    }),
  );

  return commandImports;
}

export const onlyNumbers = (text) => String(text ?? "").replace(/[^0-9]/g, "");

export function parseDuration(input) {
  if (typeof input !== "string") {
    return null;
  }

  const match = input
    .trim()
    .toLowerCase()
    .match(/^(\d+)\s*(s|m|h|d|min|minuto|minutos|hora|horas|dia|dias)?$/);

  if (!match) {
    return null;
  }

  const value = parseInt(match[1], 10);

  if (!value || value <= 0) {
    return null;
  }

  const unit = match[2];

  switch (unit) {
    case "s":
      return value * 1000;
    case "":
    case "m":
    case "min":
    case "minuto":
    case "minutos":
      return value * 60 * 1000;
    case "h":
    case "hora":
    case "horas":
      return value * 60 * 60 * 1000;
    case "d":
    case "dia":
    case "dias":
      return value * 24 * 60 * 60 * 1000;
    default:
      return null;
  }
}

export function formatDuration(ms) {
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const seconds = Math.floor((ms % 60000) / 1000);

  const parts = [];

  if (days) {
    parts.push(`${days}d`);
  }

  if (hours) {
    parts.push(`${hours}h`);
  }

  if (minutes) {
    parts.push(`${minutes}m`);
  }

  if (!parts.length && seconds) {
    parts.push(`${seconds}s`);
  }

  return parts.join(" ") || "0s";
}

export function readMore() {
  const invisibleBreak = "\u200B".repeat(950);
  return invisibleBreak;
}

export function toUserLid(value) {
  return `${onlyNumbers(value)}@lid`;
}

export function toUserJid(value) {
  return `${onlyNumbers(value)}@s.whatsapp.net`;
}

export function isAtLeastMinutesInPast(timestamp, minimumMinutes = 5) {
  const currentTimestamp = Math.floor(Date.now() / 1000);

  const diffInSeconds = currentTimestamp - timestamp;

  const diffInMinutes = Math.floor(diffInSeconds / 60);

  return diffInMinutes >= minimumMinutes;
}

export function extractUserLid(data) {
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);

      if (parsed.id) {
        return parsed.id;
      }
    } catch (e) {
      return data;
    }
  }

  if (typeof data === "object" && data !== null) {
    if (data.id) {
      return data.id;
    }
  }

  return data;
}

export const GROUP_PARTICIPANT_ADD = 27;
export const GROUP_PARTICIPANT_LEAVE = 32;
export const isAddOrLeave = [GROUP_PARTICIPANT_ADD, GROUP_PARTICIPANT_LEAVE];
