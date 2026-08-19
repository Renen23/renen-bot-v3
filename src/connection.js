import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  isJidBroadcast,
  isJidNewsletter,
  isJidStatusBroadcast,
  useMultiFileAuthState,
} from "baileys";
import NodeCache from "node-cache";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pino from "pino";
import { PREFIX, TEMP_DIR } from "./config.js";
import { load } from "./loader.js";
import { badMacHandler } from "./utils/badMacHandler.js";
import { cacheContacts } from "./utils/lidCache.js";
import { onlyNumbers, question } from "./utils/index.js";
import {
  bannerLog,
  errorLog,
  infoLog,
  successLog,
  warningLog,
} from "./utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const logger = pino(
  { timestamp: () => `,"time":"${new Date().toJSON()}"` },
  pino.destination(path.join(TEMP_DIR, "wa-logs.txt")),
);

logger.level = "error";

const msgRetryCounterCache = new NodeCache();

function formatPairingCode(code) {
  if (!code) return code;

  return code?.match(/.{1,4}/g)?.join("-") || code;
}

function normalizePhoneNumber(rawNumber) {
  const digits = onlyNumbers(rawNumber);

  if (!digits) {
    return null;
  }

  // Número brasileiro sem código do país (DDD + número = 10 ou 11 dígitos).
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  // Já veio com código do país (12+ dígitos) — usa como está.
  if (digits.length >= 12) {
    return digits;
  }

  return digits;
}

function clearScreenWithBanner() {
  console.clear();
  bannerLog();
}

export async function connect() {
  const baileysFolder = path.resolve(
    __dirname,
    "..",
    "assets",
    "auth",
    "baileys",
  );

  const { state, saveCreds } = await useMultiFileAuthState(baileysFolder);

  const { version } = await fetchLatestBaileysVersion();

  const socket = makeWASocket({
    version,
    logger,
    defaultQueryTimeoutMs: undefined,
    retryRequestDelayMs: 1000,
    auth: state,
    shouldIgnoreJid: (jid) =>
      isJidBroadcast(jid) || isJidStatusBroadcast(jid) || isJidNewsletter(jid),
    connectTimeoutMs: 20_000,
    keepAliveIntervalMs: 30_000,
    maxMsgRetryCount: 5,
    markOnlineOnConnect: true,
    syncFullHistory: false,
    emitOwnEvents: true,
    msgRetryCounterCache,
    shouldSyncHistoryMessage: () => false,
  });

  if (!socket.authState.creds.registered) {
    clearScreenWithBanner();
    console.log(
      'Informe o número do bot (SP/RJ exigem 9º dígito). \nExemplo: "+5511912345678", demais estados: "+554112345678":',
    );

    const phoneNumber = await question("Número: ");

    if (!phoneNumber) {
      errorLog(
        'Número de telefone inválido! Tente novamente com o comando "npm start".',
      );

      process.exit(1);
    }

    if (onlyNumbers(phoneNumber).length === 12) {
      warningLog(
        "Atenção: celulares brasileiros têm 13 dígitos (55 + DDD + 9 + 8).",
      );
      warningLog(
        "Se o pareamento falhar, confira se não faltou um dígito no número e rode npm start novamente.",
      );
    }

    let code;

    try {
      code = await socket.requestPairingCode(normalizePhoneNumber(phoneNumber));
    } catch (error) {
      errorLog(
        "Não foi possível gerar o código de pareamento. O WhatsApp recusou a conexão.",
      );
      errorLog(
        "Confira se o número está correto e se é uma conta WhatsApp ativa. Depois rode npm start novamente.",
      );
      errorLog(`Detalhes: ${error?.message || error}`);

      process.exit(1);
    }

    if (!code) {
      errorLog(
        "Não foi possível gerar o código de pareamento. Confira se o número é um WhatsApp válido e rode npm start novamente.",
      );

      process.exit(1);
    }

    console.log(`\nCódigo de pareamento: ${formatPairingCode(code)}`);
    console.log("\nPassos para conectar:");
    console.log("1. Abra o WhatsApp no celular com o número acima.");
    console.log(
      "2. Toque em Configurações (⚙️) -> Aparelhos conectados -> Conectar um aparelho.",
    );
    console.log(
      "3. Escolha 'Conectar com número de telefone em vez do código QR'.",
    );
    console.log(
      "4. Digite o código acima. IMPORTANTE: o código expira em cerca de 1 minuto!\n",
    );
  }

  socket.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const error = lastDisconnect?.error;
      const statusCode = error?.output?.statusCode;

      if (
        error?.message?.includes("Bad MAC") ||
        error?.toString()?.includes("Bad MAC")
      ) {
        errorLog("Bad MAC error na desconexão detectado");

        if (badMacHandler.handleError(error, "connection.update")) {
          if (badMacHandler.hasReachedLimit()) {
            warningLog(
              "Limite de erros Bad MAC atingido. Limpando arquivos de sessão problemáticos...",
            );
            badMacHandler.clearProblematicSessionFiles();
            badMacHandler.resetErrorCount();

            const newSocket = await connect();
            load(newSocket);
            return;
          }
        }
      }

      if (statusCode === DisconnectReason.loggedOut) {
        errorLog("Bot desconectado!");
        errorLog(
          "Seu aparelho foi removido do WhatsApp. Para reconectar, apague a sessão e faça o pareamento novamente.",
        );
        warningLog(
          'No Windows: rmdir /s /q assets\\auth  |  No Termux: rm -rf assets/auth  |  Depois: npm start',
        );
        process.exit(1);
      } else {
        switch (statusCode) {
          case DisconnectReason.badSession:
            warningLog("Sessão inválida!");

            const sessionError = new Error("Bad session detected");
            if (badMacHandler.handleError(sessionError, "badSession")) {
              if (badMacHandler.hasReachedLimit()) {
                warningLog(
                  "Limite de erros de sessão atingido. Limpando arquivos de sessão...",
                );
                badMacHandler.clearProblematicSessionFiles();
                badMacHandler.resetErrorCount();
              }
            }
            break;
          case DisconnectReason.connectionClosed:
            warningLog("Conexão fechada!");
            break;
          case DisconnectReason.connectionLost:
            warningLog("Conexão perdida!");
            break;
          case DisconnectReason.connectionReplaced:
            warningLog("Conexão substituída!");
            break;
          case DisconnectReason.multideviceMismatch:
            warningLog("Dispositivo incompatível!");
            break;
          case DisconnectReason.forbidden:
            warningLog("Conexão proibida!");
            break;
          case DisconnectReason.restartRequired:
            infoLog('Me reinicie por favor! Digite "npm start".');
            break;
          case DisconnectReason.unavailableService:
            warningLog("Serviço indisponível!");
            break;
        }

        const newSocket = await connect();
        load(newSocket);
      }
    } else if (connection === "open") {
      clearScreenWithBanner();
      successLog("✅ Bot iniciado com sucesso!");
      successLog("Fui conectado com sucesso!");
      infoLog("Versão do WhatsApp Web: " + version.join("."));
      successLog(
        `✅ Estou pronto para uso! 
Verifique o prefixo, digitando a palavra "prefixo" no WhatsApp. 
O prefixo padrão definido no config.js é ${PREFIX}`,
      );
      badMacHandler.resetErrorCount();
    } else if (connection === "connecting") {
      infoLog("Conectando...");
    } else {
      infoLog("Atualizando conexão...");
    }
  });

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("contacts.upsert", (contacts) => {
    cacheContacts(contacts);
  });

  return socket;
}
