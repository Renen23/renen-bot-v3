import { PREFIX } from "../../config.js";
import { InvalidParameterError, WarningError } from "../../errors/index.js";
import {
  activateAntiLinkGroup,
  deactivateAntiLinkGroup,
  isActiveAntiLinkGroup,
} from "../../utils/database.js";
import { isFalse, isTrue } from "../../utils/index.js";

export default {
  name: "antilink",
  description:
    "Ativo/desativo o bloqueio de links no grupo (apaga o link, dá advertência e remove no limite).",
  commands: ["antilink", "anti-link", "antilinks", "anti-links", "bloquear-links"],
  usage: `${PREFIX}antilink (1/0)`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({ args, sendReply, sendSuccessReact, remoteJid }) => {
    if (!args.length) {
      throw new InvalidParameterError(
        "Você precisa digitar 1 ou 0 (ligar ou desligar)!",
      );
    }
    const enable = isTrue(args[0]);
    const disable = isFalse(args[0]);
    if (!enable && !disable) {
      throw new InvalidParameterError(
        "Você precisa digitar 1 ou 0 (ligar ou desligar)!",
      );
    }
    const hasActive = enable && isActiveAntiLinkGroup(remoteJid);
    const hasInactive = disable && !isActiveAntiLinkGroup(remoteJid);
    if (hasActive || hasInactive) {
      throw new WarningError(
        `O anti-link já está ${enable ? "ativado" : "desativado"}!`,
      );
    }
    if (enable) {
      activateAntiLinkGroup(remoteJid);
    } else {
      deactivateAntiLinkGroup(remoteJid);
    }
    await sendSuccessReact();
    const context = enable ? "ativado" : "desativado";
    await sendReply(`Anti-link ${context} com sucesso!`);
  },
};
