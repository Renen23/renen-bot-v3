/**
 * Evento chamado quando um usuário
 * entra ou sai de um grupo de WhatsApp.
 */
import { BOT_LID, OWNER_LID } from "../config.js";
import { exitMessage, welcomeMessage } from "../messages.js";
import { isAdmin } from "./index.js";
import {
  getBotAdmins,
  getExitMessage,
  getWelcomeMessage,
  isActiveAntifakeGroup,
  isActiveExitGroup,
  isActiveGroup,
  isActiveWelcomeGroup,
  isBotAdmin,
} from "../utils/database.js";
import { extractUserLid, onlyNumbers } from "../utils/index.js";
import { errorLog } from "../utils/logger.js";

export async function onGroupParticipantsUpdate({
  data,
  remoteJid,
  socket,
  action,
}) {
  try {
    if (!remoteJid.endsWith("@g.us")) {
      return;
    }

    if (!isActiveGroup(remoteJid)) {
      return;
    }

    const userLid = extractUserLid(data);

    if (!userLid) {
      return;
    }

    if (action === "add") {
      if (isActiveAntifakeGroup(remoteJid)) {
        try {
          const metadata = await socket.groupMetadata(remoteJid);
          const participant = metadata.participants?.find(
            (item) =>
              onlyNumbers(item.id) === onlyNumbers(userLid) ||
              onlyNumbers(item.lid) === onlyNumbers(userLid),
          );

          let phoneNumber = null;
          const candidates = [
            data?.phoneNumber,
            data?.phone,
            data?.id,
            data?.jid,
            data?.participant,
            data?.participantAlt,
            participant?.phoneNumber,
            participant?.phone,
            participant?.id,
            participant?.jid,
            participant?.participantAlt,
          ];

          for (const candidate of candidates) {
            if (!candidate) continue;
            const value = String(candidate);
            const number = onlyNumbers(value);
            if (number && !value.endsWith("@lid")) {
              phoneNumber = number;
              break;
            }
          }

          if (phoneNumber) {
            const isProtected =
              onlyNumbers(userLid) === onlyNumbers(BOT_LID) ||
              onlyNumbers(userLid) === onlyNumbers(OWNER_LID) ||
              isBotAdmin(remoteJid, userLid) ||
              getBotAdmins(remoteJid).some(
                (stored) => onlyNumbers(stored) === onlyNumbers(phoneNumber),
              ) ||
              (await isAdmin({ remoteJid, userLid, socket }));

            if (!isProtected && !phoneNumber.startsWith("55")) {
              const targetId = participant?.id || userLid;
              await socket.groupParticipantsUpdate(remoteJid, [targetId], "remove");
              await socket.sendMessage(remoteJid, {
                text: `🚫 @${onlyNumbers(phoneNumber)} removido pelo antifake.\nApenas números brasileiros com indicativo 55 são permitidos.`,
                mentions: [targetId],
              });
              return;
            }
          }
        } catch {
          // Se falhar, ignora e continua
        }
      }

      if (isActiveWelcomeGroup(remoteJid)) {
        const welcomeText = getWelcomeMessage(remoteJid) || welcomeMessage;
        const cleanText = welcomeText.replace(/[\u200B-\u200D\uFEFF]/g, "");
        const hasMemberMention = cleanText.includes("@member");

        if (hasMemberMention) {
          const userNumber = onlyNumbers(userLid);
          let mentionId = userLid;

          try {
            const meta = await socket.groupMetadata(remoteJid);
            const participant = meta.participants?.find(
              (p) => onlyNumbers(p.id) === userNumber || onlyNumbers(p.lid) === userNumber,
            );
            if (participant?.id) mentionId = participant.id;
          } catch {}

          const finalWelcomeMessage = cleanText.replace(/@member/g, `@${userNumber}`);
          await socket.sendMessage(remoteJid, {
            text: finalWelcomeMessage,
            mentions: [mentionId],
          });
        } else {
          await socket.sendMessage(remoteJid, { text: welcomeText });
        }
      }
    } else if (action === "remove" && isActiveExitGroup(remoteJid)) {
      const exitText = getExitMessage(remoteJid) || exitMessage;
      const cleanExit = exitText.replace(/[\u200B-\u200D\uFEFF]/g, "");
      const hasMemberMention = cleanExit.includes("@member");

      if (hasMemberMention) {
        const userNumber = onlyNumbers(userLid);
        let mentionId = userLid;

        try {
          const meta = await socket.groupMetadata(remoteJid);
          const participant = meta.participants?.find(
            (p) => onlyNumbers(p.id) === userNumber || onlyNumbers(p.lid) === userNumber,
          );
          if (participant?.id) mentionId = participant.id;
        } catch {}

        const finalExitMessage = cleanExit.replace(/@member/g, `@${userNumber}`);
        await socket.sendMessage(remoteJid, {
          text: finalExitMessage,
          mentions: [mentionId],
        });
      } else {
        await socket.sendMessage(remoteJid, { text: exitText });
      }
    }
  } catch (error) {
    errorLog(`Erro em onGroupParticipantsUpdate: ${error.message}`);
    errorLog(JSON.stringify(error, null, 2));
  }
}
