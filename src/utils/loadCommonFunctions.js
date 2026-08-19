/**
 * Funções comuns de uso geral
 * do bot. Não há
 * necessidade de modificar
 * este arquivo.
 */
import { delay } from "baileys";
import fs from "node:fs";
import { BOT_EMOJI, TIMEOUT_IN_MILLISECONDS_BY_EVENT } from "../config.js";
import { baileysIs, extractDataFromMessage, isGroup } from "./index.js";

export function loadCommonFunctions({ socket, webMessage }) {
  const {
    args,
    commandName,
    fullArgs,
    fullMessage,
    isReply,
    prefix,
    remoteJid,
    replyLid,
    userLid,
    replyText,
    words,
  } = extractDataFromMessage(webMessage);

  if (!remoteJid) {
    return null;
  }

  const isAudio = baileysIs(webMessage, "audio");
  const isImage = baileysIs(webMessage, "image");
  const isVideo = baileysIs(webMessage, "video");
  const isSticker = baileysIs(webMessage, "sticker");

  const withRetry = async (fn, maxRetries = 3, delayMs = 1000) => {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        console.warn(
          `Tentativa ${attempt}/${maxRetries} falhou:`,
          error.message,
        );

        if (attempt < maxRetries) {
          await delay(delayMs * attempt);
        }
      }
    }

    throw new Error(
      `Falha após ${maxRetries} tentativas. Último erro: ${lastError.message}`,
    );
  };

  const sendTypingState = async (anotherJid = "") => {
    const sendToJid = anotherJid || remoteJid;

    await socket.sendPresenceUpdate("composing", sendToJid);

    await delay(TIMEOUT_IN_MILLISECONDS_BY_EVENT);
  };

  const sendText = async (text, mentions) => {
    await sendTypingState();

    let optionalParams = {};

    if (mentions?.length) {
      optionalParams = { mentions };
    }

    return await socket.sendMessage(remoteJid, {
      text: `${BOT_EMOJI} ${text}`,
      ...optionalParams,
    });
  };

  const sendReply = async (text, mentions) => {
    await sendTypingState();

    let optionalParams = {};

    if (mentions?.length) {
      optionalParams = { mentions };
    }

    return await socket.sendMessage(
      remoteJid,
      { text: `${BOT_EMOJI} ${text}`, ...optionalParams },
      { quoted: JSON.parse(JSON.stringify(webMessage)) },
    );
  };

  const sendReact = async (emoji, msgKey = webMessage.key) => {
    return await socket.sendMessage(remoteJid, {
      react: {
        text: emoji,
        key: msgKey,
      },
    });
  };

  const sendSuccessReact = async () => {
    return await sendReact("✅");
  };

  const sendWaitReact = async () => {
    return await sendReact("⏳");
  };

  const sendWarningReact = async () => {
    return await sendReact("⚠️");
  };

  const sendErrorReact = async () => {
    return await sendReact("❌");
  };

  const sendSuccessReply = async (text, mentions) => {
    await sendSuccessReact();
    return await sendReply(`✅ ${text}`, mentions);
  };

  const sendWaitReply = async (text, mentions) => {
    await sendWaitReact();
    return await sendReply(
      `⏳ Aguarde! ${text || "Carregando dados..."}`,
      mentions,
    );
  };

  const sendWarningReply = async (text, mentions) => {
    await sendWarningReact();
    return await sendReply(`⚠️ Atenção! ${text}`, mentions);
  };

  const sendErrorReply = async (text, mentions) => {
    await sendErrorReact();
    return await sendReply(`❌ Erro! ${text}`, mentions);
  };

  const sendImageFromFile = async (
    file,
    caption = "",
    mentions = null,
    quoted = true,
  ) => {
    const quotedObject = quoted
      ? { quoted: JSON.parse(JSON.stringify(webMessage)) }
      : {};

    let optionalParams = {};

    if (mentions?.length) {
      optionalParams = { mentions };
    }

    return await withRetry(async () => {
      return await socket.sendMessage(
        remoteJid,
        {
          image: fs.readFileSync(file),
          caption: caption ? `${BOT_EMOJI} ${caption}` : "",
          ...optionalParams,
        },
        {
          ...quotedObject,
        },
      );
    });
  };

  const deleteMessage = async (key) => {
    const { id, remoteJid, participant } = key;

    const deleteKey = {
      remoteJid,
      fromMe: false,
      id,
      participant,
    };

    await socket.sendMessage(remoteJid, { delete: deleteKey });
  };

  const getGroupMetadata = async (groupJid = remoteJid) => {
    if (!groupJid.endsWith("@g.us")) {
      return null;
    }

    return await socket.groupMetadata(groupJid);
  };

  return {
    args,
    words,
    commandName,
    fullArgs,
    fullMessage,
    isGroup: isGroup(remoteJid),
    isGroupWithLid: !!userLid?.endsWith("@lid"),
    isAudio,
    isImage,
    isReply,
    isSticker,
    isVideo,
    prefix,
    remoteJid,
    replyLid,
    socket,
    userLid,
    replyText,
    webMessage,
    deleteMessage,
    getGroupMetadata,
    sendErrorReact,
    sendErrorReply,
    sendImageFromFile,
    sendReact,
    sendReply,
    sendSuccessReact,
    sendSuccessReply,
    sendText,
    sendWaitReact,
    sendWaitReply,
    sendWarningReact,
    sendWarningReply,
  };
}
