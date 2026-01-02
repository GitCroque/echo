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

  // Play receive sound - cosmic ping
  function playReceiveSound() {
    if (!soundEnabled || !audioInitialized || !audioContext) return;

    try {
      // Resume context if suspended
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const now = audioContext.currentTime;

      // Main tone - ethereal ping
      const osc1 = audioContext.createOscillator();
      const gain1 = audioContext.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(440, now + 0.3);
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(audioContext.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);

      // Harmonic overtone
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1320, now);
      osc2.frequency.exponentialRampToValueAtTime(660, now + 0.25);
      gain2.gain.setValueAtTime(0.08, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.start(now);
      osc2.stop(now + 0.4);

      // Sub bass
      const osc3 = audioContext.createOscillator();
      const gain3 = audioContext.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(110, now);
      gain3.gain.setValueAtTime(0.1, now);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc3.connect(gain3);
      gain3.connect(audioContext.destination);
      osc3.start(now);
      osc3.stop(now + 0.5);
    } catch (e) {
      console.log('Error playing sound:', e);
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

  // Format date
  function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return 'Transmitted on ' + date.toLocaleDateString('en-US', options);
  }

  // Load stats
  async function loadStats() {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      if (elements.stats) {
        elements.stats.textContent = data.total + ' signals';
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
        // Add to seen messages
        seenMessageIds.push(data.id);
        currentMessageId = data.id;
        saveState();

        // Play sound
        playReceiveSound();

        // Small delay for animation reset
        setTimeout(function() {
          // Display message
          if (elements.messageContent) {
            elements.messageContent.innerHTML = escapeHtml(data.content);
          }
          if (elements.messageDate) {
            elements.messageDate.textContent = formatDate(data.created_at);
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
      counter.textContent = count + ' / 500';
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
      stats: document.getElementById('stats'),
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
      elements.btnGoSend.addEventListener('click', function() {
        resetSendForm();
        showSection('section-send');
      });
    }

    if (elements.btnGoReceive) {
      elements.btnGoReceive.addEventListener('click', function() {
        resetReceiveSection();
        showSection('section-receive');
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
      elements.charCounter.textContent = '0 / 500';
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
    bindEvents();
    generateStars();
    scheduleShootingStar();
    loadStats();
    loadState();
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

