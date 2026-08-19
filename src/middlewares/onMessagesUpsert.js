/**
 * Evento chamado quando uma mensagem
 * é enviada para o grupo do WhatsApp
 */
import { DEVELOPER_MODE } from "../config.js";
import { handleAntiLink } from "../utils/antiLink.js";
import { badMacHandler } from "../utils/badMacHandler.js";
import { checkIfMemberIsMuted, getPrefix, isActiveGroup } from "../utils/database.js";
import { dynamicCommand } from "../utils/dynamicCommand.js";
import {
  GROUP_PARTICIPANT_ADD,
  GROUP_PARTICIPANT_LEAVE,
  isAddOrLeave,
  isAtLeastMinutesInPast,
  onlyNumbers,
} from "../utils/index.js";
import { loadCommonFunctions } from "../utils/loadCommonFunctions.js";
import { errorLog, infoLog } from "../utils/logger.js";
import { customMiddleware } from "./customMiddleware.js";
import { onGroupParticipantsUpdate } from "./onGroupParticipantsUpdate.js";

export async function onMessagesUpsert({ socket, messages, startProcess }) {
  if (!messages.length) {
    return;
  }

  for (const webMessage of messages) {
    if (DEVELOPER_MODE) {
      infoLog(
        `\n\n⪨========== [ MENSAGEM RECEBIDA ] ==========⪩ \n\n${JSON.stringify(
          messages,
          null,
          2,
        )}`,
      );
    }

    try {
      if (!webMessage?.key?.remoteJid?.endsWith("@g.us")) {
        continue;
      }

      const groupActive = isActiveGroup(webMessage?.key?.remoteJid);

      const senderNumber =
        onlyNumbers(webMessage?.key?.participant) ||
        onlyNumbers(webMessage?.key?.remoteJid);

      const receivedText =
        webMessage?.message?.conversation ||
        webMessage?.message?.extendedTextMessage?.text ||
        "(sem texto)";

      if (groupActive) {
        console.log(`[MSG] user=${senderNumber} | ${receivedText}`);
      }

      const timestamp = webMessage.messageTimestamp;

      if (isAtLeastMinutesInPast(timestamp)) {
        continue;
      }

      if (!groupActive) {
        const text = (webMessage?.message?.conversation || webMessage?.message?.extendedTextMessage?.text || "").trim().toLowerCase();
        const groupPrefix = getPrefix(webMessage.key.remoteJid);
        if (!text.startsWith(groupPrefix)) {
          continue;
        }
      }

      if (groupActive && isAddOrLeave.includes(webMessage.messageStubType)) {
        let action = "";
        if (webMessage.messageStubType === GROUP_PARTICIPANT_ADD) {
          action = "add";
        } else if (webMessage.messageStubType === GROUP_PARTICIPANT_LEAVE) {
          action = "remove";
        }

        await customMiddleware({
          socket,
          webMessage,
          type: "participant",
          action,
          data: webMessage.messageStubParameters[0],
          commonFunctions: null,
        });

        await onGroupParticipantsUpdate({
          data: webMessage.messageStubParameters[0],
          remoteJid: webMessage.key.remoteJid,
          socket,
          action,
        });

        return;
      }

      if (
        groupActive &&
        checkIfMemberIsMuted(
          webMessage?.key?.remoteJid,
          webMessage?.key?.participant?.replace(/:[0-9][0-9]|:[0-9]/g, ""),
        )
      ) {
        try {
          const { id, remoteJid, participant } = webMessage.key;

          const deleteKey = {
            remoteJid,
            fromMe: false,
            id,
            participant,
          };

          await socket.sendMessage(remoteJid, { delete: deleteKey });
        } catch (error) {
          errorLog(
            `Erro ao deletar mensagem de membro silenciado, provavelmente eu não sou administrador do grupo! ${error.message}`,
          );
        }

        return;
      }

      const handledByAntiLink = groupActive
        ? await handleAntiLink({ socket, webMessage })
        : false;

      if (handledByAntiLink) {
        continue;
      }

      const commonFunctions = loadCommonFunctions({ socket, webMessage });

      if (!commonFunctions) {
        continue;
      }

      await customMiddleware({
        socket,
        webMessage,
        type: "message",
        commonFunctions,
      });

      await dynamicCommand(commonFunctions, startProcess);
    } catch (error) {
      if (badMacHandler.handleError(error, "message-processing")) {
        continue;
      }

      if (badMacHandler.isSessionError(error)) {
        errorLog(`Erro de sessão ao processar mensagem: ${error.message}`);
        continue;
      }

      errorLog(
        `Erro ao processar mensagem: ${error.message} | Stack: ${error.stack}`,
      );

      continue;
    }
  }
}
