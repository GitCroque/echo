// Echo v2 — Cosmic Signal Redesign
// Vanilla IIFE, closure state, talks to existing /api

(function () {
  'use strict';

  const APP_VERSION = '24';
  const LIMIT = 140;
  const LISTEN_MIN_MS = 1800;
  const TRANSMITTING_MS = 1400;
  const SENT_MS = 1200;
  const TOAST_MS = 2400;
  const STATS_TTL = 10000;
  const SEEN_MAX = 100;
  const STAR_DENSITY = 140;

  // ================= State =================
  const state = {
    screen: 'home',
    lang: 'en',
    soundOn: localStorage.getItem('echo_sound') !== 'false',
    seen: loadSeen(),
    currentMessageId: null,
    currentMessage: null,
    online: navigator.onLine,
    installPrompt: null,
    installDismissed: localStorage.getItem('echo_install_dismissed') === '1',
    personal: loadPersonal(),
    statsCache: { data: null, ts: 0 },
    timer: null, // rate limit interval
    listenStart: 0,
    reportedIds: loadReported()
  };

  function loadSeen() {
    try {
      const raw = sessionStorage.getItem('echo_state');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.seenMessageIds) ? parsed.seenMessageIds : [];
    } catch (_) { return []; }
  }

  function saveSeen() {
    if (state.seen.length > SEEN_MAX) state.seen = state.seen.slice(-SEEN_MAX);
    sessionStorage.setItem('echo_state', JSON.stringify({ seenMessageIds: state.seen }));
  }

  function loadPersonal() {
    try {
      const raw = localStorage.getItem('echo_personal_stats');
      if (!raw) return { sent: 0, received: 0 };
      return Object.assign({ sent: 0, received: 0 }, JSON.parse(raw));
    } catch (_) { return { sent: 0, received: 0 }; }
  }

  function savePersonal() {
    localStorage.setItem('echo_personal_stats', JSON.stringify(state.personal));
  }

  function loadReported() {
    try {
      const raw = localStorage.getItem('echo_reported_ids');
      return new Set(raw ? JSON.parse(raw) : []);
    } catch (_) { return new Set(); }
  }

  function saveReported() {
    localStorage.setItem('echo_reported_ids', JSON.stringify(Array.from(state.reportedIds)));
  }

  // ================= i18n =================
  const translations = {
    en: {
      'home.meta': 'Signal active',
      'home.tagline': 'Cast a signal into the cosmos. Discover messages from other wanderers. Anonymous. Timeless. Human.',
      'home.send': 'Send a signal',
      'home.listen': '— listen to the void —',
      'home.statsSuffix': 'signals released',
      'send.meta': 'Compose your signal',
      'send.placeholder': 'What do you want to transmit to the universe?',
      'send.rule': '140 char · no urls',
      'send.submit': 'Transmit',
      'send.transmitting': 'Transmitting',
      'send.releasing': 'Releasing your signal into the void…',
      'send.sent.meta': 'Signal received by the void',
      'send.sent.tagline': 'Your words are traveling. Someone, somewhere, will find them.',
      'send.toast': 'Signal released',
      'send.invalid': 'Invalid signal',
      'send.error': 'Connection error',
      'receive.ready.meta': 'Tune in',
      'receive.ready.heading': 'Listen',
      'receive.ready.tagline': 'Open yourself to a single signal from a stranger. It may arrive warm, strange, or beautiful.',
      'receive.ready.cta': 'Receive a signal',
      'receive.listening.meta': 'Scanning the void',
      'receive.listening.hint': 'One voice · drawing near',
      'receive.msg.meta': 'Signal captured',
      'receive.msg.transmission': 'Transmission {id}',
      'receive.msg.end': 'end of signal',
      'receive.msg.report': '· report',
      'receive.msg.reported': '· reported',
      'receive.msg.again': 'Receive another',
      'receive.msg.sendOne': '— send a signal —',
      'receive.empty.meta': 'No signal',
      'receive.empty.heading': 'Silence',
      'receive.empty.tagline': "You've heard every voice we could find. Send your own — maybe someone is waiting on the other side.",
      'receive.empty.retry': '— try again —',
      'receive.forbidden': 'Send a signal first to unlock the void.',
      'ratelimit.meta': 'Cooldown · too many signals',
      'ratelimit.heading': 'Pause',
      'ratelimit.tagline': 'The void asks for a breath. Your signals are loud — give the silence a little room before sending again.',
      'ratelimit.waiting': 'Waiting…',
      'ratelimit.resume': 'Resume',
      'ratelimit.backHome': '— back to home —',
      'stats.meta': 'The void · in numbers',
      'stats.heading': 'Echoes',
      'stats.total': 'Total signals',
      'stats.totalSub': 'across the void',
      'stats.you': 'You sent',
      'stats.received': 'received',
      'report.eyebrow': '· Report signal',
      'report.title': 'Report this transmission?',
      'report.body': "Three reports cause a signal to vanish from the void. Use this only for content that feels harmful or unsafe — not for messages you simply don't like.",
      'report.cancel': 'Keep listening',
      'report.confirm': 'Report',
      'report.already': 'Already reported',
      'offline.banner': 'Offline · the void is unreachable',
      'install.label': 'Install Echo · stay connected to the void',
      'install.action': 'Install',
      'footer.quote': '"Somewhere, someone is listening"',
      'back': '— back —',
      'time.daysAgo': '{n} days ago',
      'time.dayAgo': '1 day ago',
      'time.today': 'today'
    },
    fr: {
      'home.meta': 'Signal actif',
      'home.tagline': 'Lance un signal dans le cosmos. Découvre des messages d\'autres voyageurs. Anonyme. Intemporel. Humain.',
      'home.send': 'Envoyer un signal',
      'home.listen': '— écouter le vide —',
      'home.statsSuffix': 'signaux libérés',
      'send.meta': 'Compose ton signal',
      'send.placeholder': 'Que veux-tu transmettre à l\'univers ?',
      'send.rule': '140 car · pas d\'urls',
      'send.submit': 'Transmettre',
      'send.transmitting': 'Transmission',
      'send.releasing': 'Libération de ton signal dans le vide…',
      'send.sent.meta': 'Signal reçu par le vide',
      'send.sent.tagline': 'Tes mots voyagent. Quelqu\'un, quelque part, les trouvera.',
      'send.toast': 'Signal libéré',
      'send.invalid': 'Signal invalide',
      'send.error': 'Erreur de connexion',
      'receive.ready.meta': 'À l\'écoute',
      'receive.ready.heading': 'Écouter',
      'receive.ready.tagline': 'Ouvre-toi à un signal d\'un inconnu. Il peut arriver chaud, étrange ou beau.',
      'receive.ready.cta': 'Recevoir un signal',
      'receive.listening.meta': 'Balayage du vide',
      'receive.listening.hint': 'Une voix · approche',
      'receive.msg.meta': 'Signal capturé',
      'receive.msg.transmission': 'Transmission {id}',
      'receive.msg.end': 'fin du signal',
      'receive.msg.report': '· signaler',
      'receive.msg.reported': '· signalé',
      'receive.msg.again': 'Recevoir un autre',
      'receive.msg.sendOne': '— envoyer un signal —',
      'receive.empty.meta': 'Aucun signal',
      'receive.empty.heading': 'Silence',
      'receive.empty.tagline': 'Tu as entendu toutes les voix que nous avons trouvées. Envoie la tienne, peut-être que quelqu\'un attend.',
      'receive.empty.retry': '— réessayer —',
      'receive.forbidden': 'Envoie d\'abord un signal pour débloquer le vide.',
      'ratelimit.meta': 'Pause · trop de signaux',
      'ratelimit.heading': 'Pause',
      'ratelimit.tagline': 'Le vide demande une respiration. Tes signaux sont bruyants, laisse un peu de silence avant de recommencer.',
      'ratelimit.waiting': 'Attente…',
      'ratelimit.resume': 'Reprendre',
      'ratelimit.backHome': '— retour à l\'accueil —',
      'stats.meta': 'Le vide · en chiffres',
      'stats.heading': 'Échos',
      'stats.total': 'Signaux totaux',
      'stats.totalSub': 'à travers le vide',
      'stats.you': 'Tu as envoyé',
      'stats.received': 'reçus',
      'report.eyebrow': '· Signaler le signal',
      'report.title': 'Signaler cette transmission ?',
      'report.body': 'Trois signalements font disparaître un signal du vide. À utiliser uniquement pour du contenu nuisible ou dangereux, pas pour des messages qui te déplaisent.',
      'report.cancel': 'Continuer d\'écouter',
      'report.confirm': 'Signaler',
      'report.already': 'Déjà signalé',
      'offline.banner': 'Hors ligne · le vide est inaccessible',
      'install.label': 'Installer Echo · reste connecté au vide',
      'install.action': 'Installer',
      'footer.quote': '« Quelque part, quelqu\'un écoute »',
      'back': '— retour —',
      'time.daysAgo': 'il y a {n} jours',
      'time.dayAgo': 'il y a 1 jour',
      'time.today': 'aujourd\'hui'
    },
    es: {
      'home.meta': 'Señal activa',
      'home.tagline': 'Lanza una señal al cosmos. Descubre mensajes de otros viajeros. Anónimo. Atemporal. Humano.',
      'home.send': 'Enviar una señal',
      'home.listen': '— escuchar el vacío —',
      'home.statsSuffix': 'señales liberadas',
      'send.meta': 'Compón tu señal',
      'send.placeholder': '¿Qué quieres transmitir al universo?',
      'send.rule': '140 car · sin urls',
      'send.submit': 'Transmitir',
      'send.transmitting': 'Transmitiendo',
      'send.releasing': 'Liberando tu señal al vacío…',
      'send.sent.meta': 'Señal recibida por el vacío',
      'send.sent.tagline': 'Tus palabras viajan. Alguien, en algún lugar, las encontrará.',
      'send.toast': 'Señal liberada',
      'send.invalid': 'Señal inválida',
      'send.error': 'Error de conexión',
      'receive.ready.meta': 'Sintonizar',
      'receive.ready.heading': 'Escuchar',
      'receive.ready.tagline': 'Ábrete a una señal de un desconocido. Puede llegar cálida, extraña o hermosa.',
      'receive.ready.cta': 'Recibir una señal',
      'receive.listening.meta': 'Escaneando el vacío',
      'receive.listening.hint': 'Una voz · se acerca',
      'receive.msg.meta': 'Señal capturada',
      'receive.msg.transmission': 'Transmisión {id}',
      'receive.msg.end': 'fin de la señal',
      'receive.msg.report': '· reportar',
      'receive.msg.reported': '· reportado',
      'receive.msg.again': 'Recibir otra',
      'receive.msg.sendOne': '— enviar una señal —',
      'receive.empty.meta': 'Sin señal',
      'receive.empty.heading': 'Silencio',
      'receive.empty.tagline': 'Has escuchado todas las voces que pudimos encontrar. Envía la tuya, quizás alguien esté esperando.',
      'receive.empty.retry': '— intentar de nuevo —',
      'receive.forbidden': 'Envía primero una señal para desbloquear el vacío.',
      'ratelimit.meta': 'Pausa · demasiadas señales',
      'ratelimit.heading': 'Pausa',
      'ratelimit.tagline': 'El vacío pide un respiro. Tus señales son ruidosas, dale un poco de silencio antes de seguir.',
      'ratelimit.waiting': 'Esperando…',
      'ratelimit.resume': 'Reanudar',
      'ratelimit.backHome': '— volver al inicio —',
      'stats.meta': 'El vacío · en cifras',
      'stats.heading': 'Ecos',
      'stats.total': 'Señales totales',
      'stats.totalSub': 'en el vacío',
      'stats.you': 'Has enviado',
      'stats.received': 'recibidas',
      'report.eyebrow': '· Reportar señal',
      'report.title': '¿Reportar esta transmisión?',
      'report.body': 'Tres reportes hacen desaparecer una señal. Úsalo solo para contenido dañino, no para mensajes que no te gusten.',
      'report.cancel': 'Seguir escuchando',
      'report.confirm': 'Reportar',
      'report.already': 'Ya reportado',
      'offline.banner': 'Sin conexión · el vacío es inalcanzable',
      'install.label': 'Instala Echo · sigue conectado al vacío',
      'install.action': 'Instalar',
      'footer.quote': '«En algún lugar, alguien está escuchando»',
      'back': '— volver —',
      'time.daysAgo': 'hace {n} días',
      'time.dayAgo': 'hace 1 día',
      'time.today': 'hoy'
    },
    de: {
      'home.meta': 'Signal aktiv',
      'home.tagline': 'Sende ein Signal ins All. Entdecke Nachrichten anderer Wanderer. Anonym. Zeitlos. Menschlich.',
      'home.send': 'Signal senden',
      'home.listen': '— der Leere lauschen —',
      'home.statsSuffix': 'Signale freigelassen',
      'send.meta': 'Verfasse dein Signal',
      'send.placeholder': 'Was willst du dem Universum übermitteln?',
      'send.rule': '140 Zeichen · keine URLs',
      'send.submit': 'Senden',
      'send.transmitting': 'Übertragung',
      'send.releasing': 'Dein Signal wird in die Leere entlassen…',
      'send.sent.meta': 'Signal von der Leere empfangen',
      'send.sent.tagline': 'Deine Worte reisen. Irgendwo wird jemand sie finden.',
      'send.toast': 'Signal freigelassen',
      'send.invalid': 'Ungültiges Signal',
      'send.error': 'Verbindungsfehler',
      'receive.ready.meta': 'Einstimmen',
      'receive.ready.heading': 'Lauschen',
      'receive.ready.tagline': 'Öffne dich einem Signal eines Fremden. Es mag warm, seltsam oder schön sein.',
      'receive.ready.cta': 'Signal empfangen',
      'receive.listening.meta': 'Leere wird abgesucht',
      'receive.listening.hint': 'Eine Stimme · naht',
      'receive.msg.meta': 'Signal erfasst',
      'receive.msg.transmission': 'Übertragung {id}',
      'receive.msg.end': 'Ende des Signals',
      'receive.msg.report': '· melden',
      'receive.msg.reported': '· gemeldet',
      'receive.msg.again': 'Weiteres empfangen',
      'receive.msg.sendOne': '— ein Signal senden —',
      'receive.empty.meta': 'Kein Signal',
      'receive.empty.heading': 'Stille',
      'receive.empty.tagline': 'Du hast jede Stimme gehört, die wir finden konnten. Sende deine — vielleicht wartet jemand.',
      'receive.empty.retry': '— erneut versuchen —',
      'receive.forbidden': 'Sende zuerst ein Signal, um die Leere zu öffnen.',
      'ratelimit.meta': 'Pause · zu viele Signale',
      'ratelimit.heading': 'Pause',
      'ratelimit.tagline': 'Die Leere braucht einen Atemzug. Deine Signale sind laut — gönn der Stille Raum.',
      'ratelimit.waiting': 'Warte…',
      'ratelimit.resume': 'Weiter',
      'ratelimit.backHome': '— zurück zur Startseite —',
      'stats.meta': 'Die Leere · in Zahlen',
      'stats.heading': 'Echos',
      'stats.total': 'Signale gesamt',
      'stats.totalSub': 'in der Leere',
      'stats.you': 'Du gesendet',
      'stats.received': 'empfangen',
      'report.eyebrow': '· Signal melden',
      'report.title': 'Diese Übertragung melden?',
      'report.body': 'Drei Meldungen lassen ein Signal verschwinden. Nur für schädliche Inhalte nutzen, nicht für Nachrichten, die dir nicht gefallen.',
      'report.cancel': 'Weiter lauschen',
      'report.confirm': 'Melden',
      'report.already': 'Bereits gemeldet',
      'offline.banner': 'Offline · die Leere ist unerreichbar',
      'install.label': 'Echo installieren · bleib mit der Leere verbunden',
      'install.action': 'Installieren',
      'footer.quote': '„Irgendwo hört jemand zu"',
      'back': '— zurück —',
      'time.daysAgo': 'vor {n} Tagen',
      'time.dayAgo': 'vor 1 Tag',
      'time.today': 'heute'
    },
    it: {
      'home.meta': 'Segnale attivo',
      'home.tagline': 'Lancia un segnale nel cosmo. Scopri messaggi di altri viandanti. Anonimo. Senza tempo. Umano.',
      'home.send': 'Invia un segnale',
      'home.listen': '— ascolta il vuoto —',
      'home.statsSuffix': 'segnali rilasciati',
      'send.meta': 'Componi il tuo segnale',
      'send.placeholder': 'Cosa vuoi trasmettere all\'universo?',
      'send.rule': '140 car · no url',
      'send.submit': 'Trasmetti',
      'send.transmitting': 'Trasmissione',
      'send.releasing': 'Rilascio del tuo segnale nel vuoto…',
      'send.sent.meta': 'Segnale ricevuto dal vuoto',
      'send.sent.tagline': 'Le tue parole viaggiano. Qualcuno, da qualche parte, le troverà.',
      'send.toast': 'Segnale rilasciato',
      'send.invalid': 'Segnale non valido',
      'send.error': 'Errore di connessione',
      'receive.ready.meta': 'In ascolto',
      'receive.ready.heading': 'Ascolta',
      'receive.ready.tagline': 'Apriti a un segnale di uno sconosciuto. Può arrivare caldo, strano o bello.',
      'receive.ready.cta': 'Ricevi un segnale',
      'receive.listening.meta': 'Scansione del vuoto',
      'receive.listening.hint': 'Una voce · si avvicina',
      'receive.msg.meta': 'Segnale catturato',
      'receive.msg.transmission': 'Trasmissione {id}',
      'receive.msg.end': 'fine del segnale',
      'receive.msg.report': '· segnala',
      'receive.msg.reported': '· segnalato',
      'receive.msg.again': 'Ricevi un altro',
      'receive.msg.sendOne': '— invia un segnale —',
      'receive.empty.meta': 'Nessun segnale',
      'receive.empty.heading': 'Silenzio',
      'receive.empty.tagline': 'Hai ascoltato tutte le voci che abbiamo trovato. Invia la tua, forse qualcuno attende.',
      'receive.empty.retry': '— riprova —',
      'receive.forbidden': 'Invia prima un segnale per sbloccare il vuoto.',
      'ratelimit.meta': 'Pausa · troppi segnali',
      'ratelimit.heading': 'Pausa',
      'ratelimit.tagline': 'Il vuoto chiede un respiro. I tuoi segnali sono forti, lascia un po\' di silenzio.',
      'ratelimit.waiting': 'In attesa…',
      'ratelimit.resume': 'Riprendi',
      'ratelimit.backHome': '— torna alla home —',
      'stats.meta': 'Il vuoto · in numeri',
      'stats.heading': 'Echi',
      'stats.total': 'Segnali totali',
      'stats.totalSub': 'nel vuoto',
      'stats.you': 'Tu inviati',
      'stats.received': 'ricevuti',
      'report.eyebrow': '· Segnala',
      'report.title': 'Segnalare questa trasmissione?',
      'report.body': 'Tre segnalazioni fanno sparire un segnale. Usalo solo per contenuti dannosi, non per messaggi che non ti piacciono.',
      'report.cancel': 'Continua ad ascoltare',
      'report.confirm': 'Segnala',
      'report.already': 'Già segnalato',
      'offline.banner': 'Offline · il vuoto è irraggiungibile',
      'install.label': 'Installa Echo · resta connesso al vuoto',
      'install.action': 'Installa',
      'footer.quote': '«Da qualche parte, qualcuno sta ascoltando»',
      'back': '— indietro —',
      'time.daysAgo': '{n} giorni fa',
      'time.dayAgo': '1 giorno fa',
      'time.today': 'oggi'
    },
    pt: {
      'home.meta': 'Sinal ativo',
      'home.tagline': 'Lance um sinal ao cosmos. Descubra mensagens de outros viajantes. Anônimo. Atemporal. Humano.',
      'home.send': 'Enviar um sinal',
      'home.listen': '— ouvir o vazio —',
      'home.statsSuffix': 'sinais liberados',
      'send.meta': 'Componha seu sinal',
      'send.placeholder': 'O que você quer transmitir ao universo?',
      'send.rule': '140 car · sem urls',
      'send.submit': 'Transmitir',
      'send.transmitting': 'Transmitindo',
      'send.releasing': 'Liberando seu sinal ao vazio…',
      'send.sent.meta': 'Sinal recebido pelo vazio',
      'send.sent.tagline': 'Suas palavras viajam. Alguém, em algum lugar, as encontrará.',
      'send.toast': 'Sinal liberado',
      'send.invalid': 'Sinal inválido',
      'send.error': 'Erro de conexão',
      'receive.ready.meta': 'Sintonizar',
      'receive.ready.heading': 'Ouvir',
      'receive.ready.tagline': 'Abra-se a um sinal de um desconhecido. Pode chegar morno, estranho ou belo.',
      'receive.ready.cta': 'Receber um sinal',
      'receive.listening.meta': 'Varrendo o vazio',
      'receive.listening.hint': 'Uma voz · se aproxima',
      'receive.msg.meta': 'Sinal capturado',
      'receive.msg.transmission': 'Transmissão {id}',
      'receive.msg.end': 'fim do sinal',
      'receive.msg.report': '· denunciar',
      'receive.msg.reported': '· denunciado',
      'receive.msg.again': 'Receber outro',
      'receive.msg.sendOne': '— enviar um sinal —',
      'receive.empty.meta': 'Sem sinal',
      'receive.empty.heading': 'Silêncio',
      'receive.empty.tagline': 'Você ouviu todas as vozes que encontramos. Envie a sua, talvez alguém esteja esperando.',
      'receive.empty.retry': '— tentar de novo —',
      'receive.forbidden': 'Envie primeiro um sinal para desbloquear o vazio.',
      'ratelimit.meta': 'Pausa · sinais demais',
      'ratelimit.heading': 'Pausa',
      'ratelimit.tagline': 'O vazio pede um respiro. Seus sinais são altos, dê algum silêncio.',
      'ratelimit.waiting': 'Aguardando…',
      'ratelimit.resume': 'Retomar',
      'ratelimit.backHome': '— voltar ao início —',
      'stats.meta': 'O vazio · em números',
      'stats.heading': 'Ecos',
      'stats.total': 'Sinais totais',
      'stats.totalSub': 'pelo vazio',
      'stats.you': 'Você enviou',
      'stats.received': 'recebidos',
      'report.eyebrow': '· Denunciar sinal',
      'report.title': 'Denunciar esta transmissão?',
      'report.body': 'Três denúncias fazem um sinal sumir. Use apenas para conteúdo prejudicial, não para mensagens que você não gostou.',
      'report.cancel': 'Continuar ouvindo',
      'report.confirm': 'Denunciar',
      'report.already': 'Já denunciado',
      'offline.banner': 'Offline · o vazio está inalcançável',
      'install.label': 'Instalar Echo · fique conectado ao vazio',
      'install.action': 'Instalar',
      'footer.quote': '"Em algum lugar, alguém está ouvindo"',
      'back': '— voltar —',
      'time.daysAgo': 'há {n} dias',
      'time.dayAgo': 'há 1 dia',
      'time.today': 'hoje'
    },
    ja: {
      'home.meta': '信号送信中',
      'home.tagline': '宇宙に信号を送ろう。他の旅人からのメッセージを見つけよう。匿名。永遠。人間らしく。',
      'home.send': '信号を送る',
      'home.listen': '— 虚空に耳を澄ます —',
      'home.statsSuffix': '個の信号が漂流中',
      'send.meta': '信号を作成',
      'send.placeholder': '宇宙に何を伝えたい？',
      'send.rule': '140文字・URL不可',
      'send.submit': '送信',
      'send.transmitting': '送信中',
      'send.releasing': '信号を虚空へ解き放つ…',
      'send.sent.meta': '虚空が信号を受け取った',
      'send.sent.tagline': 'あなたの言葉は旅をする。どこかで誰かが見つけるだろう。',
      'send.toast': '信号を解き放った',
      'send.invalid': '無効な信号',
      'send.error': '接続エラー',
      'receive.ready.meta': '耳を傾ける',
      'receive.ready.heading': '聴く',
      'receive.ready.tagline': '見知らぬ誰かからの信号に心を開こう。温かく、奇妙で、美しいかもしれない。',
      'receive.ready.cta': '信号を受信',
      'receive.listening.meta': '虚空を走査中',
      'receive.listening.hint': '一つの声・近づく',
      'receive.msg.meta': '信号を捕捉',
      'receive.msg.transmission': '送信 {id}',
      'receive.msg.end': '信号終了',
      'receive.msg.report': '· 報告',
      'receive.msg.reported': '· 報告済',
      'receive.msg.again': '別の信号を受信',
      'receive.msg.sendOne': '— 信号を送る —',
      'receive.empty.meta': '信号なし',
      'receive.empty.heading': '静寂',
      'receive.empty.tagline': '見つけられたすべての声を聴いた。あなたの声を送ってみて。誰かが待っているかもしれない。',
      'receive.empty.retry': '— もう一度 —',
      'receive.forbidden': '先に信号を送って虚空を解き放とう。',
      'ratelimit.meta': 'クールダウン・信号が多すぎ',
      'ratelimit.heading': '小休止',
      'ratelimit.tagline': '虚空は一息求めている。信号は賑やかだ。少しの沈黙を。',
      'ratelimit.waiting': '待機中…',
      'ratelimit.resume': '再開',
      'ratelimit.backHome': '— ホームに戻る —',
      'stats.meta': '虚空・数字で',
      'stats.heading': 'エコー',
      'stats.total': '総信号数',
      'stats.totalSub': '虚空を越えて',
      'stats.you': '送信済',
      'stats.received': '受信',
      'report.eyebrow': '· 信号を報告',
      'report.title': 'この送信を報告しますか？',
      'report.body': '3つの報告で信号は消える。有害なものだけに使おう。',
      'report.cancel': '聴き続ける',
      'report.confirm': '報告',
      'report.already': '既に報告済',
      'offline.banner': 'オフライン・虚空に届かない',
      'install.label': 'Echoをインストール・虚空とつながり続ける',
      'install.action': 'インストール',
      'footer.quote': '「どこかで誰かが聴いている」',
      'back': '— 戻る —',
      'time.daysAgo': '{n}日前',
      'time.dayAgo': '1日前',
      'time.today': '今日'
    },
    zh: {
      'home.meta': '信号开启',
      'home.tagline': '向宇宙发送信号。发现其他旅人的信息。匿名。永恒。人性。',
      'home.send': '发送信号',
      'home.listen': '— 聆听虚空 —',
      'home.statsSuffix': '个信号漂流中',
      'send.meta': '编写信号',
      'send.placeholder': '你想向宇宙传达什么？',
      'send.rule': '140字·不可链接',
      'send.submit': '传输',
      'send.transmitting': '传输中',
      'send.releasing': '把信号释放到虚空…',
      'send.sent.meta': '虚空已收到信号',
      'send.sent.tagline': '你的话语在旅行。某处有人会找到它们。',
      'send.toast': '信号已释放',
      'send.invalid': '无效信号',
      'send.error': '连接错误',
      'receive.ready.meta': '调谐',
      'receive.ready.heading': '聆听',
      'receive.ready.tagline': '敞开心迎接陌生人的信号。它可能温暖、奇异或美丽。',
      'receive.ready.cta': '接收信号',
      'receive.listening.meta': '扫描虚空',
      'receive.listening.hint': '一道声音·即将抵达',
      'receive.msg.meta': '已捕获信号',
      'receive.msg.transmission': '传输 {id}',
      'receive.msg.end': '信号结束',
      'receive.msg.report': '· 举报',
      'receive.msg.reported': '· 已举报',
      'receive.msg.again': '接收另一个',
      'receive.msg.sendOne': '— 发送信号 —',
      'receive.empty.meta': '无信号',
      'receive.empty.heading': '寂静',
      'receive.empty.tagline': '你已聆听我们找到的所有声音。发送你的，也许有人在等。',
      'receive.empty.retry': '— 重试 —',
      'receive.forbidden': '先发送一个信号以打开虚空。',
      'ratelimit.meta': '冷却·信号太多',
      'ratelimit.heading': '暂停',
      'ratelimit.tagline': '虚空想要喘息。你的信号太喧闹了，给寂静留点空间。',
      'ratelimit.waiting': '等待中…',
      'ratelimit.resume': '继续',
      'ratelimit.backHome': '— 返回首页 —',
      'stats.meta': '虚空·数据',
      'stats.heading': '回音',
      'stats.total': '信号总数',
      'stats.totalSub': '穿越虚空',
      'stats.you': '你发送',
      'stats.received': '已接收',
      'report.eyebrow': '· 举报信号',
      'report.title': '举报此传输？',
      'report.body': '三次举报信号将消失。仅用于有害或不安全的内容，而不是你单纯不喜欢的消息。',
      'report.cancel': '继续聆听',
      'report.confirm': '举报',
      'report.already': '已举报',
      'offline.banner': '离线·虚空不可达',
      'install.label': '安装 Echo · 保持与虚空的连接',
      'install.action': '安装',
      'footer.quote': '"某处，有人在聆听"',
      'back': '— 返回 —',
      'time.daysAgo': '{n} 天前',
      'time.dayAgo': '1 天前',
      'time.today': '今天'
    }
  };

  const LANG_LIST = [
    ['en', 'EN', 'English'],
    ['fr', 'FR', 'Français'],
    ['es', 'ES', 'Español'],
    ['de', 'DE', 'Deutsch'],
    ['it', 'IT', 'Italiano'],
    ['pt', 'PT', 'Português'],
    ['ja', 'JA', '日本語'],
    ['zh', 'ZH', '中文']
  ];

  function t(key, params) {
    const dict = translations[state.lang] || translations.en;
    let value = dict[key];
    if (value == null) value = translations.en[key];
    if (value == null) return key;
    if (params) {
      for (const k in params) {
        value = value.replace('{' + k + '}', params[k]);
      }
    }
    return value;
  }

  function applyI18n() {
    document.documentElement.lang = state.lang;

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });

    // Dynamic updates
    refreshStats();
    updatePersonalStatsView();
    if (els.transmitMeta && state.screen === 'transmit') {
      // keep state-aware text (transmitting vs sent) fresh on lang change
      els.transmitMeta.textContent = els.transmitMeta.dataset.mode === 'sent'
        ? t('send.sent.meta')
        : t('send.transmitting');
      els.transmitTagline.textContent = els.transmitMeta.dataset.mode === 'sent'
        ? t('send.sent.tagline')
        : t('send.releasing');
    }
    updateLangTrigger();
  }

  // ================= DOM cache =================
  const els = {};

  function cacheEls() {
    els.root = document.body;
    els.screens = {};
    document.querySelectorAll('[data-screen]').forEach(function (sec) {
      els.screens[sec.dataset.screen] = sec;
    });
    els.toast = document.getElementById('toast');
    els.langToggle = document.getElementById('lang-toggle');
    els.langCurrent = document.getElementById('lang-current');
    els.langMenu = document.getElementById('lang-menu');
    els.soundToggle = document.getElementById('sound-toggle');
    els.soundOn = document.getElementById('sound-icon-on');
    els.soundOff = document.getElementById('sound-icon-off');
    els.offlineBanner = document.getElementById('offline-banner');
    els.offlineText = document.getElementById('offline-text');
    els.installPill = document.getElementById('install-pill');
    els.installAction = document.getElementById('install-action');
    els.installDismiss = document.getElementById('install-dismiss');

    els.homeStatsCount = document.getElementById('home-stats-count');
    els.btnHomeSend = document.getElementById('btn-home-send');
    els.btnHomeListen = document.getElementById('btn-home-listen');
    els.btnHomeStats = document.getElementById('btn-home-stats');

    els.sendForm = document.getElementById('send-form');
    els.messageInput = document.getElementById('message-input');
    els.charBar = document.getElementById('char-bar');
    els.charCount = document.getElementById('char-count');
    els.btnSendSubmit = document.getElementById('btn-send-submit');

    els.transmitMeta = document.getElementById('transmit-meta');
    els.transmitTagline = document.getElementById('transmit-tagline');

    els.btnReceiveStart = document.getElementById('btn-receive-start');
    els.btnReceiveAgain = document.getElementById('btn-receive-again');
    els.btnEmptyRetry = document.getElementById('btn-empty-retry');

    els.letter = document.getElementById('letter');
    els.letterBody = document.getElementById('letter-body');
    els.letterTransmission = document.getElementById('letter-transmission');
    els.letterMeta = document.getElementById('letter-meta');
    els.btnReport = document.getElementById('btn-report');

    els.timerFill = document.getElementById('timer-fill');
    els.timerCount = document.getElementById('timer-count');
    els.btnRatelimitResume = document.getElementById('btn-ratelimit-resume');

    els.statTotal = document.getElementById('stat-total');
    els.statSent = document.getElementById('stat-sent');
    els.statReceived = document.getElementById('stat-received');

    els.reportModal = document.getElementById('report-modal');
    els.btnReportCancel = document.getElementById('btn-report-cancel');
    els.btnReportConfirm = document.getElementById('btn-report-confirm');

    els.stage = document.getElementById('stage');
    els.starfield = document.getElementById('starfield');
    els.appVersion = document.getElementById('app-version');
  }

  async function loadAppVersion() {
    if (!els.appVersion) return;
    try {
      const res = await fetch('/api/version');
      const data = await res.json();
      if (data && data.version) els.appVersion.textContent = 'v ' + data.version;
    } catch (_) { /* offline */ }
  }

  // ================= Screen router =================
  function showScreen(id) {
    state.screen = id;
    Object.keys(els.screens).forEach(function (key) {
      els.screens[key].classList.remove('active');
    });
    const target = els.screens[id];
    if (!target) return;
    // Re-trigger fadeUp animation
    target.style.animation = 'none';
    void target.offsetHeight;
    target.style.animation = '';
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ================= Starfield =================
  function buildStarfield(density) {
    const root = els.starfield;
    if (!root) return;
    root.innerHTML = '';
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = 0; i < density; i++) {
      const el = document.createElement('div');
      el.className = 'star';
      const r = Math.random();
      const size = r < 0.85 ? 1 : r < 0.94 ? 1.5 : 2.5;
      el.style.width = size + 'px';
      el.style.height = size + 'px';
      el.style.left = Math.random() * w + 'px';
      el.style.top = Math.random() * h + 'px';
      el.style.setProperty('--o', (0.3 + Math.random() * 0.6).toFixed(2));
      el.style.setProperty('--dur', (3 + Math.random() * 5).toFixed(1) + 's');
      el.style.setProperty('--delay', (Math.random() * 5).toFixed(1) + 's');
      if (Math.random() < 0.08) el.classList.add('warm');
      root.appendChild(el);
    }
  }

  function launchShootingStar() {
    const root = els.starfield;
    if (!root) return;
    const el = document.createElement('div');
    el.className = 'shoot';
    const startX = Math.random() * window.innerWidth * 0.6;
    const startY = Math.random() * window.innerHeight * 0.3;
    el.style.left = startX + 'px';
    el.style.top = startY + 'px';
    el.style.transition = 'transform 1.4s linear, opacity 1.4s linear';
    el.style.opacity = '1';
    root.appendChild(el);
    requestAnimationFrame(function () {
      el.style.transform = 'translate(' + (window.innerWidth * 0.5) + 'px, ' + (window.innerHeight * 0.3) + 'px)';
      el.style.opacity = '0';
    });
    setTimeout(function () { el.remove(); }, 1500);
  }

  // ================= Signal orb burst =================
  function fireOrbBurst(screenEl) {
    if (!screenEl) return;
    const wrap = screenEl.querySelector('[data-orb]');
    if (!wrap) return;
    const isCool = !!wrap.querySelector('.orb-core.cool');
    const b = document.createElement('div');
    b.className = 'pulse burst' + (isCool ? ' cool' : '');
    wrap.appendChild(b);
    setTimeout(function () { b.remove(); }, 1800);
  }

  // ================= Audio (Web Audio, lazy) =================
  let audioCtx = null;
  let audioInit = false;

  function initAudio() {
    if (audioInit) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      audioInit = true;
    } catch (_) { /* noop */ }
  }

  function playReceiveSound() {
    if (!state.soundOn || !audioInit || !audioCtx) return;
    try {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const now = audioCtx.currentTime;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(400, now + 1.2);
      filter.Q.value = 1;
      filter.connect(audioCtx.destination);

      const bass = audioCtx.createOscillator();
      const bassGain = audioCtx.createGain();
      bass.type = 'sine';
      bass.frequency.setValueAtTime(65, now);
      bass.frequency.exponentialRampToValueAtTime(55, now + 1.5);
      bassGain.gain.setValueAtTime(0, now);
      bassGain.gain.linearRampToValueAtTime(0.2, now + 0.1);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      bass.connect(bassGain); bassGain.connect(filter);
      bass.start(now); bass.stop(now + 1.5);

      const main = audioCtx.createOscillator();
      const mainGain = audioCtx.createGain();
      main.type = 'triangle';
      main.frequency.setValueAtTime(220, now);
      main.frequency.exponentialRampToValueAtTime(165, now + 0.8);
      mainGain.gain.setValueAtTime(0, now);
      mainGain.gain.linearRampToValueAtTime(0.15, now + 0.05);
      mainGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
      main.connect(mainGain); mainGain.connect(filter);
      main.start(now); main.stop(now + 1.0);

      const harm = audioCtx.createOscillator();
      const harmGain = audioCtx.createGain();
      harm.type = 'sine';
      harm.frequency.setValueAtTime(330, now);
      harm.frequency.exponentialRampToValueAtTime(247, now + 0.6);
      harmGain.gain.setValueAtTime(0, now);
      harmGain.gain.linearRampToValueAtTime(0.08, now + 0.1);
      harmGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      harm.connect(harmGain); harmGain.connect(filter);
      harm.start(now); harm.stop(now + 0.8);
    } catch (_) { /* noop */ }
  }

  function playSendSound() {
    if (!state.soundOn || !audioInit || !audioCtx) return;
    try {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const now = audioCtx.currentTime;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(200, now);
      filter.frequency.exponentialRampToValueAtTime(800, now + 0.6);
      filter.Q.value = 0.5;
      filter.connect(audioCtx.destination);

      const main = audioCtx.createOscillator();
      const mainGain = audioCtx.createGain();
      main.type = 'sine';
      main.frequency.setValueAtTime(220, now);
      main.frequency.exponentialRampToValueAtTime(440, now + 0.4);
      main.frequency.exponentialRampToValueAtTime(880, now + 0.6);
      mainGain.gain.setValueAtTime(0.12, now);
      mainGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      main.connect(mainGain); mainGain.connect(filter);
      main.start(now); main.stop(now + 0.7);

      const sweep = audioCtx.createOscillator();
      const sweepGain = audioCtx.createGain();
      sweep.type = 'triangle';
      sweep.frequency.setValueAtTime(330, now);
      sweep.frequency.exponentialRampToValueAtTime(660, now + 0.5);
      sweepGain.gain.setValueAtTime(0.08, now);
      sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      sweep.connect(sweepGain); sweepGain.connect(filter);
      sweep.start(now); sweep.stop(now + 0.5);
    } catch (_) { /* noop */ }
  }

  function vibrate(pattern) {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  }

  // ================= Toast =================
  let toastTimer = null;
  function showToast(msg) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.classList.remove('show'); }, TOAST_MS);
  }

  // ================= Stats =================
  async function refreshStats() {
    const now = Date.now();
    if (state.statsCache.data && now - state.statsCache.ts < STATS_TTL) {
      renderStats(state.statsCache.data);
      return;
    }
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      state.statsCache = { data: data, ts: now };
      renderStats(data);
    } catch (_) { /* offline */ }
  }

  function renderStats(data) {
    const total = (data && typeof data.total === 'number') ? data.total : 0;
    if (els.homeStatsCount) els.homeStatsCount.textContent = total.toLocaleString();
    if (els.statTotal) els.statTotal.textContent = total.toLocaleString();
  }

  function updatePersonalStatsView() {
    if (els.statSent) els.statSent.textContent = state.personal.sent.toString();
    if (els.statReceived) els.statReceived.textContent = state.personal.received.toString();
  }

  // ================= Time helpers =================
  function daysAgoText(createdAt) {
    if (!createdAt) return '';
    const d = new Date(createdAt);
    const diffMs = Date.now() - d.getTime();
    const days = Math.floor(diffMs / (24 * 3600 * 1000));
    if (days <= 0) return t('time.today');
    if (days === 1) return t('time.dayAgo');
    return t('time.daysAgo', { n: days });
  }

  // ================= Typewriter =================
  let typingTimer = null;

  function runTypewriter(element, text, onDone) {
    if (!element) return;
    element.textContent = '';
    const cursor = document.createElement('span');
    cursor.className = 'cursor';

    const prefix = document.createTextNode('"');
    const suffix = document.createTextNode('"');
    const body = document.createTextNode('');
    element.appendChild(prefix);
    element.appendChild(body);
    element.appendChild(cursor);

    let i = 0;
    clearInterval(typingTimer);
    typingTimer = setInterval(function () {
      i++;
      body.data = text.slice(0, i);
      if (i >= text.length) {
        clearInterval(typingTimer);
        element.removeChild(cursor);
        element.appendChild(suffix);
        if (onDone) onDone();
      }
    }, 28);
  }

  // ================= Screen-specific transitions =================
  function enterTransmitting() {
    showScreen('transmit');
    if (els.transmitMeta) {
      els.transmitMeta.dataset.mode = 'transmitting';
      els.transmitMeta.textContent = t('send.transmitting');
    }
    if (els.transmitTagline) els.transmitTagline.textContent = t('send.releasing');
    fireOrbBurst(els.screens.transmit);
    launchShootingStar();
  }

  function enterSent(toastOnHome) {
    if (els.transmitMeta) {
      els.transmitMeta.dataset.mode = 'sent';
      els.transmitMeta.textContent = t('send.sent.meta');
    }
    if (els.transmitTagline) els.transmitTagline.textContent = t('send.sent.tagline');
    setTimeout(function () {
      showScreen('home');
      if (toastOnHome) showToast(t('send.toast'));
    }, SENT_MS);
  }

  // ================= Send flow =================
  function updateCharCounter() {
    const value = els.messageInput ? els.messageInput.value : '';
    const count = value.length;
    const pct = Math.min(100, (count / LIMIT) * 100);
    if (els.charCount) els.charCount.textContent = count.toString();
    if (els.charBar) {
      const span = els.charBar.firstElementChild;
      if (span) span.style.setProperty('--pct', pct + '%');
      els.charBar.classList.toggle('warn', count > LIMIT * 0.9);
    }
    if (els.btnSendSubmit) els.btnSendSubmit.disabled = !value.trim();
  }

  async function submitSignal(e) {
    if (e) e.preventDefault();
    const content = els.messageInput ? els.messageInput.value.trim() : '';
    if (!content || !state.online) return;

    initAudio();
    enterTransmitting();
    playSendSound();
    vibrate([40, 20, 40]);

    try {
      const res = await fetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content })
      });

      if (res.ok) {
        state.personal.sent++;
        savePersonal();
        updatePersonalStatsView();
        state.statsCache.ts = 0; // invalidate
        // Clear form
        if (els.messageInput) els.messageInput.value = '';
        updateCharCounter();
        // Wait the minimum animation, then show "sent" → home
        setTimeout(function () { enterSent(true); }, TRANSMITTING_MS);
        refreshStats();
      } else if (res.status === 429) {
        const retry = parseInt(res.headers.get('Retry-After') || '120', 10);
        openRateLimit(Number.isFinite(retry) && retry > 0 ? retry : 120);
      } else {
        let msg = t('send.invalid');
        try {
          const data = await res.json();
          if (data && data.error) msg = data.error;
        } catch (_) { /* noop */ }
        showScreen('send');
        showToast(msg);
      }
    } catch (_) {
      showScreen('send');
      showToast(t('send.error'));
    }
  }

  // ================= Receive flow =================
  let listeningMinTimer = null;

  async function startReceive() {
    if (!state.online) { showToast(t('offline.banner')); return; }
    showScreen('receive-listening');
    state.listenStart = Date.now();
    try {
      const res = await fetch('/api/message/random', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exclude: state.seen })
      });

      const elapsed = Date.now() - state.listenStart;
      const wait = Math.max(0, LISTEN_MIN_MS - elapsed);

      if (res.ok) {
        const data = await res.json();
        setTimeout(function () { showMessage(data); }, wait);
      } else if (res.status === 404) {
        setTimeout(function () { showScreen('receive-empty'); }, wait);
      } else if (res.status === 403) {
        setTimeout(function () {
          showScreen('send');
          showToast(t('receive.forbidden'));
        }, wait);
      } else if (res.status === 429) {
        const retry = parseInt(res.headers.get('Retry-After') || '60', 10);
        setTimeout(function () {
          showScreen('receive-ready');
          showToast(t('ratelimit.meta'));
        }, wait);
        // Best-effort; read-path rate limit surface is minimal
      } else {
        setTimeout(function () {
          showScreen('receive-empty');
        }, wait);
      }
    } catch (_) {
      setTimeout(function () {
        showScreen('receive-ready');
        showToast(t('send.error'));
      }, 400);
    }
  }

  function showMessage(data) {
    state.currentMessage = data;
    state.currentMessageId = data.id;
    state.seen.push(data.id);
    saveSeen();
    state.personal.received++;
    savePersonal();
    updatePersonalStatsView();

    const transmissionId = String((data.id * 37 + 1000) % 9000 + 1000);
    if (els.letterTransmission) {
      els.letterTransmission.textContent = t('receive.msg.transmission', { id: transmissionId });
    }
    if (els.letterMeta) {
      const country = data.country || '··';
      els.letterMeta.textContent = country + ' · ' + daysAgoText(data.created_at);
    }
    if (els.btnReport) {
      const alreadyReported = state.reportedIds.has(data.id);
      els.btnReport.disabled = alreadyReported;
      els.btnReport.classList.toggle('reported', alreadyReported);
      els.btnReport.textContent = alreadyReported ? t('receive.msg.reported') : t('receive.msg.report');
    }

    // Re-trigger letter reveal animation
    if (els.letter) {
      els.letter.style.animation = 'none';
      void els.letter.offsetHeight;
      els.letter.style.animation = '';
    }

    showScreen('receive-message');
    playReceiveSound();
    vibrate([40, 30, 40]);
    runTypewriter(els.letterBody, data.content || '');
  }

  // ================= Report =================
  function openReportModal() {
    if (!state.currentMessageId) return;
    if (state.reportedIds.has(state.currentMessageId)) {
      showToast(t('report.already'));
      return;
    }
    els.reportModal.classList.add('open');
  }

  function closeReportModal() {
    els.reportModal.classList.remove('open');
  }

  async function confirmReport() {
    const id = state.currentMessageId;
    if (!id) { closeReportModal(); return; }
    closeReportModal();
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: id })
      });
      if (res.ok || res.status === 409) {
        state.reportedIds.add(id);
        saveReported();
        if (els.btnReport) {
          els.btnReport.disabled = true;
          els.btnReport.classList.add('reported');
          els.btnReport.textContent = t('receive.msg.reported');
        }
      } else {
        let msg = t('send.error');
        try { const data = await res.json(); if (data && data.error) msg = data.error; } catch (_) { /* noop */ }
        showToast(msg);
      }
    } catch (_) {
      showToast(t('send.error'));
    }
  }

  // ================= Rate limit =================
  function openRateLimit(seconds) {
    clearInterval(state.timer);
    showScreen('ratelimit');
    const total = Math.max(1, seconds);
    let left = total;
    const C = 2 * Math.PI * 38;
    if (els.timerFill) {
      els.timerFill.setAttribute('stroke-dasharray', C.toString());
      els.timerFill.setAttribute('stroke-dashoffset', '0');
    }
    renderTimer(left, total, C);
    state.timer = setInterval(function () {
      left--;
      if (left <= 0) {
        clearInterval(state.timer);
        left = 0;
        if (els.btnRatelimitResume) {
          els.btnRatelimitResume.disabled = false;
          els.btnRatelimitResume.textContent = t('ratelimit.resume');
        }
      }
      renderTimer(left, total, C);
    }, 1000);
  }

  function renderTimer(left, total, C) {
    const pct = left / total;
    if (els.timerFill) els.timerFill.setAttribute('stroke-dashoffset', (C * (1 - pct)).toString());
    if (els.timerCount) {
      const mm = String(Math.floor(left / 60)).padStart(2, '0');
      const ss = String(left % 60).padStart(2, '0');
      els.timerCount.textContent = mm + ':' + ss;
    }
  }

  // ================= Sound toggle =================
  function updateSoundIcon() {
    if (!els.soundOn || !els.soundOff) return;
    els.soundOn.style.display = state.soundOn ? 'block' : 'none';
    els.soundOff.style.display = state.soundOn ? 'none' : 'block';
  }

  function toggleSound() {
    initAudio();
    state.soundOn = !state.soundOn;
    localStorage.setItem('echo_sound', String(state.soundOn));
    updateSoundIcon();
    if (state.soundOn) playReceiveSound();
  }

  // ================= Language dropdown =================
  function buildLangMenu() {
    if (!els.langMenu) return;
    els.langMenu.innerHTML = '';
    LANG_LIST.forEach(function (entry) {
      const code = entry[0];
      const name = entry[2];
      const btn = document.createElement('button');
      btn.className = 'menu-item' + (code === state.lang ? ' active' : '');
      btn.type = 'button';
      btn.setAttribute('role', 'option');
      btn.dataset.lang = code;
      const label = document.createElement('span');
      label.textContent = name;
      const dot = document.createElement('span');
      dot.className = 'dot';
      btn.appendChild(label);
      btn.appendChild(dot);
      btn.addEventListener('click', function () {
        setLanguage(code);
        closeLangMenu();
      });
      els.langMenu.appendChild(btn);
    });
  }

  function openLangMenu() {
    els.langMenu.classList.add('open');
    els.langToggle.setAttribute('aria-expanded', 'true');
  }

  function closeLangMenu() {
    els.langMenu.classList.remove('open');
    els.langToggle.setAttribute('aria-expanded', 'false');
  }

  function updateLangTrigger() {
    const entry = LANG_LIST.find(function (l) { return l[0] === state.lang; }) || LANG_LIST[0];
    if (els.langCurrent) els.langCurrent.textContent = entry[1];
    if (els.langMenu) {
      els.langMenu.querySelectorAll('.menu-item').forEach(function (item) {
        item.classList.toggle('active', item.dataset.lang === state.lang);
      });
    }
  }

  function detectLang() {
    const saved = localStorage.getItem('echo_lang');
    if (saved && translations[saved]) return saved;
    const browser = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return translations[browser] ? browser : 'en';
  }

  function setLanguage(lang) {
    if (!translations[lang]) return;
    state.lang = lang;
    localStorage.setItem('echo_lang', lang);
    applyI18n();
  }

  // ================= Offline / PWA install =================
  function handleOnline() { state.online = true; els.offlineBanner.classList.remove('show'); }
  function handleOffline() { state.online = false; els.offlineBanner.classList.add('show'); }

  function maybeShowInstallPill() {
    if (state.installDismissed || !state.installPrompt) return;
    if (state.screen !== 'home') return;
    els.installPill.classList.add('show');
  }

  function dismissInstall(persist) {
    els.installPill.classList.remove('show');
    if (persist) {
      state.installDismissed = true;
      localStorage.setItem('echo_install_dismissed', '1');
    }
  }

  async function triggerInstall() {
    const ev = state.installPrompt;
    dismissInstall(false);
    if (!ev) return;
    try {
      ev.prompt();
      await ev.userChoice;
    } catch (_) { /* noop */ }
    state.installPrompt = null;
  }

  // ================= Events =================
  function bindEvents() {
    // Navigation via data-nav
    document.querySelectorAll('[data-nav]').forEach(function (el) {
      el.addEventListener('click', function () {
        const target = el.getAttribute('data-nav');
        if (target === 'send') { resetSendForm(); }
        showScreen(target === 'receive' ? 'receive-ready' : target);
      });
    });

    // Home
    els.btnHomeSend.addEventListener('click', function () {
      resetSendForm();
      showScreen('send');
      setTimeout(function () { if (els.messageInput) els.messageInput.focus(); }, 150);
    });
    els.btnHomeListen.addEventListener('click', function () { showScreen('receive-ready'); });
    els.btnHomeStats.addEventListener('click', function () { showScreen('stats'); });

    // Send form
    els.sendForm.addEventListener('submit', submitSignal);
    els.btnSendSubmit.addEventListener('click', submitSignal);
    els.messageInput.addEventListener('input', updateCharCounter);
    els.messageInput.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submitSignal(e);
    });

    // Receive
    els.btnReceiveStart.addEventListener('click', startReceive);
    els.btnReceiveAgain.addEventListener('click', startReceive);
    els.btnEmptyRetry.addEventListener('click', startReceive);

    // Report
    els.btnReport.addEventListener('click', openReportModal);
    els.btnReportCancel.addEventListener('click', closeReportModal);
    els.btnReportConfirm.addEventListener('click', confirmReport);
    els.reportModal.addEventListener('click', function (e) {
      if (e.target === els.reportModal) closeReportModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && els.reportModal.classList.contains('open')) closeReportModal();
    });

    // Ratelimit
    els.btnRatelimitResume.addEventListener('click', function () {
      if (els.btnRatelimitResume.disabled) return;
      showScreen('home');
    });

    // Language
    els.langToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      if (els.langMenu.classList.contains('open')) closeLangMenu();
      else openLangMenu();
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#lang-dropdown')) closeLangMenu();
    });

    // Sound
    els.soundToggle.addEventListener('click', toggleSound);

    // Init audio on first interaction
    document.addEventListener('click', function onceInit() {
      initAudio();
      document.removeEventListener('click', onceInit);
    }, { once: true });

    // Install prompt
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      state.installPrompt = e;
      setTimeout(maybeShowInstallPill, 6000);
    });
    els.installAction.addEventListener('click', triggerInstall);
    els.installDismiss.addEventListener('click', function () { dismissInstall(true); });

    // Online/offline
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Resize
    let resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { buildStarfield(STAR_DENSITY); }, 200);
    });

    // Periodic shooting star
    setInterval(function () {
      if (document.hidden) return;
      if (Math.random() < 0.5) launchShootingStar();
    }, 8000);
  }

  function resetSendForm() {
    if (els.messageInput) els.messageInput.value = '';
    updateCharCounter();
  }

  // ================= Service worker =================
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(function () { /* noop */ });
  }

  // ================= Init =================
  function init() {
    cacheEls();
    state.lang = detectLang();

    buildLangMenu();
    updateLangTrigger();
    applyI18n();
    updateSoundIcon();
    buildStarfield(STAR_DENSITY);
    bindEvents();
    refreshStats();
    loadAppVersion();
    updatePersonalStatsView();
    registerServiceWorker();

    if (!state.online) handleOffline();

    showScreen('home');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
