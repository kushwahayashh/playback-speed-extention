// Constants
const STORAGE_KEY = 'youtubeSpeed';
const DEFAULT_SPEED = 1.0;
const MIN_SPEED = 0.25;
const MAX_SPEED = 4.0;
const SPEED_STEP = 0.25;

// DOM Elements
const elements = {
  currentSpeed: null,
  customInput: null,
  applyBtn: null,
  presets: null,
  increaseBtn: null,
  decreaseBtn: null,
  resetBtn: null
};

// Get active YouTube tab
async function getYouTubeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || !tab.url.includes('youtube.com/watch')) {
    return null;
  }
  return tab;
}

// Get current playback speed from video
async function getVideoSpeed() {
  const tab = await getYouTubeTab();
  if (!tab) return null;

  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        const video = document.querySelector('video');
        return video ? video.playbackRate : DEFAULT_SPEED;
      }
    });
    return result.result;
  } catch {
    return null;
  }
}

// Get saved speed from storage
async function getSavedSpeed() {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    return result[STORAGE_KEY] || DEFAULT_SPEED;
  } catch {
    return DEFAULT_SPEED;
  }
}

// Save speed to storage
async function saveSpeed(speed) {
  await chrome.storage.local.set({ [STORAGE_KEY]: speed });
}

// Set playback speed on video
async function setSpeed(speed) {
  const tab = await getYouTubeTab();
  if (!tab) {
    alert('Please navigate to a YouTube video page');
    return;
  }

  try {
    await saveSpeed(speed);
    
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: (speed) => {
        const video = document.querySelector('video');
        if (video) video.playbackRate = speed;
      },
      args: [speed]
    });

    updateUI(speed);
  } catch (error) {
    console.error('Error setting speed:', error);
    alert('Error setting playback speed. Please refresh the page and try again.');
  }
}

// Format speed for display (removes trailing zeros)
function formatSpeed(speed) {
  return speed.toFixed(2).replace(/\.?0+$/, '');
}

// Update UI elements to reflect current speed
function updateUI(speed) {
  elements.currentSpeed.textContent = formatSpeed(speed);
  elements.customInput.value = speed;

  elements.presets.forEach(btn => {
    const btnSpeed = parseFloat(btn.dataset.speed);
    btn.classList.toggle('active', btnSpeed === speed);
  });
}

// Adjust speed by step
async function adjustSpeed(delta) {
  const currentSpeed = await getVideoSpeed() ?? await getSavedSpeed();
  const newSpeed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, currentSpeed + delta));
  await setSpeed(newSpeed);
}

// Initialize popup
async function init() {
  // Cache DOM elements
  elements.currentSpeed = document.getElementById('current-speed');
  elements.customInput = document.getElementById('custom-speed-input');
  elements.applyBtn = document.getElementById('apply-custom-speed');
  elements.presets = document.querySelectorAll('.preset');
  elements.increaseBtn = document.getElementById('increase-speed');
  elements.decreaseBtn = document.getElementById('decrease-speed');
  elements.resetBtn = document.getElementById('reset-speed');

  // Load and display speed
  const savedSpeed = await getSavedSpeed();
  const videoSpeed = await getVideoSpeed();
  const speed = videoSpeed ?? savedSpeed;
  
  updateUI(speed);
  
  // Sync video with saved speed if different
  if (videoSpeed && Math.abs(videoSpeed - savedSpeed) > 0.01) {
    await setSpeed(savedSpeed);
  }

  // Event listeners
  elements.presets.forEach(btn => {
    btn.addEventListener('click', () => {
      setSpeed(parseFloat(btn.dataset.speed));
    });
  });

  elements.applyBtn.addEventListener('click', () => {
    const speed = parseFloat(elements.customInput.value);
    if (speed >= MIN_SPEED && speed <= MAX_SPEED) {
      setSpeed(speed);
    } else {
      alert(`Speed must be between ${MIN_SPEED}x and ${MAX_SPEED}x`);
    }
  });

  elements.customInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') elements.applyBtn.click();
  });

  elements.increaseBtn.addEventListener('click', () => adjustSpeed(SPEED_STEP));
  elements.decreaseBtn.addEventListener('click', () => adjustSpeed(-SPEED_STEP));
  elements.resetBtn.addEventListener('click', () => setSpeed(DEFAULT_SPEED));
}

// Initialize on load
init();
