/**
 * Mensagens padrão do bot.
 *
 * Use "@member" para mencionar automaticamente o participante.
 * As mensagens podem ser alteradas por grupo com /setwelcome e /setexit.
 */
export const welcomeMessage = "Bem-vindo(a) ao grupo, @member! Leia as regras e aproveite a conversa.";
export const exitMessage = "Até mais, @member! Obrigado por participar do grupo.";

export function clearChat() {
  return `🗑️${"\n".repeat(1891)}🗑️`;
}
