# Renen Bot

Bot de WhatsApp com Baileys v7.

## Como usar (Termux)

```bash
pkg update && pkg upgrade -y
pkg install git nodejs -y
git clone -b main https://github.com/SEU_USER/Renen-bot.git
cd Renen-bot
npm install
```

## Configurar

Edite `src/config.js` e coloque seus LIDs:

```bash
nano src/config.js
```

Troque `SEU_LID_AQUI` pelo seu LID. Para saber seu LID, rode o bot e use `/meulid` no grupo.

## Rodar

```bash
npm start
```

O bot vai pedir o número do chip e gerar o código de pareamento.

## Comandos

| Comando | Descrição |
|---------|-----------|
| /menu | Lista de comandos |
| /on | Ativa o bot no grupo |
| /off | Desativa o bot no grupo |
| /adm | Gerencia quem pode usar comandos |
| /welcome 1/0 | Ativa/desativa boas-vindas |
| /exit 1/0 | Ativa/desativa mensagem de saída |
| /setwelcome | Mensagem personalizada de boas-vindas |
| /setexit | Mensagem personalizada de saída |
| /antilink 1/0 | Bloqueia links no grupo |
| /antifake 1/0 | Remove números estrangeiros |
| /setprefix | Muda o prefixo dos comandos |
| /meulid | Mostra seu LID |
