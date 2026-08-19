import { errorLog } from "../utils/logger.js";

export async function onCall({ socket, calls }) {
  if (!calls?.length) {
    return;
  }

  for (const call of calls) {
    try {
      // Sem recurso anti-chamada na versão enxuta.
      // Adicione sua lógica de chamadas aqui se desejar.
    } catch (error) {
      errorLog(
        `Erro ao processar chamada. Detalhes: ${error.message}`,
      );
    }
  }
}
