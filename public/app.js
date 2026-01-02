// Echo - Anonymous messages through the void
// Application JavaScript

(function() {
  'use strict';

  // State
  let seenMessageIds = [];
  let hasSent = false;
  let currentMessageId = null;
  let soundEnabled = true;
  let audioContext = null;
  let audioInitialized = false;

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

  // Typewriter effect for messages
  function typewriterEffect(element, text, callback) {
    const escaped = escapeHtml(text);
    element.innerHTML = '';
    element.style.opacity = '1';
    
    let i = 0;
    const speed = 30; // ms per character
    
    function type() {
      if (i < escaped.length) {
        // Handle HTML entities
        if (escaped[i] === '&') {
          const endEntity = escaped.indexOf(';', i);
          if (endEntity !== -1) {
            element.innerHTML += escaped.substring(i, endEntity + 1);
            i = endEntity + 1;
          } else {
            element.innerHTML += escaped[i];
            i++;
          }
        } else {
          element.innerHTML += escaped[i];
          i++;
        }
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
      alreadyReported: 'Already reported'
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
      alreadyReported: 'Déjà signalé'
    }
  };

  let currentLang = 'en';

  // Apply language to UI
  function applyLanguage(lang) {
    currentLang = lang;
    const t = translations[lang];
    
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
      aurora: '#0a0512'
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
    btn.title = soundEnabled ? 'Sound on (click to mute)' : 'Sound off (click to unmute)';
  }

  // Generate stars on multiple layers for depth effect
  function generateStars() {
    const layers = [
      { id: 'stars-layer-1', count: 80, sizeRange: [1.5, 3], opacityRange: [0.6, 1], twinkleSpeed: [2, 4] },
      { id: 'stars-layer-2', count: 120, sizeRange: [1, 2], opacityRange: [0.4, 0.8], twinkleSpeed: [3, 5] },
      { id: 'stars-layer-3', count: 200, sizeRange: [0.5, 1.5], opacityRange: [0.2, 0.5], twinkleSpeed: [4, 7] }
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

  // Schedule random shooting stars
  function scheduleShootingStar() {
    function spawn() {
      createShootingStar();
      // Random interval between 2-6 seconds
      const nextDelay = 2000 + Math.random() * 4000;
      setTimeout(spawn, nextDelay);
    }
    // First one after 1 second
    setTimeout(spawn, 1000);
  }

  // Schedule satellites
  function scheduleSatellites() {
    function spawn() {
      createSatellite();
      // Random interval between 8-20 seconds (less frequent than shooting stars)
      const nextDelay = 8000 + Math.random() * 12000;
      setTimeout(spawn, nextDelay);
    }
    // First one after 3 seconds
    setTimeout(spawn, 3000);
  }

  // Format date
  function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    const t = translations[currentLang];
    const locale = currentLang === 'fr' ? 'fr-FR' : 'en-US';
    return t.castAdrift + ' ' + date.toLocaleDateString(locale, options);
  }

  // Load stats
  async function loadStats() {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      if (elements.homeStats) {
        const t = translations[currentLang];
        elements.homeStats.textContent = data.total + ' ' + t.signalsAdrift;
      }
    } catch (error) {
      console.error('Error loading stats:', error);
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

  // Receive message directly from home page
  async function receiveMessageDirect(btn) {
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

      if (response.ok) {
        // Add to seen messages
        seenMessageIds.push(data.id);
        if (seenMessageIds.length > 100) {
          seenMessageIds.shift();
        }
        currentMessageId = data.id;
        saveState();

        // Play sound and vibrate
        playReceiveSound();
        vibrate([50, 30, 50]); // Short double vibration
        updatePersonalStats('received');

        // Prepare the receive section
        if (elements.receiveIntro) {
          elements.receiveIntro.textContent = 'Someone, somewhere, sent this message into the void.';
        }
        if (elements.messageContent) {
          typewriterEffect(elements.messageContent, data.content);
        }
        if (elements.messageDate) {
          let dateText = formatDate(data.created_at);
          if (data.country) {
            const t = translations[currentLang];
            dateText = t.from + ' ' + data.country + ' · ' + dateText;
          }
          elements.messageDate.textContent = dateText;
        }
        if (elements.messageDisplay) {
          elements.messageDisplay.classList.add('active');
        }
        if (elements.messageActions) {
          elements.messageActions.style.display = 'flex';
        }
        if (elements.btnReport) {
          elements.btnReport.classList.remove('reported');
          elements.btnReport.textContent = 'Report';
          elements.btnReport.disabled = false;
        }
        if (elements.btnReceive) {
          elements.btnReceive.style.display = 'none';
        }
        if (elements.btnAnother) {
          elements.btnAnother.style.display = 'block';
        }

        // Navigate to receive section
        showSection('section-receive');
      } else {
        showToast(data.error || 'Error receiving signal');
      }
    } catch (error) {
      console.error('Error:', error);
      showToast('Network error. Please try again.');
    }

    btn.innerHTML = originalText;
    btn.disabled = false;
  }

  // Receive message
  async function receiveMessage(btn) {
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
      const messageDisplay = elements.messageDisplay;
      const btnAnother = elements.btnAnother;
      const btnReceive = elements.btnReceive;
      const messageActions = elements.messageActions;
      const btnReport = elements.btnReport;

      // Reset display for animation
      if (messageDisplay) {
        messageDisplay.classList.remove('active');
      }

      if (response.ok) {
        // Add to seen messages (limit to 100)
        seenMessageIds.push(data.id);
        if (seenMessageIds.length > 100) {
          seenMessageIds.shift();
        }
        currentMessageId = data.id;
        saveState();

        // Play sound and vibrate
        playReceiveSound();
        vibrate([50, 30, 50]);
        updatePersonalStats('received');

        // Small delay for animation reset
        setTimeout(function() {
          // Display message with typewriter effect
          if (elements.messageContent) {
            typewriterEffect(elements.messageContent, data.content);
          }
          if (elements.messageDate) {
            let dateText = formatDate(data.created_at);
            if (data.country) {
              const t = translations[currentLang];
              dateText = t.from + ' ' + data.country + ' · ' + dateText;
            }
            elements.messageDate.textContent = dateText;
          }
          if (messageDisplay) {
            messageDisplay.classList.add('active');
          }
          if (messageActions) {
            messageActions.style.display = 'flex';
          }
          if (btnReport) {
            btnReport.classList.remove('reported');
            btnReport.textContent = 'Report';
            btnReport.disabled = false;
          }

          // Show "another" button, hide initial receive button
          if (btnReceive) {
            btnReceive.style.display = 'none';
          }
          if (btnAnother) {
            btnAnother.style.display = 'block';
          }
        }, 50);
      } else {
        setTimeout(function() {
          if (elements.messageContent) {
            elements.messageContent.innerHTML = '<span class="message-error">' + escapeHtml(data.error) + '</span>';
          }
          if (elements.messageDate) {
            elements.messageDate.textContent = '';
          }
          if (messageDisplay) {
            messageDisplay.classList.add('active');
          }
          if (messageActions) {
            messageActions.style.display = 'none';
          }
          if (btnReceive) {
            btnReceive.style.display = 'none';
          }
          if (btnAnother) {
            btnAnother.style.display = 'none';
          }
        }, 50);
      }
    } catch (error) {
      console.error('Error receiving message:', error);
      showToast('Connection error');
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
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
        btn.textContent = 'Reported';
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
        // Update intro text after sending
        if (elements.receiveIntro) {
          elements.receiveIntro.textContent = 'Your signal was transmitted. Now listen to the void.';
        }
        resetReceiveSection();
        showSection('section-receive');
        showToast('Signal transmitted to the cosmos');
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
      counter.classList.toggle('warning', count > 450);
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

    // Language select
    const langSelect = document.getElementById('lang-select');
    if (langSelect) {
      langSelect.addEventListener('change', function() {
        applyLanguage(this.value);
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
    
    // Load saved theme
    const savedTheme = localStorage.getItem('echo_theme') || 'cosmos';
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) themeSelect.value = savedTheme;
    applyTheme(savedTheme);
    
    // Load saved language
    const savedLang = localStorage.getItem('echo_lang') || 
      (navigator.language.startsWith('fr') ? 'fr' : 'en');
    const langSelect = document.getElementById('lang-select');
    if (langSelect) langSelect.value = savedLang;
    applyLanguage(savedLang);
    
    bindEvents();
    generateStars();
    scheduleShootingStar();
    scheduleSatellites();
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

