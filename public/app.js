// Echo - Anonymous messages through the void
// Application JavaScript

(function() {
  'use strict';

  // App version - keep in sync with sw.js
  const APP_VERSION = '21';

  // State
  let seenMessageIds = [];
  let hasSent = false;
  let currentMessageId = null;
  let soundEnabled = true;
  let audioContext = null;
  let audioInitialized = false;

  // Stats cache (10 second TTL)
  let statsCache = { data: null, timestamp: 0 };
  const STATS_CACHE_TTL = 10000;

  // DOM Elements (cached after DOMContentLoaded)
  let elements = {};

  // Initialize audio on first user interaction
  function initAudio() {
    if (audioInitialized) return true;

    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      audioInitialized = true;
      return true;
    } catch (e) {
      console.log('Audio not available:', e);
      return false;
    }
  }

  // Play receive sound - warm cosmic transmission
  function playReceiveSound() {
    if (!soundEnabled || !audioInitialized || !audioContext) return;

    try {
      // Resume context if suspended
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const now = audioContext.currentTime;

      // Create a low-pass filter for warmth
      const filter = audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(400, now + 1.2);
      filter.Q.value = 1;
      filter.connect(audioContext.destination);

      // Deep bass foundation - warm rumble
      const bassDrone = audioContext.createOscillator();
      const bassGain = audioContext.createGain();
      bassDrone.type = 'sine';
      bassDrone.frequency.setValueAtTime(65, now); // Low C
      bassDrone.frequency.exponentialRampToValueAtTime(55, now + 1.5);
      bassGain.gain.setValueAtTime(0, now);
      bassGain.gain.linearRampToValueAtTime(0.2, now + 0.1);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      bassDrone.connect(bassGain);
      bassGain.connect(filter);
      bassDrone.start(now);
      bassDrone.stop(now + 1.5);

      // Main tone - warm mid frequency
      const mainTone = audioContext.createOscillator();
      const mainGain = audioContext.createGain();
      mainTone.type = 'triangle'; // Softer than sine
      mainTone.frequency.setValueAtTime(220, now); // A3 - warm
      mainTone.frequency.exponentialRampToValueAtTime(165, now + 0.8); // E3
      mainGain.gain.setValueAtTime(0, now);
      mainGain.gain.linearRampToValueAtTime(0.15, now + 0.05);
      mainGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
      mainTone.connect(mainGain);
      mainGain.connect(filter);
      mainTone.start(now);
      mainTone.stop(now + 1.0);

      // Soft harmonic - fifth above
      const harmonic = audioContext.createOscillator();
      const harmGain = audioContext.createGain();
      harmonic.type = 'sine';
      harmonic.frequency.setValueAtTime(330, now); // E4
      harmonic.frequency.exponentialRampToValueAtTime(247, now + 0.6); // B3
      harmGain.gain.setValueAtTime(0, now);
      harmGain.gain.linearRampToValueAtTime(0.08, now + 0.1);
      harmGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      harmonic.connect(harmGain);
      harmGain.connect(filter);
      harmonic.start(now);
      harmonic.stop(now + 0.8);

      // Subtle shimmer - delayed sparkle
      setTimeout(function() {
        if (!audioContext || audioContext.state !== 'running') return;
        const shimmer = audioContext.createOscillator();
        const shimGain = audioContext.createGain();
        const shimFilter = audioContext.createBiquadFilter();
        shimFilter.type = 'bandpass';
        shimFilter.frequency.value = 600;
        shimFilter.Q.value = 2;
        shimmer.type = 'sine';
        shimmer.frequency.setValueAtTime(440, audioContext.currentTime);
        shimmer.frequency.exponentialRampToValueAtTime(330, audioContext.currentTime + 0.5);
        shimGain.gain.setValueAtTime(0.05, audioContext.currentTime);
        shimGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.6);
        shimmer.connect(shimGain);
        shimGain.connect(shimFilter);
        shimFilter.connect(audioContext.destination);
        shimmer.start(audioContext.currentTime);
        shimmer.stop(audioContext.currentTime + 0.6);
      }, 200);

    } catch (e) {
      console.log('Error playing sound:', e);
    }
  }

  // Play send sound - ascending transmission
  function playSendSound() {
    if (!soundEnabled || !audioInitialized || !audioContext) return;

    try {
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const now = audioContext.currentTime;

      // High-pass filter for "lifting off" feeling
      const filter = audioContext.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(200, now);
      filter.frequency.exponentialRampToValueAtTime(800, now + 0.6);
      filter.Q.value = 0.5;
      filter.connect(audioContext.destination);

      // Ascending main tone
      const mainTone = audioContext.createOscillator();
      const mainGain = audioContext.createGain();
      mainTone.type = 'sine';
      mainTone.frequency.setValueAtTime(220, now);
      mainTone.frequency.exponentialRampToValueAtTime(440, now + 0.4);
      mainTone.frequency.exponentialRampToValueAtTime(880, now + 0.6);
      mainGain.gain.setValueAtTime(0.12, now);
      mainGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      mainTone.connect(mainGain);
      mainGain.connect(filter);
      mainTone.start(now);
      mainTone.stop(now + 0.7);

      // Harmonic sweep
      const sweep = audioContext.createOscillator();
      const sweepGain = audioContext.createGain();
      sweep.type = 'triangle';
      sweep.frequency.setValueAtTime(330, now);
      sweep.frequency.exponentialRampToValueAtTime(660, now + 0.5);
      sweepGain.gain.setValueAtTime(0.08, now);
      sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      sweep.connect(sweepGain);
      sweepGain.connect(filter);
      sweep.start(now);
      sweep.stop(now + 0.5);

      // Confirmation "ding" at the end
      setTimeout(function() {
        if (!audioContext || audioContext.state !== 'running') return;
        const ding = audioContext.createOscillator();
        const dingGain = audioContext.createGain();
        ding.type = 'sine';
        ding.frequency.setValueAtTime(523, audioContext.currentTime); // C5
        dingGain.gain.setValueAtTime(0.1, audioContext.currentTime);
        dingGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
        ding.connect(dingGain);
        dingGain.connect(audioContext.destination);
        ding.start(audioContext.currentTime);
        ding.stop(audioContext.currentTime + 0.3);
      }, 300);

    } catch (e) {
      console.log('Error playing sound:', e);
    }
  }

  // Vibrate on mobile (if supported)
  function vibrate(pattern) {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }

  // Typewriter effect for messages (optimized: uses textContent to avoid DOM thrashing)
  function typewriterEffect(element, text, callback) {
    element.textContent = '';
    element.style.opacity = '1';

    let i = 0;
    const speed = 30; // ms per character

    function type() {
      if (i < text.length) {
        // textContent is safe (no HTML parsing) and much faster than innerHTML
        element.textContent += text[i];
        i++;
        setTimeout(type, speed);
      } else if (callback) {
        callback();
      }
    }

    type();
  }

  // Personal stats management
  function getPersonalStats() {
    const stored = localStorage.getItem('echo_personal_stats');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return { sent: 0, received: 0 };
      }
    }
    return { sent: 0, received: 0 };
  }

  function updatePersonalStats(type) {
    const stats = getPersonalStats();
    if (type === 'sent') {
      stats.sent++;
    } else if (type === 'received') {
      stats.received++;
    }
    localStorage.setItem('echo_personal_stats', JSON.stringify(stats));
    displayPersonalStats();
  }

  function displayPersonalStats() {
    const stats = getPersonalStats();
    const el = document.getElementById('personal-stats');
    if (el) {
      const t = translations[currentLang];
      el.textContent = stats.sent + ' ' + t.statsSent + ' · ' + stats.received + ' ' + t.statsReceived;
    }
  }

  // Translations
  const translations = {
    en: {
      subtitle: 'Anonymous messages through the void',
      homeIntro: 'Cast a signal into the cosmos. Discover messages from other wanderers. Anonymous. Timeless. Human.',
      sendSignal: 'Send a Signal',
      receiveSignal: 'Receive a Signal',
      signalsAdrift: 'signals adrift',
      transmitTitle: 'Transmit to the void',
      placeholder: 'What do you want to transmit to the universe?',
      transmit: 'Transmit',
      back: '← Back',
      listenTitle: 'Listen to the void',
      receiveIntro: 'Discover a signal from a stranger.',
      receiveBtn: 'Receive a signal',
      signalFrom: 'Signal from a stranger',
      report: 'Report',
      receiveAnother: 'Receive another',
      sendAnother: 'Send a signal',
      footer: 'Somewhere, someone is listening',
      transmitted: 'Signal transmitted to the cosmos',
      from: 'From',
      castAdrift: 'Cast adrift on',
      statsSent: 'sent',
      statsReceived: 'received',
      noSignals: 'No signals detected yet. Be the first to transmit.',
      seenAll: 'You have seen all signals. Come back later for new transmissions.',
      yourSignalTransmitted: 'Your signal was transmitted. Now listen to the void.',
      reportSuccess: 'Report submitted. Thank you.',
      alreadyReported: 'Already reported',
      reported: 'Reported',
      someoneMessage: 'Someone, somewhere, sent this message into the void.'
    },
    fr: {
      subtitle: 'Messages anonymes à travers le vide',
      homeIntro: 'Lancez un signal dans le cosmos. Découvrez des messages d\'autres voyageurs. Anonyme. Intemporel. Humain.',
      sendSignal: 'Envoyer un Signal',
      receiveSignal: 'Recevoir un Signal',
      signalsAdrift: 'signaux à la dérive',
      transmitTitle: 'Transmettre au vide',
      placeholder: 'Que voulez-vous transmettre à l\'univers ?',
      transmit: 'Transmettre',
      back: '← Retour',
      listenTitle: 'Écouter le vide',
      receiveIntro: 'Découvrez un signal d\'un inconnu.',
      receiveBtn: 'Recevoir un signal',
      signalFrom: 'Signal d\'un inconnu',
      report: 'Signaler',
      receiveAnother: 'Recevoir un autre',
      sendAnother: 'Envoyer un signal',
      footer: 'Quelque part, quelqu\'un écoute',
      transmitted: 'Signal transmis dans le cosmos',
      from: 'De',
      castAdrift: 'Envoyé le',
      statsSent: 'envoyés',
      statsReceived: 'reçus',
      noSignals: 'Aucun signal détecté. Soyez le premier à transmettre.',
      seenAll: 'Vous avez vu tous les signaux. Revenez plus tard.',
      yourSignalTransmitted: 'Votre signal a été transmis. Maintenant, écoutez le vide.',
      reportSuccess: 'Signalement envoyé. Merci.',
      alreadyReported: 'Déjà signalé',
      reported: 'Signalé',
      someoneMessage: 'Quelqu\'un, quelque part, a envoyé ce message dans le vide.'
    },
    es: {
      subtitle: 'Mensajes anónimos a través del vacío',
      homeIntro: 'Lanza una señal al cosmos. Descubre mensajes de otros viajeros. Anónimo. Atemporal. Humano.',
      sendSignal: 'Enviar una Señal',
      receiveSignal: 'Recibir una Señal',
      signalsAdrift: 'señales a la deriva',
      transmitTitle: 'Transmitir al vacío',
      placeholder: '¿Qué quieres transmitir al universo?',
      transmit: 'Transmitir',
      back: '← Volver',
      listenTitle: 'Escuchar el vacío',
      receiveIntro: 'Descubre una señal de un desconocido.',
      receiveBtn: 'Recibir una señal',
      signalFrom: 'Señal de un desconocido',
      report: 'Reportar',
      receiveAnother: 'Recibir otra',
      sendAnother: 'Enviar una señal',
      footer: 'En algún lugar, alguien está escuchando',
      transmitted: 'Señal transmitida al cosmos',
      from: 'De',
      castAdrift: 'Enviado el',
      statsSent: 'enviados',
      statsReceived: 'recibidos',
      noSignals: 'No se detectaron señales. Sé el primero en transmitir.',
      seenAll: 'Has visto todas las señales. Vuelve más tarde.',
      yourSignalTransmitted: 'Tu señal fue transmitida. Ahora escucha el vacío.',
      reportSuccess: 'Reporte enviado. Gracias.',
      alreadyReported: 'Ya reportado',
      reported: 'Reportado',
      someoneMessage: 'Alguien, en algún lugar, envió este mensaje al vacío.'
    },
    de: {
      subtitle: 'Anonyme Nachrichten durch die Leere',
      homeIntro: 'Sende ein Signal ins All. Entdecke Nachrichten anderer Wanderer. Anonym. Zeitlos. Menschlich.',
      sendSignal: 'Signal senden',
      receiveSignal: 'Signal empfangen',
      signalsAdrift: 'Signale treiben umher',
      transmitTitle: 'Ins Nichts übertragen',
      placeholder: 'Was möchtest du dem Universum mitteilen?',
      transmit: 'Übertragen',
      back: '← Zurück',
      listenTitle: 'Der Leere lauschen',
      receiveIntro: 'Entdecke ein Signal von einem Fremden.',
      receiveBtn: 'Signal empfangen',
      signalFrom: 'Signal von einem Fremden',
      report: 'Melden',
      receiveAnother: 'Weiteres empfangen',
      sendAnother: 'Signal senden',
      footer: 'Irgendwo hört jemand zu',
      transmitted: 'Signal ins All übertragen',
      from: 'Von',
      castAdrift: 'Gesendet am',
      statsSent: 'gesendet',
      statsReceived: 'empfangen',
      noSignals: 'Keine Signale erkannt. Sei der Erste.',
      seenAll: 'Du hast alle Signale gesehen. Komm später wieder.',
      yourSignalTransmitted: 'Dein Signal wurde übertragen. Lausche nun der Leere.',
      reportSuccess: 'Meldung gesendet. Danke.',
      alreadyReported: 'Bereits gemeldet',
      reported: 'Gemeldet',
      someoneMessage: 'Jemand, irgendwo, hat diese Nachricht ins Nichts geschickt.'
    },
    it: {
      subtitle: 'Messaggi anonimi attraverso il vuoto',
      homeIntro: 'Lancia un segnale nel cosmo. Scopri messaggi di altri viaggiatori. Anonimo. Senza tempo. Umano.',
      sendSignal: 'Invia un Segnale',
      receiveSignal: 'Ricevi un Segnale',
      signalsAdrift: 'segnali alla deriva',
      transmitTitle: 'Trasmetti nel vuoto',
      placeholder: 'Cosa vuoi trasmettere all\'universo?',
      transmit: 'Trasmetti',
      back: '← Indietro',
      listenTitle: 'Ascolta il vuoto',
      receiveIntro: 'Scopri un segnale da uno sconosciuto.',
      receiveBtn: 'Ricevi un segnale',
      signalFrom: 'Segnale da uno sconosciuto',
      report: 'Segnala',
      receiveAnother: 'Ricevi un altro',
      sendAnother: 'Invia un segnale',
      footer: 'Da qualche parte, qualcuno sta ascoltando',
      transmitted: 'Segnale trasmesso nel cosmo',
      from: 'Da',
      castAdrift: 'Inviato il',
      statsSent: 'inviati',
      statsReceived: 'ricevuti',
      noSignals: 'Nessun segnale rilevato. Sii il primo a trasmettere.',
      seenAll: 'Hai visto tutti i segnali. Torna più tardi.',
      yourSignalTransmitted: 'Il tuo segnale è stato trasmesso. Ora ascolta il vuoto.',
      reportSuccess: 'Segnalazione inviata. Grazie.',
      alreadyReported: 'Già segnalato',
      reported: 'Segnalato',
      someoneMessage: 'Qualcuno, da qualche parte, ha inviato questo messaggio nel vuoto.'
    },
    pt: {
      subtitle: 'Mensagens anônimas através do vazio',
      homeIntro: 'Lance um sinal ao cosmos. Descubra mensagens de outros viajantes. Anônimo. Atemporal. Humano.',
      sendSignal: 'Enviar um Sinal',
      receiveSignal: 'Receber um Sinal',
      signalsAdrift: 'sinais à deriva',
      transmitTitle: 'Transmitir ao vazio',
      placeholder: 'O que você quer transmitir ao universo?',
      transmit: 'Transmitir',
      back: '← Voltar',
      listenTitle: 'Ouvir o vazio',
      receiveIntro: 'Descubra um sinal de um desconhecido.',
      receiveBtn: 'Receber um sinal',
      signalFrom: 'Sinal de um desconhecido',
      report: 'Denunciar',
      receiveAnother: 'Receber outro',
      sendAnother: 'Enviar um sinal',
      footer: 'Em algum lugar, alguém está ouvindo',
      transmitted: 'Sinal transmitido ao cosmos',
      from: 'De',
      castAdrift: 'Enviado em',
      statsSent: 'enviados',
      statsReceived: 'recebidos',
      noSignals: 'Nenhum sinal detectado. Seja o primeiro a transmitir.',
      seenAll: 'Você viu todos os sinais. Volte mais tarde.',
      yourSignalTransmitted: 'Seu sinal foi transmitido. Agora ouça o vazio.',
      reportSuccess: 'Denúncia enviada. Obrigado.',
      alreadyReported: 'Já denunciado',
      reported: 'Denunciado',
      someoneMessage: 'Alguém, em algum lugar, enviou esta mensagem ao vazio.'
    },
    nl: {
      subtitle: 'Anonieme berichten door de leegte',
      homeIntro: 'Zend een signaal de kosmos in. Ontdek berichten van andere reizigers. Anoniem. Tijdloos. Menselijk.',
      sendSignal: 'Signaal Verzenden',
      receiveSignal: 'Signaal Ontvangen',
      signalsAdrift: 'signalen rondzwevend',
      transmitTitle: 'Verzend naar de leegte',
      placeholder: 'Wat wil je naar het universum verzenden?',
      transmit: 'Verzenden',
      back: '← Terug',
      listenTitle: 'Luister naar de leegte',
      receiveIntro: 'Ontdek een signaal van een vreemde.',
      receiveBtn: 'Ontvang een signaal',
      signalFrom: 'Signaal van een vreemde',
      report: 'Melden',
      receiveAnother: 'Ontvang nog een',
      sendAnother: 'Verzend een signaal',
      footer: 'Ergens luistert iemand',
      transmitted: 'Signaal verzonden naar de kosmos',
      from: 'Van',
      castAdrift: 'Verzonden op',
      statsSent: 'verzonden',
      statsReceived: 'ontvangen',
      noSignals: 'Geen signalen gedetecteerd. Wees de eerste.',
      seenAll: 'Je hebt alle signalen gezien. Kom later terug.',
      yourSignalTransmitted: 'Je signaal is verzonden. Luister nu naar de leegte.',
      reportSuccess: 'Melding verzonden. Bedankt.',
      alreadyReported: 'Al gemeld',
      reported: 'Gemeld',
      someoneMessage: 'Iemand, ergens, stuurde dit bericht de leegte in.'
    },
    ru: {
      subtitle: 'Анонимные послания сквозь пустоту',
      homeIntro: 'Отправь сигнал в космос. Открой послания других странников. Анонимно. Вне времени. По-человечески.',
      sendSignal: 'Отправить сигнал',
      receiveSignal: 'Получить сигнал',
      signalsAdrift: 'сигналов дрейфует',
      transmitTitle: 'Передать в пустоту',
      placeholder: 'Что ты хочешь передать вселенной?',
      transmit: 'Передать',
      back: '← Назад',
      listenTitle: 'Слушать пустоту',
      receiveIntro: 'Открой сигнал от незнакомца.',
      receiveBtn: 'Получить сигнал',
      signalFrom: 'Сигнал от незнакомца',
      report: 'Пожаловаться',
      receiveAnother: 'Получить ещё',
      sendAnother: 'Отправить сигнал',
      footer: 'Где-то кто-то слушает',
      transmitted: 'Сигнал передан в космос',
      from: 'От',
      castAdrift: 'Отправлено',
      statsSent: 'отправлено',
      statsReceived: 'получено',
      noSignals: 'Сигналы не обнаружены. Будь первым.',
      seenAll: 'Ты видел все сигналы. Возвращайся позже.',
      yourSignalTransmitted: 'Твой сигнал передан. Теперь слушай пустоту.',
      reportSuccess: 'Жалоба отправлена. Спасибо.',
      alreadyReported: 'Уже отмечено',
      reported: 'Отмечено',
      someoneMessage: 'Кто-то, где-то, отправил это послание в пустоту.'
    },
    ja: {
      subtitle: '虚空を越える匿名のメッセージ',
      homeIntro: '宇宙に信号を送ろう。他の旅人からのメッセージを発見しよう。匿名。永遠。人間らしく。',
      sendSignal: '信号を送る',
      receiveSignal: '信号を受け取る',
      signalsAdrift: '個の信号が漂う',
      transmitTitle: '虚空へ送信',
      placeholder: '宇宙に何を伝えたいですか？',
      transmit: '送信',
      back: '← 戻る',
      listenTitle: '虚空に耳を傾ける',
      receiveIntro: '見知らぬ人からの信号を発見しよう。',
      receiveBtn: '信号を受信',
      signalFrom: '見知らぬ人からの信号',
      report: '報告',
      receiveAnother: '別の信号を受信',
      sendAnother: '信号を送る',
      footer: 'どこかで誰かが聴いている',
      transmitted: '信号は宇宙へ送信されました',
      from: '送信者',
      castAdrift: '送信日',
      statsSent: '送信',
      statsReceived: '受信',
      noSignals: '信号が検出されません。最初の送信者になろう。',
      seenAll: 'すべての信号を見ました。後でまた来てください。',
      yourSignalTransmitted: '信号が送信されました。虚空に耳を傾けて。',
      reportSuccess: '報告が送信されました。ありがとう。',
      alreadyReported: '報告済み',
      reported: '報告済み',
      someoneMessage: 'どこかの誰かがこのメッセージを虚空に送りました。'
    },
    ko: {
      subtitle: '공허를 통한 익명의 메시지',
      homeIntro: '우주로 신호를 보내세요. 다른 여행자들의 메시지를 발견하세요. 익명. 영원. 인간적인.',
      sendSignal: '신호 보내기',
      receiveSignal: '신호 받기',
      signalsAdrift: '개의 신호가 떠돌고 있음',
      transmitTitle: '공허로 전송',
      placeholder: '우주에 무엇을 전하고 싶으신가요?',
      transmit: '전송',
      back: '← 뒤로',
      listenTitle: '공허에 귀 기울이기',
      receiveIntro: '낯선 이의 신호를 발견하세요.',
      receiveBtn: '신호 수신',
      signalFrom: '낯선 이의 신호',
      report: '신고',
      receiveAnother: '다른 신호 받기',
      sendAnother: '신호 보내기',
      footer: '어딘가에서 누군가가 듣고 있습니다',
      transmitted: '신호가 우주로 전송되었습니다',
      from: '보낸 이',
      castAdrift: '전송일',
      statsSent: '전송됨',
      statsReceived: '수신됨',
      noSignals: '감지된 신호가 없습니다. 첫 번째가 되어 보세요.',
      seenAll: '모든 신호를 보셨습니다. 나중에 다시 와주세요.',
      yourSignalTransmitted: '신호가 전송되었습니다. 이제 공허에 귀 기울여 보세요.',
      reportSuccess: '신고가 접수되었습니다. 감사합니다.',
      alreadyReported: '이미 신고됨',
      reported: '신고됨',
      someoneMessage: '어딘가의 누군가가 이 메시지를 공허로 보냈습니다.'
    },
    zh: {
      subtitle: '穿越虚空的匿名信息',
      homeIntro: '向宇宙发送信号。发现其他旅人的信息。匿名。永恒。人性。',
      sendSignal: '发送信号',
      receiveSignal: '接收信号',
      signalsAdrift: '个信号漂流中',
      transmitTitle: '传输到虚空',
      placeholder: '你想向宇宙传达什么？',
      transmit: '传输',
      back: '← 返回',
      listenTitle: '聆听虚空',
      receiveIntro: '发现来自陌生人的信号。',
      receiveBtn: '接收信号',
      signalFrom: '来自陌生人的信号',
      report: '举报',
      receiveAnother: '接收另一个',
      sendAnother: '发送信号',
      footer: '在某处，有人在倾听',
      transmitted: '信号已传输到宇宙',
      from: '来自',
      castAdrift: '发送于',
      statsSent: '已发送',
      statsReceived: '已接收',
      noSignals: '未检测到信号。成为第一个发送者。',
      seenAll: '你已看完所有信号。稍后再来。',
      yourSignalTransmitted: '你的信号已传输。现在聆听虚空。',
      reportSuccess: '举报已提交。谢谢。',
      alreadyReported: '已举报',
      reported: '已举报',
      someoneMessage: '某人，在某处，将这条信息发送到了虚空。'
    },
    ar: {
      subtitle: 'رسائل مجهولة عبر الفراغ',
      homeIntro: 'أرسل إشارة إلى الكون. اكتشف رسائل من مسافرين آخرين. مجهول. خالد. إنساني.',
      sendSignal: 'إرسال إشارة',
      receiveSignal: 'استقبال إشارة',
      signalsAdrift: 'إشارات تائهة',
      transmitTitle: 'البث إلى الفراغ',
      placeholder: 'ماذا تريد أن تنقل إلى الكون؟',
      transmit: 'إرسال',
      back: '→ رجوع',
      listenTitle: 'الاستماع إلى الفراغ',
      receiveIntro: 'اكتشف إشارة من شخص غريب.',
      receiveBtn: 'استقبال إشارة',
      signalFrom: 'إشارة من شخص غريب',
      report: 'إبلاغ',
      receiveAnother: 'استقبال أخرى',
      sendAnother: 'إرسال إشارة',
      footer: 'في مكان ما، شخص ما يستمع',
      transmitted: 'تم إرسال الإشارة إلى الكون',
      from: 'من',
      castAdrift: 'أُرسلت في',
      statsSent: 'مرسلة',
      statsReceived: 'مستلمة',
      noSignals: 'لم يتم اكتشاف إشارات. كن الأول.',
      seenAll: 'لقد رأيت جميع الإشارات. عد لاحقاً.',
      yourSignalTransmitted: 'تم إرسال إشارتك. الآن استمع إلى الفراغ.',
      reportSuccess: 'تم إرسال البلاغ. شكراً.',
      alreadyReported: 'تم الإبلاغ مسبقاً',
      reported: 'تم الإبلاغ',
      someoneMessage: 'شخص ما، في مكان ما، أرسل هذه الرسالة إلى الفراغ.'
    }
  };

  // Flag mapping for language dropdown
  const langFlags = {
    en: '🇬🇧', fr: '🇫🇷', es: '🇪🇸', de: '🇩🇪',
    it: '🇮🇹', pt: '🇧🇷', nl: '🇳🇱', ru: '🇷🇺',
    ja: '🇯🇵', ko: '🇰🇷', zh: '🇨🇳', ar: '🇸🇦'
  };

  let currentLang = 'en';

  // Update language dropdown UI
  function updateLangDropdown(lang) {
    const currentFlag = document.getElementById('current-flag');
    if (currentFlag) currentFlag.textContent = langFlags[lang] || '🇬🇧';
    
    // Update active state in menu
    document.querySelectorAll('.lang-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
  }

  // Apply language to UI
  function applyLanguage(lang) {
    currentLang = lang;
    const t = translations[lang];
    
    // Set text direction for RTL languages (Arabic)
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    
    // Update all translatable elements
    const subtitle = document.querySelector('.subtitle');
    if (subtitle) subtitle.textContent = t.subtitle;
    
    const homeIntro = document.querySelector('.home-intro');
    if (homeIntro) homeIntro.textContent = t.homeIntro;
    
    const btnGoSend = document.getElementById('btn-go-send');
    if (btnGoSend) btnGoSend.textContent = t.sendSignal;
    
    const btnGoReceive = document.getElementById('btn-go-receive');
    if (btnGoReceive) btnGoReceive.textContent = t.receiveSignal;
    
    const transmitTitle = document.querySelector('#section-send .section-title');
    if (transmitTitle) transmitTitle.textContent = t.transmitTitle;
    
    const messageInput = document.getElementById('message-input');
    if (messageInput) messageInput.placeholder = t.placeholder;
    
    const btnSend = document.getElementById('btn-send');
    if (btnSend) btnSend.textContent = t.transmit;
    
    const btnBackSend = document.getElementById('btn-back-send');
    if (btnBackSend) btnBackSend.textContent = t.back;
    
    const listenTitle = document.querySelector('#section-receive .section-title');
    if (listenTitle) listenTitle.textContent = t.listenTitle;
    
    const receiveIntro = document.getElementById('receive-intro');
    if (receiveIntro && !receiveIntro.classList.contains('received')) {
      receiveIntro.textContent = t.receiveIntro;
    }
    
    const btnReceive = document.getElementById('btn-receive');
    if (btnReceive) btnReceive.textContent = t.receiveBtn;
    
    const messageLabel = document.querySelector('.message-label');
    if (messageLabel) messageLabel.textContent = t.signalFrom;
    
    const btnReport = document.getElementById('btn-report');
    if (btnReport && !btnReport.classList.contains('reported')) {
      btnReport.textContent = t.report;
    }
    
    const btnAnother = document.getElementById('btn-another');
    if (btnAnother) btnAnother.textContent = t.receiveAnother;
    
    const btnNewSignal = document.getElementById('btn-new-signal');
    if (btnNewSignal) btnNewSignal.textContent = t.sendAnother;
    
    const btnBackReceive = document.getElementById('btn-back-receive');
    if (btnBackReceive) btnBackReceive.textContent = t.back;
    
    const footer = document.querySelector('.footer');
    if (footer) footer.textContent = t.footer;
    
    // Update stats display
    displayPersonalStats();
    loadStats();
    
    // Update dropdown UI
    updateLangDropdown(lang);
    
    // Save preference
    localStorage.setItem('echo_lang', lang);
  }

  // Theme management
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('echo_theme', theme);
    
    // Update theme-color meta tag
    const themeColors = {
      cosmos: '#0a0a12',
      ocean: '#041c24',
      aurora: '#020a08'
    };
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', themeColors[theme] || themeColors.cosmos);
    }
  }

  // Load state from sessionStorage
  function loadState() {
    const stored = sessionStorage.getItem('echo_state');
    if (stored) {
      try {
        const state = JSON.parse(stored);
        seenMessageIds = state.seenMessageIds || [];
        hasSent = state.hasSent || false;
      } catch (e) {
        console.error('Error loading state:', e);
      }
    }

    // Load sound preference from localStorage
    const soundPref = localStorage.getItem('echo_sound');
    soundEnabled = soundPref !== 'false';
    updateSoundIcon();
  }

  // Save state to sessionStorage
  function saveState() {
    // Keep only the last 100 seen message IDs to prevent storage bloat
    const limitedIds = seenMessageIds.slice(-100);
    seenMessageIds = limitedIds;
    
    sessionStorage.setItem('echo_state', JSON.stringify({
      seenMessageIds: limitedIds,
      hasSent
    }));
  }

  // Update sound icon
  function updateSoundIcon() {
    const iconOn = elements.soundIconOn;
    const iconOff = elements.soundIconOff;
    const btn = elements.soundToggle;

    if (!iconOn || !iconOff || !btn) return;

    iconOn.style.display = soundEnabled ? 'block' : 'none';
    iconOff.style.display = soundEnabled ? 'none' : 'block';
    btn.classList.toggle('muted', !soundEnabled);

    const label = soundEnabled ? 'Sound on (click to mute)' : 'Sound off (click to unmute)';
    btn.title = label;
    btn.setAttribute('aria-label', label);
  }

  // Generate stars on multiple layers for depth effect
  function generateStars() {
    // Reduce star count on mobile for better performance
    const isMobile = window.innerWidth < 768;
    const multiplier = isMobile ? 0.5 : 1;

    const layers = [
      { id: 'stars-layer-1', count: Math.floor(80 * multiplier), sizeRange: [1.5, 3], opacityRange: [0.6, 1], twinkleSpeed: [2, 4] },
      { id: 'stars-layer-2', count: Math.floor(120 * multiplier), sizeRange: [1, 2], opacityRange: [0.4, 0.8], twinkleSpeed: [3, 5] },
      { id: 'stars-layer-3', count: Math.floor(200 * multiplier), sizeRange: [0.5, 1.5], opacityRange: [0.2, 0.5], twinkleSpeed: [4, 7] }
    ];

    layers.forEach(function(layer) {
      const container = document.getElementById(layer.id);
      if (!container) return;

      for (let i = 0; i < layer.count; i++) {
        const star = document.createElement('div');
        const size = layer.sizeRange[0] + Math.random() * (layer.sizeRange[1] - layer.sizeRange[0]);
        const opacity = layer.opacityRange[0] + Math.random() * (layer.opacityRange[1] - layer.opacityRange[0]);
        const twinkleDuration = layer.twinkleSpeed[0] + Math.random() * (layer.twinkleSpeed[1] - layer.twinkleSpeed[0]);

        star.className = size > 2 ? 'star bright' : 'star';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.width = size + 'px';
        star.style.height = size + 'px';
        star.style.setProperty('--opacity', opacity);
        star.style.setProperty('--duration', twinkleDuration + 's');
        star.style.setProperty('--delay', Math.random() * 5 + 's');

        container.appendChild(star);
      }
    });
  }

  // Create a shooting star
  function createShootingStar() {
    const container = document.getElementById('stars-container');
    if (!container) return;

    const star = document.createElement('div');
    star.className = 'shooting-star';

    // Random starting position (top portion of screen)
    const startX = Math.random() * 80;
    const startY = Math.random() * 40;
    star.style.left = startX + '%';
    star.style.top = startY + '%';

    // Travel distance (diagonal down-right)
    const travelX = 250 + Math.random() * 350;
    const travelY = 150 + Math.random() * 250;
    star.style.setProperty('--travel-x', travelX + 'px');
    star.style.setProperty('--travel-y', travelY + 'px');

    // Animation duration
    const duration = 0.8 + Math.random() * 0.6;
    star.style.animationDuration = duration + 's';

    container.appendChild(star);

    // Remove after animation
    setTimeout(function() {
      star.remove();
    }, duration * 1000 + 100);
  }

  // Create satellite
  function createSatellite() {
    const container = document.getElementById('stars-container');
    if (!container) return;

    const satellite = document.createElement('div');
    satellite.className = 'satellite' + (Math.random() > 0.5 ? ' blink' : '');

    // Random starting position (left side, various heights)
    const startY = 10 + Math.random() * 60;
    satellite.style.left = '-20px';
    satellite.style.top = startY + '%';

    // Travel distance (across the screen)
    const travelX = window.innerWidth + 100;
    satellite.style.setProperty('--travel-x', travelX + 'px');

    // Slow animation duration (15-30 seconds to cross)
    const duration = 15 + Math.random() * 15;
    satellite.style.setProperty('--duration', duration + 's');

    container.appendChild(satellite);

    // Remove after animation
    setTimeout(function() {
      satellite.remove();
    }, duration * 1000 + 100);
  }

  // Track animation timers so we can pause when tab is hidden
  let shootingStarTimer = null;
  let satelliteTimer = null;
  let animationsPaused = false;

  // Schedule random shooting stars
  function scheduleShootingStar() {
    function spawn() {
      if (animationsPaused) return;
      createShootingStar();
      const nextDelay = 2000 + Math.random() * 4000;
      shootingStarTimer = setTimeout(spawn, nextDelay);
    }
    shootingStarTimer = setTimeout(spawn, 1000);
  }

  // Schedule satellites
  function scheduleSatellites() {
    function spawn() {
      if (animationsPaused) return;
      createSatellite();
      const nextDelay = 8000 + Math.random() * 12000;
      satelliteTimer = setTimeout(spawn, nextDelay);
    }
    satelliteTimer = setTimeout(spawn, 3000);
  }

  // Pause/resume animations based on tab visibility
  function handleVisibilityChange() {
    if (document.hidden) {
      animationsPaused = true;
      clearTimeout(shootingStarTimer);
      clearTimeout(satelliteTimer);
    } else {
      animationsPaused = false;
      scheduleShootingStar();
      scheduleSatellites();
    }
  }

  // Format date
  // Locale mapping for date formatting
  const localeMap = {
    en: 'en-US', fr: 'fr-FR', es: 'es-ES', de: 'de-DE',
    it: 'it-IT', pt: 'pt-BR', nl: 'nl-NL', ru: 'ru-RU',
    ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN', ar: 'ar-SA'
  };

  function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    const t = translations[currentLang];
    const locale = localeMap[currentLang] || 'en-US';
    return t.castAdrift + ' ' + date.toLocaleDateString(locale, options);
  }

  // Load stats (with client-side cache)
  async function loadStats() {
    const now = Date.now();

    // Return cached data if still valid
    if (statsCache.data && (now - statsCache.timestamp) < STATS_CACHE_TTL) {
      updateStatsDisplay(statsCache.data);
      return;
    }

    try {
      const response = await fetch('/api/stats');
      const data = await response.json();

      // Update cache
      statsCache = { data: data, timestamp: now };
      updateStatsDisplay(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  // Update stats display
  function updateStatsDisplay(data) {
    if (elements.homeStats) {
      const t = translations[currentLang];
      elements.homeStats.textContent = data.total + ' ' + t.signalsAdrift;
    }
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Show toast
  function showToast(message) {
    const toast = elements.toast;
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(function() {
      toast.classList.remove('show');
    }, 3000);
  }

  // Show section
  function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(function(s) {
      s.classList.remove('active');
    });
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.add('active');
    }
  }

  // Core function to fetch and display a random message
  async function fetchAndDisplayMessage(btn, options) {
    const { navigateToReceive, animationDelay } = options || {};
    const originalText = btn.textContent;
    btn.innerHTML = '<span class="loading"></span>';
    btn.disabled = true;

    try {
      const response = await fetch('/api/message/random', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exclude: seenMessageIds })
      });

      const data = await response.json();
      const t = translations[currentLang];

      // Reset display for animation if needed
      if (animationDelay && elements.messageDisplay) {
        elements.messageDisplay.classList.remove('active');
      }

      if (response.ok) {
        // Track seen messages (limit to 100)
        seenMessageIds.push(data.id);
        if (seenMessageIds.length > 100) seenMessageIds.shift();
        currentMessageId = data.id;
        saveState();

        playReceiveSound();
        vibrate([50, 30, 50]);
        updatePersonalStats('received');

        var showMessage = function() {
          if (elements.receiveIntro) {
            elements.receiveIntro.textContent = t.someoneMessage;
          }
          if (elements.messageContent) {
            typewriterEffect(elements.messageContent, data.content);
          }
          if (elements.messageDate) {
            var dateText = formatDate(data.created_at);
            if (data.country) {
              dateText = t.from + ' ' + data.country + ' · ' + dateText;
            }
            elements.messageDate.textContent = dateText;
          }
          if (elements.messageDisplay) elements.messageDisplay.classList.add('active');
          if (elements.messageActions) elements.messageActions.style.display = 'flex';
          if (elements.btnReport) {
            elements.btnReport.classList.remove('reported');
            elements.btnReport.textContent = t.report;
            elements.btnReport.disabled = false;
          }
          if (elements.btnReceive) elements.btnReceive.style.display = 'none';
          if (elements.btnAnother) elements.btnAnother.style.display = 'block';
        };

        if (animationDelay) {
          setTimeout(showMessage, 50);
        } else {
          showMessage();
        }

        if (navigateToReceive) showSection('section-receive');
      } else {
        var showError = function() {
          if (elements.messageContent) {
            elements.messageContent.innerHTML = '<span class="message-error">' + escapeHtml(data.error) + '</span>';
          }
          if (elements.messageDate) elements.messageDate.textContent = '';
          if (elements.messageDisplay) elements.messageDisplay.classList.add('active');
          if (elements.messageActions) elements.messageActions.style.display = 'none';
          if (elements.btnReceive) elements.btnReceive.style.display = 'none';
          if (elements.btnAnother) elements.btnAnother.style.display = 'none';
        };

        if (animationDelay) {
          setTimeout(showError, 50);
        } else {
          showToast(data.error || 'Error receiving signal');
        }
      }
    } catch (error) {
      console.error('Error receiving message:', error);
      showToast('Connection error');
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  }

  // Receive message directly from home page
  function receiveMessageDirect(btn) {
    return fetchAndDisplayMessage(btn, { navigateToReceive: true, animationDelay: false });
  }

  // Receive message from receive section
  function receiveMessage(btn) {
    return fetchAndDisplayMessage(btn, { navigateToReceive: false, animationDelay: true });
  }

  // Report message handler
  async function handleReport() {
    const btn = elements.btnReport;
    if (!currentMessageId || !btn || btn.disabled) return;

    btn.disabled = true;

    try {
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: currentMessageId })
      });

      const data = await response.json();

      if (response.ok) {
        const t = translations[currentLang];
        btn.textContent = t.reported;
        btn.classList.add('reported');
        showToast(data.message);
      } else {
        showToast(data.error || 'Error reporting');
        btn.disabled = false;
      }
    } catch (error) {
      console.error('Error reporting message:', error);
      showToast('Connection error');
      btn.disabled = false;
    }
  }

  // Send form handler
  async function handleSendForm(e) {
    e.preventDefault();
    initAudio(); // Try to init audio on form submit

    const content = elements.messageInput ? elements.messageInput.value.trim() : '';

    if (!content) return;

    const btn = elements.btnSend;
    if (!btn) return;

    const originalText = btn.textContent;
    btn.innerHTML = '<span class="loading"></span>';
    btn.disabled = true;

    try {
      const response = await fetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content })
      });

      const data = await response.json();

      if (response.ok) {
        hasSent = true;
        saveState();
        loadStats();
        updatePersonalStats('sent');
        playSendSound();
        const t = translations[currentLang];
        // Update intro text after sending
        if (elements.receiveIntro) {
          elements.receiveIntro.textContent = t.yourSignalTransmitted;
        }
        resetReceiveSection();
        showSection('section-receive');
        showToast(t.transmitted);
      } else {
        showToast(data.error || 'Error sending message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showToast('Connection error');
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  }

  // Character counter handler
  function handleCharCounter(e) {
    const count = e.target.value.length;
    const counter = elements.charCounter;
    if (counter) {
      counter.textContent = count + ' / 140';
      counter.classList.toggle('warning', count >= 120);
    }
  }

  // Sound toggle handler
  function handleSoundToggle() {
    initAudio();
    soundEnabled = !soundEnabled;
    localStorage.setItem('echo_sound', soundEnabled);
    updateSoundIcon();

    // Play a test sound when enabling
    if (soundEnabled) {
      playReceiveSound();
    }
  }

  // Cache DOM elements
  function cacheElements() {
    elements = {
      soundToggle: document.getElementById('sound-toggle'),
      soundIconOn: document.getElementById('sound-icon-on'),
      soundIconOff: document.getElementById('sound-icon-off'),
      messageInput: document.getElementById('message-input'),
      charCounter: document.getElementById('char-counter'),
      sendForm: document.getElementById('send-form'),
      btnSend: document.getElementById('btn-send'),
      btnReceive: document.getElementById('btn-receive'),
      btnAnother: document.getElementById('btn-another'),
      btnNewSignal: document.getElementById('btn-new-signal'),
      btnReport: document.getElementById('btn-report'),
      btnGoSend: document.getElementById('btn-go-send'),
      btnGoReceive: document.getElementById('btn-go-receive'),
      homeStats: document.getElementById('home-stats'),
      btnBackSend: document.getElementById('btn-back-send'),
      btnBackReceive: document.getElementById('btn-back-receive'),
      receiveIntro: document.getElementById('receive-intro'),
      messageDisplay: document.getElementById('message-display'),
      messageContent: document.getElementById('message-content'),
      messageDate: document.getElementById('message-date'),
      messageActions: document.getElementById('message-actions'),
      toast: document.getElementById('toast')
    };
  }

  // Bind event listeners
  function bindEvents() {
    // Theme select
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
      themeSelect.addEventListener('change', function() {
        applyTheme(this.value);
      });
    }

    // Language dropdown
    const langToggle = document.getElementById('lang-toggle');
    const langMenu = document.getElementById('lang-menu');
    
    if (langToggle && langMenu) {
      langToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        const isOpen = langMenu.classList.toggle('open');
        langToggle.setAttribute('aria-expanded', isOpen);
      });
      
      // Language option clicks
      document.querySelectorAll('.lang-option').forEach(btn => {
        btn.addEventListener('click', function() {
          applyLanguage(this.dataset.lang);
          langMenu.classList.remove('open');
          langToggle.setAttribute('aria-expanded', 'false');
        });
      });
      
      // Close menu when clicking outside
      document.addEventListener('click', function(e) {
        if (!e.target.closest('.lang-dropdown')) {
          langMenu.classList.remove('open');
          langToggle.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // Sound toggle
    if (elements.soundToggle) {
      elements.soundToggle.addEventListener('click', handleSoundToggle);
    }

    // Initialize audio on any click (browser requirement)
    document.addEventListener('click', function() {
      initAudio();
    }, { once: true });

    // Character counter
    if (elements.messageInput) {
      elements.messageInput.addEventListener('input', handleCharCounter);
    }

    // Send form submission
    if (elements.sendForm) {
      elements.sendForm.addEventListener('submit', handleSendForm);
    }

    // Report button
    if (elements.btnReport) {
      elements.btnReport.addEventListener('click', handleReport);
    }

    // Receive button
    if (elements.btnReceive) {
      elements.btnReceive.addEventListener('click', function() {
        receiveMessage(this);
      });
    }

    // Another button
    if (elements.btnAnother) {
      elements.btnAnother.addEventListener('click', function() {
        receiveMessage(this);
      });
    }

    // New signal button - go to send section
    if (elements.btnNewSignal) {
      elements.btnNewSignal.addEventListener('click', function() {
        resetSendForm();
        showSection('section-send');
      });
    }

    // Home navigation buttons
    if (elements.btnGoSend) {
      elements.btnGoSend.addEventListener('click', function(e) {
        e.preventDefault();
        resetSendForm();
        showSection('section-send');
      });
    }

    if (elements.btnGoReceive) {
      elements.btnGoReceive.addEventListener('click', function(e) {
        e.preventDefault();
        // Directly receive a message without going to intermediate screen
        receiveMessageDirect(this);
      });
    }

    // Back buttons
    if (elements.btnBackSend) {
      elements.btnBackSend.addEventListener('click', function() {
        showSection('section-home');
      });
    }

    if (elements.btnBackReceive) {
      elements.btnBackReceive.addEventListener('click', function() {
        showSection('section-home');
      });
    }
  }

  // Reset send form
  function resetSendForm() {
    if (elements.messageInput) {
      elements.messageInput.value = '';
    }
    if (elements.charCounter) {
      elements.charCounter.textContent = '0 / 140';
      elements.charCounter.classList.remove('warning');
    }
  }

  // Reset receive section
  function resetReceiveSection() {
    if (elements.messageDisplay) {
      elements.messageDisplay.classList.remove('active');
    }
    if (elements.btnAnother) {
      elements.btnAnother.style.display = 'none';
    }
    if (elements.btnReceive) {
      elements.btnReceive.style.display = 'block';
    }
    if (elements.receiveIntro) {
      elements.receiveIntro.textContent = 'Discover a signal from a stranger.';
      elements.receiveIntro.style.display = 'block';
    }
  }

  // Register service worker
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(function() {
          console.log('Service Worker registered');
        })
        .catch(function(err) {
          console.log('Service Worker registration failed:', err);
        });
    }
  }

  // Initialize application
  function init() {
    cacheElements();
    
    // Display app version
    const versionEl = document.getElementById('app-version');
    if (versionEl) versionEl.textContent = 'v' + APP_VERSION;
    
    // Load saved theme
    const savedTheme = localStorage.getItem('echo_theme') || 'cosmos';
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) themeSelect.value = savedTheme;
    applyTheme(savedTheme);
    
    // Load saved language or detect from browser
    const supportedLangs = Object.keys(translations);
    const browserLang = navigator.language.split('-')[0];
    const detectedLang = supportedLangs.includes(browserLang) ? browserLang : 'en';
    const savedLang = localStorage.getItem('echo_lang') || detectedLang;
    applyLanguage(savedLang);
    
    bindEvents();
    generateStars();
    scheduleShootingStar();
    scheduleSatellites();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    loadStats();
    loadState();
    displayPersonalStats();
    registerServiceWorker();

    // Always start at home section
    showSection('section-home');
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

