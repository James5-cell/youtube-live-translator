// YouTube Subtitle Translator - Popup Script

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const enableToggle = document.getElementById('enableToggle');
  const targetLangSelect = document.getElementById('targetLang');

  const dictEnableToggle = document.getElementById('dictEnableToggle');
  const dictTriggerMode = document.getElementById('dictTriggerMode');
  const dictPhoneticToggle = document.getElementById('dictPhoneticToggle');

  const statusDiv = document.getElementById('status');

  // Load Saved Settings
  chrome.storage.sync.get([
    'enabled',
    'targetLang',
    'dictEnabled',
    'dictShowPhonetic'
  ], (result) => {
    // Translation Settings
    enableToggle.checked = result.enabled !== false;
    targetLangSelect.value = result.targetLang || 'zh-CN';

    // Dictionary Settings - defaults
    dictEnableToggle.checked = result.dictEnabled !== false; // Default true
    // Mode is now hardcoded to 'hover'
    dictPhoneticToggle.checked = result.dictShowPhonetic !== false; // Default true
  });

  // Save Settings
  const saveSettings = () => {
    const settings = {
      enabled: enableToggle.checked,
      targetLang: targetLangSelect.value,
      dictEnabled: dictEnableToggle.checked,
      dictTriggerMode: 'hover', // Enforce hover only
      dictShowPhonetic: dictPhoneticToggle.checked
    };

    chrome.storage.sync.set(settings, () => {
      showStatus('Settings saved ✓', 'success');
    });
  };

  // UI Helpers
  const showStatus = (message, type = '') => {
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + type;

    // Reset after 2s
    setTimeout(() => {
      // Keep "Settings saved" visual feedback simple
      // statusDiv.className = 'status'; 
    }, 2000);
  };

  // Event Listeners
  const inputs = [
    enableToggle,
    targetLangSelect,
    dictEnableToggle,
    dictPhoneticToggle
  ];

  inputs.forEach(input => {
    input.addEventListener('change', saveSettings);
  });
});
