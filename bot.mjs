import * as baileys from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';

const frasesMotivacionais = [
  "A persistência é o caminho do êxito.",
  "Você é capaz de tudo que quiser.",
  "Não existe vitória sem luta.",
  "O sucesso começa com a decisão de tentar.",
  "Mesmo que pareça impossível, insista.",
  // Frases sem sentido motivacionais:
  "O pássaro que canta de cabeça para baixo nunca perde a chave do armário.",
  "Se a vida te der limões, peça pizza e ignore os limões.",
  "Nunca confie em um sapo que usa relógio.",
  "O universo conspira a favor de quem dança com guarda-chuva.",
  "Quando a lua está azul, o café sabe melhor."
];

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
        startBot(); // tenta reconectar
      }
    }

    if (connection === 'open') {
      console.log('✅ Conectado com sucesso!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    const messageText = msg.message.conversation || msg.message.extendedTextMessage?.text;

    // Lista de comandos para mostrar no !comandos
    const listaComandos = [
      '!berrante - Marca todos e toca o berrante (somente admins)',
      '!frases - Envia uma frase motivacional aleatória',
      '!ping - Responde com Pong!',
      '!hora - Mostra a hora atual',
      '!comandos - Lista os comandos disponíveis',
    ];

    if (!messageText) return;

    if (messageText === '!comandos') {
      const textoComandos = listaComandos.map(c => `!comando ${c}`).join('\n');
      await sock.sendMessage(from, { text: `Aqui estão os comandos disponíveis:\n\n${textoComandos}` });
      return;
    }

    if (messageText === '!berrante') {
      if (!isGroup) {
        await sock.sendMessage(from, { text: 'Esse comando só funciona em grupos!' });
        return;
      }

      try {
        const groupMetadata = await sock.groupMetadata(from);
        const participants = groupMetadata.participants;

        const senderParticipant = participants.find(p => p.id === msg.key.participant);

        if (!senderParticipant || !senderParticipant.admin) {
          await sock.sendMessage(from, { text: '❌ Somente administradores podem usar esse comando.' });
          return;
        }

        const mentions = participants.map(p => p.id);
        const text = `toca o berrante seu moço ${mentions.map(id => '@' + id.split('@')[0]).join(' ')}`;

        await sock.sendMessage(from, {
          text,
          mentions
        });
      } catch (error) {
        console.error('Erro ao tocar o berrante:', error);
        await sock.sendMessage(from, { text: 'Erro ao tentar tocar o berrante no grupo.' });
      }
      return;
    }

    if (messageText === '!frases') {
      const fraseAleatoria = frasesMotivacionais[Math.floor(Math.random() * frasesMotivacionais.length)];
      await sock.sendMessage(from, { text: fraseAleatoria });
      return;
    }

    if (messageText === '!ping') {
      await sock.sendMessage(from, { text: '🏓 Pong!' });
      return;
    }

    if (messageText === '!hora') {
      const hora = new Date().toLocaleTimeString('pt-BR');
      await sock.sendMessage(from, { text: `🕒 Agora são ${hora}` });
      return;
    }
  });
}

startBot();
