/**
 * Funções úteis para trabalhar
 * com dados.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PREFIX } from "../config.js";
import { onlyNumbers } from "./index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databasePath = path.resolve(__dirname, "..", "..", "database");

const EXIT_GROUPS_FILE = "exit-groups";
const EXIT_MESSAGES_FILE = "exit-messages";
const ACTIVE_GROUPS_FILE = "active-groups";
const ANTI_LINK_GROUPS_FILE = "anti-link-groups";
const ANTIFAKE_GROUPS_FILE = "antifake-groups";
const MUTE_FILE = "muted";
const ONLY_ADMINS_FILE = "only-admins";
const PREFIX_GROUPS_FILE = "prefix-groups";
const TRUSTED_USERS_FILE = "trusted-users";
const WELCOME_GROUPS_FILE = "welcome-groups";
const WELCOME_MESSAGES_FILE = "welcome-messages";
const BOT_ADMINS_FILE = "bot-admins";
const MUTE_EXPIRATIONS_FILE = "mute-expirations";

function createIfNotExists(fullPath, formatIfNotExists = []) {
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(databasePath, { recursive: true });
    fs.writeFileSync(fullPath, JSON.stringify(formatIfNotExists));
  }
}

function readJSON(jsonFile, formatIfNotExists = []) {
  const fullPath = path.resolve(databasePath, `${jsonFile}.json`);

  createIfNotExists(fullPath, formatIfNotExists);

  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function writeJSON(jsonFile, data, formatIfNotExists = []) {
  const fullPath = path.resolve(databasePath, `${jsonFile}.json`);

  createIfNotExists(fullPath, formatIfNotExists);

  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), "utf8");
}

export function activateExitGroup(groupId) {
  const filename = EXIT_GROUPS_FILE;

  const exitGroups = readJSON(filename);

  if (!exitGroups.includes(groupId)) {
    exitGroups.push(groupId);
  }

  writeJSON(filename, exitGroups);
}

export function deactivateExitGroup(groupId) {
  const filename = EXIT_GROUPS_FILE;

  const exitGroups = readJSON(filename);

  const index = exitGroups.indexOf(groupId);

  if (index === -1) {
    return;
  }

  exitGroups.splice(index, 1);

  writeJSON(filename, exitGroups);
}

export function isActiveExitGroup(groupId) {
  const filename = EXIT_GROUPS_FILE;

  const exitGroups = readJSON(filename);

  return exitGroups.includes(groupId);
}

export function activateWelcomeGroup(groupId) {
  const filename = WELCOME_GROUPS_FILE;

  const welcomeGroups = readJSON(filename);

  if (!welcomeGroups.includes(groupId)) {
    welcomeGroups.push(groupId);
  }

  writeJSON(filename, welcomeGroups);
}

export function deactivateWelcomeGroup(groupId) {
  const filename = WELCOME_GROUPS_FILE;

  const welcomeGroups = readJSON(filename);

  const index = welcomeGroups.indexOf(groupId);

  if (index === -1) {
    return;
  }

  welcomeGroups.splice(index, 1);

  writeJSON(filename, welcomeGroups);
}

export function isActiveWelcomeGroup(groupId) {
  const filename = WELCOME_GROUPS_FILE;

  const welcomeGroups = readJSON(filename);

  return welcomeGroups.includes(groupId);
}

export function activateGroup(groupId) {
  const filename = ACTIVE_GROUPS_FILE;

  const activeGroups = readJSON(filename, []);

  if (!activeGroups.includes(groupId)) {
    activeGroups.push(groupId);
  }

  writeJSON(filename, activeGroups);
}

export function deactivateGroup(groupId) {
  const filename = ACTIVE_GROUPS_FILE;

  const activeGroups = readJSON(filename, []);

  const index = activeGroups.indexOf(groupId);

  if (index === -1) {
    return;
  }

  activeGroups.splice(index, 1);

  writeJSON(filename, activeGroups);
}

export function isActiveGroup(groupId) {
  const filename = ACTIVE_GROUPS_FILE;

  const activeGroups = readJSON(filename, []);

  return activeGroups.includes(groupId);
}

export function getActiveGroups() {
  const filename = ACTIVE_GROUPS_FILE;

  return readJSON(filename, []);
}

export function activateAntiLinkGroup(groupId) {
  const filename = ANTI_LINK_GROUPS_FILE;

  const antiLinkGroups = readJSON(filename);

  if (!antiLinkGroups.includes(groupId)) {
    antiLinkGroups.push(groupId);
  }

  writeJSON(filename, antiLinkGroups);
}

export function deactivateAntiLinkGroup(groupId) {
  const filename = ANTI_LINK_GROUPS_FILE;

  const antiLinkGroups = readJSON(filename);

  const index = antiLinkGroups.indexOf(groupId);

  if (index === -1) {
    return;
  }

  antiLinkGroups.splice(index, 1);

  writeJSON(filename, antiLinkGroups);
}

export function isActiveAntiLinkGroup(groupId) {
  const filename = ANTI_LINK_GROUPS_FILE;

  const antiLinkGroups = readJSON(filename);

  return antiLinkGroups.includes(groupId);
}

export function activateAntifakeGroup(groupId) {
  const antifakeGroups = readJSON(ANTIFAKE_GROUPS_FILE, []);

  if (!antifakeGroups.includes(groupId)) {
    antifakeGroups.push(groupId);
    writeJSON(ANTIFAKE_GROUPS_FILE, antifakeGroups, []);
  }
}

export function deactivateAntifakeGroup(groupId) {
  const antifakeGroups = readJSON(ANTIFAKE_GROUPS_FILE, []);
  const filteredGroups = antifakeGroups.filter((stored) => stored !== groupId);

  if (filteredGroups.length !== antifakeGroups.length) {
    writeJSON(ANTIFAKE_GROUPS_FILE, filteredGroups, []);
  }
}

export function isActiveAntifakeGroup(groupId) {
  return readJSON(ANTIFAKE_GROUPS_FILE, []).includes(groupId);
}

export function addTrustedUser(groupId, userLid) {
  const filename = TRUSTED_USERS_FILE;

  const trustedUsers = readJSON(filename, {});

  if (!trustedUsers[groupId]) {
    trustedUsers[groupId] = [];
  }

  if (!trustedUsers[groupId].includes(userLid)) {
    trustedUsers[groupId].push(userLid);
  }

  writeJSON(filename, trustedUsers, {});
}

export function removeTrustedUser(groupId, userLid) {
  const filename = TRUSTED_USERS_FILE;

  const trustedUsers = readJSON(filename, {});

  if (!trustedUsers[groupId]) {
    return;
  }

  const index = trustedUsers[groupId].indexOf(userLid);

  if (index !== -1) {
    trustedUsers[groupId].splice(index, 1);
  }

  writeJSON(filename, trustedUsers, {});
}

export function isTrustedUser(groupId, userLid) {
  const filename = TRUSTED_USERS_FILE;

  const trustedUsers = readJSON(filename, {});

  return trustedUsers[groupId]?.includes(userLid) || false;
}

export function getTrustedUsers(groupId) {
  const filename = TRUSTED_USERS_FILE;

  const trustedUsers = readJSON(filename, {});

  return trustedUsers[groupId] || [];
}

export function muteMember(groupId, memberId) {
  const filename = MUTE_FILE;

  const mutedMembers = readJSON(filename, {});

  if (!mutedMembers[groupId]) {
    mutedMembers[groupId] = [];
  }

  const key = onlyNumbers(memberId);

  if (!mutedMembers[groupId]?.includes(key)) {
    mutedMembers[groupId].push(key);
  }

  writeJSON(filename, mutedMembers);
}

export function unmuteMember(groupId, memberId) {
  const filename = MUTE_FILE;

  const mutedMembers = readJSON(filename, {});

  const key = onlyNumbers(memberId);

  if (!mutedMembers[groupId]) {
    return;
  }

  mutedMembers[groupId] = mutedMembers[groupId].filter(
    (stored) => stored !== key,
  );

  writeJSON(filename, mutedMembers);
}

export function checkIfMemberIsMuted(groupId, memberId) {
  const filename = MUTE_FILE;

  const mutedMembers = readJSON(filename, {});

  const key = onlyNumbers(memberId);

  if (!mutedMembers[groupId] || !mutedMembers[groupId].includes(key)) {
    return false;
  }

  const expiresAt = getMuteExpiration(groupId, key);

  if (expiresAt && expiresAt <= Date.now()) {
    unmuteMember(groupId, key);
    removeMuteExpiration(groupId, key);
    return false;
  }

  return true;
}

export function setMuteExpiration(groupId, memberId, expiresAt) {
  const filename = MUTE_EXPIRATIONS_FILE;

  const expirations = readJSON(filename, {});

  if (!expirations[groupId]) {
    expirations[groupId] = {};
  }

  expirations[groupId][onlyNumbers(memberId)] = expiresAt;

  writeJSON(filename, expirations, {});
}

export function getMuteExpiration(groupId, memberId) {
  const filename = MUTE_EXPIRATIONS_FILE;

  const expirations = readJSON(filename, {});

  return expirations[groupId]?.[onlyNumbers(memberId)] || 0;
}

export function removeMuteExpiration(groupId, memberId) {
  const filename = MUTE_EXPIRATIONS_FILE;

  const expirations = readJSON(filename, {});

  if (expirations[groupId]) {
    delete expirations[groupId][onlyNumbers(memberId)];
  }

  writeJSON(filename, expirations, {});
}

export function scheduleUnmute(groupId, memberId, expiresAt) {
  const remaining = expiresAt - Date.now();

  if (remaining <= 0) {
    return;
  }

  setTimeout(() => {
    try {
      if (getMuteExpiration(groupId, memberId) <= Date.now()) {
        unmuteMember(groupId, memberId);
        removeMuteExpiration(groupId, memberId);
      }
    } catch {
      // ignora
    }
  }, remaining);
}

export function activateOnlyAdmins(groupId) {
  const filename = ONLY_ADMINS_FILE;

  const onlyAdminsGroups = readJSON(filename, []);

  if (!onlyAdminsGroups.includes(groupId)) {
    onlyAdminsGroups.push(groupId);
  }

  writeJSON(filename, onlyAdminsGroups);
}

export function deactivateOnlyAdmins(groupId) {
  const filename = ONLY_ADMINS_FILE;

  const onlyAdminsGroups = readJSON(filename, []);

  const index = onlyAdminsGroups.indexOf(groupId);
  if (index === -1) {
    return;
  }

  onlyAdminsGroups.splice(index, 1);

  writeJSON(filename, onlyAdminsGroups);
}

export function isActiveOnlyAdmins(groupId) {
  const filename = ONLY_ADMINS_FILE;

  const onlyAdminsGroups = readJSON(filename, []);

  return onlyAdminsGroups.includes(groupId);
}

export function setPrefix(groupJid, prefix) {
  const filename = PREFIX_GROUPS_FILE;

  const prefixGroups = readJSON(filename, {});

  prefixGroups[groupJid] = prefix;

  writeJSON(filename, prefixGroups, {});
}

export function getPrefix(groupJid) {
  const filename = PREFIX_GROUPS_FILE;

  const prefixGroups = readJSON(filename, {});

  return prefixGroups[groupJid] || PREFIX;
}

export function setWelcomeMessage(groupId, message) {
  const filename = WELCOME_MESSAGES_FILE;

  const messages = readJSON(filename, {});

  messages[groupId] = message;

  writeJSON(filename, messages, {});
}

export function getWelcomeMessage(groupId) {
  const filename = WELCOME_MESSAGES_FILE;

  const messages = readJSON(filename, {});

  return messages[groupId] || null;
}

export function resetWelcomeMessage(groupId) {
  const filename = WELCOME_MESSAGES_FILE;

  const messages = readJSON(filename, {});

  if (!messages[groupId]) {
    return;
  }

  delete messages[groupId];

  writeJSON(filename, messages, {});
}

export function setExitMessage(groupId, message) {
  const filename = EXIT_MESSAGES_FILE;

  const messages = readJSON(filename, {});

  messages[groupId] = message;

  writeJSON(filename, messages, {});
}

export function getExitMessage(groupId) {
  const filename = EXIT_MESSAGES_FILE;

  const messages = readJSON(filename, {});

  return messages[groupId] || null;
}

export function addBotAdmin(groupId, userLid) {
  const filename = BOT_ADMINS_FILE;

  const botAdmins = readJSON(filename, {});

  if (!botAdmins[groupId]) {
    botAdmins[groupId] = [];
  }

  const key = onlyNumbers(userLid);

  if (!botAdmins[groupId].some((stored) => onlyNumbers(stored) === key)) {
    botAdmins[groupId].push(key);
  }

  writeJSON(filename, botAdmins, {});
}

export function removeBotAdmin(groupId, userLid) {
  const filename = BOT_ADMINS_FILE;

  const botAdmins = readJSON(filename, {});

  const key = onlyNumbers(userLid);

  if (!botAdmins[groupId]) {
    return;
  }

  botAdmins[groupId] = botAdmins[groupId].filter(
    (stored) => onlyNumbers(stored) !== key,
  );

  writeJSON(filename, botAdmins, {});
}

export function getBotAdmins(groupId) {
  const filename = BOT_ADMINS_FILE;

  const botAdmins = readJSON(filename, {});

  return botAdmins[groupId] || [];
}

export function isBotAdmin(groupId, userLid) {
  const key = onlyNumbers(userLid);

  return getBotAdmins(groupId).some((stored) => onlyNumbers(stored) === key);
}

export function resetExitMessage(groupId) {
  const filename = EXIT_MESSAGES_FILE;

  const messages = readJSON(filename, {});

  if (!messages[groupId]) {
    return;
  }

  delete messages[groupId];

  writeJSON(filename, messages, {});
}
