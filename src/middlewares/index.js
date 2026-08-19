/**
 * Interceptadores diversos.
 */
import { OWNER_LID } from "../config.js";
import { getPrefix, isBotAdmin } from "../utils/database.js";
import { onlyNumbers } from "../utils/index.js";

export function verifyPrefix(prefix, groupJid) {
  const groupPrefix = getPrefix(groupJid);
  return groupPrefix === prefix;
}

export function hasTypeAndCommand({ type, command }) {
  return !!type && !!command;
}

export async function isAdmin({ remoteJid, userLid, socket }) {
  const { participants, owner } = await socket.groupMetadata(remoteJid);

  const userNumber = onlyNumbers(userLid);
  const ownerNumber = onlyNumbers(OWNER_LID);

  if (userNumber === ownerNumber) {
    return true;
  }

  const participant = participants.find(
    (participant) => onlyNumbers(participant.id) === userNumber,
  );

  if (!participant) {
    return false;
  }

  const isOwner = onlyNumbers(participant.id) === onlyNumbers(owner) ||
    participant.admin === "superadmin";

  const isAdmin = participant.admin === "admin";

  return isOwner || isAdmin;
}

export function isBotOwner({ userLid, webMessage }) {
  if (webMessage?.key?.fromMe) {
    return true;
  }

  return onlyNumbers(userLid) === onlyNumbers(OWNER_LID);
}

export async function checkPermission({ type, userLid, remoteJid, webMessage }) {
  if (webMessage?.key?.fromMe) {
    return true;
  }

  if (onlyNumbers(userLid) === onlyNumbers(OWNER_LID)) {
    return true;
  }

  if (type === "owner") {
    return false;
  }

  // Comandos da categoria member são públicos dentro de grupos ativos.
  // Ações administrativas continuam protegidas pelo cadastro de admins.
  if (type === "member") {
    return true;
  }

  return isBotAdmin(remoteJid, userLid);
}
