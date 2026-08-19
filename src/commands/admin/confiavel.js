import { PREFIX } from "../../config.js";
import { InvalidParameterError, WarningError } from "../../errors/index.js";
import {
  addTrustedUser,
  getTrustedUsers,
  isTrustedUser,
  removeTrustedUser,
} from "../../utils/database.js";
import { onlyNumbers, removeAccentsAndSpecialCharacters } from "../../utils/index.js";

export default {
  name: "confiavel",
  description:
    "Adiciona/remove pessoas que podem enviar links sem levar restrição.",
  commands: ["confiavel", "confiaveis", "parceria", "trusted", "liberar-link", "permitir-link"],
  usage: `${PREFIX}confiavel @usuario | ${PREFIX}confiavel remover @usuario | ${PREFIX}confiavel lista`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    words,
    isReply,
    replyLid,
    remoteJid,
    isGroup,
    sendReply,
    sendSuccessReply,
  }) => {
    if (!isGroup) {
      throw new WarningError("Este comando só pode ser usado em grupos.");
    }

    const commandWord = words.length ? words[0] : "";
    const normalized = removeAccentsAndSpecialCharacters(commandWord.toLowerCase());

    if (!commandWord) {
      const trusted = getTrustedUsers(remoteJid);

      let text =
        `📘 *COMO USAR O /CONFIAVEL*\n\n` +
        `O confiável pode enviar links *sem* o anti-link punir.\n\n` +
        `• ${PREFIX}confiavel (ver a lista)\n` +
        `• ${PREFIX}confiavel @usuario (libera)\n` +
        `• ${PREFIX}confiavel rm @usuario (remove)\n\n`;

      if (!trusted.length) {
        await sendReply(text + `Nenhum confiável cadastrado neste grupo ainda.`);
        return;
      }

      const list = trusted
        .map((lid, index) => `${index + 1}. @${onlyNumbers(lid)}`)
        .join("\n");

      await sendReply(text + `📋 *Confiáveis deste grupo:*\n${list}`, trusted);
      return;
    }

    if (["lista", "listar", "list"].includes(normalized)) {
      const trusted = getTrustedUsers(remoteJid);

      if (!trusted.length) {
        await sendReply(
          "Nenhum membro confiável cadastrado ainda.\nUse: " +
            `${PREFIX}confiavel @usuario`,
        );
        return;
      }

      const list = trusted
        .map((lid, index) => `${index + 1}. @${onlyNumbers(lid)}`)
        .join("\n");

      await sendReply(`Lista de confiáveis:\n${list}`, trusted);
      return;
    }

    const isRemoveAction = ["remover", "remove", "tirar", "del"].includes(
      normalized,
    );

    const mention = words.find((arg) => arg.includes("@"));
    const targetLid = isReply ? replyLid : null;

    if (!mention && !targetLid) {
      throw new InvalidParameterError(
        "Mencione um usuário (@) ou responda a mensagem dele!",
      );
    }

    const memberLid = targetLid || `${onlyNumbers(mention)}@lid`;

    if (isRemoveAction) {
      if (!isTrustedUser(remoteJid, memberLid)) {
        await sendReply("Este membro não está na lista de confiáveis.");
        return;
      }

      removeTrustedUser(remoteJid, memberLid);
      await sendSuccessReply(
        `@${onlyNumbers(memberLid)} removido dos confiáveis!`,
        [memberLid],
      );
      return;
    }

    if (isTrustedUser(remoteJid, memberLid)) {
      await sendReply(
        `@${onlyNumbers(memberLid)} já está na lista de confiáveis.`,
        [memberLid],
      );
      return;
    }

    addTrustedUser(remoteJid, memberLid);
    await sendSuccessReply(
      `@${onlyNumbers(memberLid)} agora pode enviar links sem restrição!`,
      [memberLid],
    );
  },
};
