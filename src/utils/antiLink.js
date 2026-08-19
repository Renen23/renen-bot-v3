/**
 * Anti-link: apaga mensagens com link, aplica advertências
 * e remove o membro ao atingir o limite.
 */
import { OWNER_LID } from "../config.js";
import { isAdmin } from "../middlewares/index.js";
import { isActiveAntiLinkGroup, isTrustedUser } from "./database.js";
import { extractDataFromMessage, onlyNumbers } from "./index.js";
import { errorLog } from "./logger.js";
import { addWarn, getWarnLimit } from "./warnSystem.js";

const LINK_REGEX =
  /(?:https?:\/\/|ftp:\/\/|www\.|wa\.me|t\.me|telegram\.me|chat\.whatsapp\.com|bit\.ly|goo\.gl|tinyurl|youtu\.be)[^\s]+|[a-z0-9-]+\.(?:com|com\.br|net|org|io|xyz|site|shop|store|online|link|gg|cc|me|info|biz|tv|app|dev|tech|blog)(?:\/[^\s]*)?/i;

async function deleteMessage(socket, key) {
  const { id, remoteJid, participant } = key;

  await socket.sendMessage(remoteJid, {
    delete: {
      remoteJid,
      fromMe: false,
      id,
      participant,
    },
  });
}

export async function handleAntiLink({ socket, webMessage }) {
  try {
    const remoteJid = webMessage?.key?.remoteJid;

    if (!remoteJid?.endsWith("@g.us")) {
      return false;
    }

    if (webMessage?.key?.fromMe) {
      return false;
    }

    if (!isActiveAntiLinkGroup(remoteJid)) {
      return false;
    }

    const { fullMessage, userLid } = extractDataFromMessage(webMessage);

    if (!userLid) {
      return false;
    }

    if (!LINK_REGEX.test(fullMessage)) {
      return false;
    }

    if (onlyNumbers(userLid) === onlyNumbers(OWNER_LID)) {
      return false;
    }

    if (isTrustedUser(remoteJid, userLid)) {
      return false;
    }

    try {
      if (await isAdmin({ remoteJid, userLid, socket })) {
        return false;
      }
    } catch {
      // Se não der pra verificar, segue a punição.
    }

    try {
      await deleteMessage(socket, webMessage.key);
    } catch (error) {
      errorLog(
        `Anti-link: não consegui apagar a mensagem (sou admin do grupo?): ${error.message}`,
      );
    }

    const count = addWarn(remoteJid, userLid, "Link não permitido (anti-link)");
    const limit = getWarnLimit(remoteJid);
    const number = onlyNumbers(userLid);

    if (count >= limit) {
      await socket.sendMessage(remoteJid, {
        text: `🚫 *@${number}* atingiu o limite de advertências por enviar links e foi removido do grupo!`,
        mentions: [userLid],
      });

      try {
        await socket.groupParticipantsUpdate(remoteJid, [userLid], "remove");
      } catch (error) {
        errorLog(`Anti-link: não consegui remover o membro: ${error.message}`);
      }
    } else {
      await socket.sendMessage(remoteJid, {
        text: `🚫 *@${number}* enviou um link! O link foi apagado. Advertência ${count}/${limit}.`,
        mentions: [userLid],
      });
    }

    return true;
  } catch (error) {
    errorLog(`Erro no anti-link: ${error.message}`);
    return false;
  }
}
