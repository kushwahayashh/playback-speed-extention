// Content script - applies saved speed to all YouTube videos

(function() {
  'use strict';
  
  const STORAGE_KEY = 'youtubeSpeed';
  const DEFAULT_SPEED = 1.0;
  let videoObserver = null;
  let rateChangeHandler = null;

  // Apply speed to video
  function applySpeed(video, speed) {
    if (video && video.playbackRate !== speed) {
      video.playbackRate = speed;
    }
  }

  // Restore saved speed from storage
  function restoreSpeed() {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      const savedSpeed = result[STORAGE_KEY] || DEFAULT_SPEED;
      const video = document.querySelector('video');
      if (video) {
        applySpeed(video, savedSpeed);
      }
    });
  }

  // Save speed when it changes
  function handleRateChange() {
    const video = document.querySelector('video');
    if (video) {
      chrome.storage.local.set({ [STORAGE_KEY]: video.playbackRate });
    }
  }

  // Setup video observer
  function setupVideoObserver() {
    const video = document.querySelector('video');
    if (!video) return;

    // Restore speed immediately
    restoreSpeed();

    // Setup rate change listener (only once per video)
    if (!rateChangeHandler) {
      rateChangeHandler = handleRateChange;
      video.addEventListener('ratechange', rateChangeHandler);
    }
  }

  // Observe DOM for video elements
  function startObserving() {
    if (videoObserver) return;

    videoObserver = new MutationObserver(() => {
      const video = document.querySelector('video');
      if (video && video.readyState >= 2) {
        setupVideoObserver();
      }
    });

    videoObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Initial check
    setupVideoObserver();
  }

  // Handle messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'setSpeed') {
      const video = document.querySelector('video');
      if (video) {
        applySpeed(video, request.speed);
        chrome.storage.local.set({ [STORAGE_KEY]: request.speed });
      }
      sendResponse({ success: true });
    }
    return true;
  });

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserving);
  } else {
    startObserving();
  }
})();
