import * as baileys from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';

async function startBot() {
  const { state, saveCreds } = await baileys.useMultiFileAuthState('./auth_info_multi');

  const sock = baileys.makeWASocket({
    auth: state,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect =
        (lastDisconnect?.error)?.output?.statusCode !== baileys.DisconnectReason.loggedOut;
      console.log('❌ Conexão encerrada. Reconectando?', shouldReconnect);
      if (shouldReconnect) {
        startBot();
      }
    }

    if (connection === 'open') {
      console.log('✅ Bot conectado ao WhatsApp!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    const messageText = msg.message.conversation || msg.message.extendedTextMessage?.text;

    async function isAdmin(jid, participantId) {
      try {
        const groupMetadata = await sock.groupMetadata(jid);
        const participant = groupMetadata.participants.find(p => p.id === participantId);
        return participant?.admin === 'admin' || participant?.admin === 'superadmin';
      } catch {
        return false;
      }
    }

    if (messageText === '!berrante') {
      if (!isGroup) {
        await sock.sendMessage(from, { text: '❗ Esse comando só funciona em grupos!' });
        return;
      }

      const sender = msg.key.participant || msg.key.remoteJid;
      const senderIsAdmin = await isAdmin(from, sender);

      if (!senderIsAdmin) {
        await sock.sendMessage(from, { text: '🚫 Apenas administradores podem usar esse comando.' });
        return;
      }

      try {
        const groupMetadata = await sock.groupMetadata(from);
        const participants = groupMetadata.participants;
        const mentions = participants.map(p => p.id);

        const text = `🔔 Toca o berrante seu moço ${mentions.map(id => '@' + id.split('@')[0]).join(' ')}`;

        await sock.sendMessage(from, {
          text,
          mentions
        });
      } catch (error) {
        console.error('Erro ao tocar o berrante:', error);
        await sock.sendMessage(from, { text: '❌ Erro ao tentar tocar o berrante no grupo.' });
      }
    }

    if (messageText === '!ping') {
      await sock.sendMessage(from, { text: '🏓 Pong!' });
    }

    if (messageText === '!hora') {
      const hora = new Date().toLocaleTimeString('pt-BR');
      await sock.sendMessage(from, { text: `🕒 Agora são ${hora}` });
    }

    if (messageText === '!frases') {
      const frases = [
        "🚀 Acredite no impossível e dance com unicórnios! 🦄✨",
        "🌟 Sua coragem é mais brilhante que mil estrelas! ⭐️⭐️⭐️",
        "🍀 Alegria é o combustível da vida, abasteça sempre! ⛽️😄",
        "🎈 Sorria, mesmo que seu café esteja frio ☕️😂",
        "💡 Pensamentos voam alto, deixe-os aterrissar no sucesso! ✈️🏆",
        "🌀 O universo conspira a favor dos sonhadores malucos! 🤪🌌",
        "🌻 Seja como o girassol, que segue a luz mesmo no escuro 🌞🌙",
        "🔥 Fogueira não queima o sonho, só esquenta a alma! 🔥💭",
        "🌈 Cores da vida são feitas de risos e abraços! 🤗🎨",
        "🌊 Navegue nas ondas do impossível com sorriso no rosto! 😄🌊",
        "🍉 A vida é uma melancia: cheia de sabor e um pouco de bagunça! 😜🍉",
        "🦉 Sabedoria é a luz que guia até nos dias nublados 🌧️💡",
        "🌌 Viaje no espaço da sua mente e encontre estrelas cadentes 🌠✨",
        "🎵 A melodia do sucesso toca mais alto quando o coração dança 🎶❤️",
        "🌱 Plante ideias e colha realizações incríveis! 🌿🌟",
        "🐢 Até a tartaruga chega longe, com paciência e persistência! 🐢🏁",
        "🎉 Celebre cada passo, mesmo os pequenos são gigantes! 🦶🎊",
        "🦄 Sonhe alto, mesmo que o mundo diga que é estranho! 🛸🌟",
        "☕ O café da manhã dos campeões é feito de coragem e esperança! ☕💪",
        "🕰️ Tempo é o amigo que transforma esforços em vitórias! ⏳🏆"
      ];
      const frase = frases[Math.floor(Math.random() * frases.length)];
      await sock.sendMessage(from, { text: frase });
    }

    if (messageText === '!comandos') {
      const comandos = `
👑 Desenvolvido por Vinicius (ELGORDAOTV)

📜 *Comandos disponíveis:*
!berrante - Marca todo mundo e toca o berrante 🔔 (Só admins)
!ping - Testa se o bot está ativo 🏓
!hora - Mostra a hora atual 🕒
!frases - Envia uma frase motivacional ou sem sentido 💬
!comandos - Lista os comandos disponíveis 📋

⚙️ Mais códigos em breve...
      `.trim();

      await sock.sendMessage(from, { text: comandos });
    }
  });
}

startBot();
