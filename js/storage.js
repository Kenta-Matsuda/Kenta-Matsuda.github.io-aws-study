const API_KEY_STORAGE_KEY = 'gemini_api_key';

export function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE_KEY);
}

export function saveApiKeyFromInput({ inputEl, messageEl, onSuccess }) {
  const key = (inputEl.value || '').trim();

  if (!key) {
    showMessage(messageEl, 'APIキーを入力してください。', 'text-red-500');
    return;
  }

  localStorage.setItem(API_KEY_STORAGE_KEY, key);
  showMessage(messageEl, 'APIキーを保存しました。', 'text-green-500');
  onSuccess?.();
}

export function clearApiKey({ inputEl, messageEl }) {
  localStorage.removeItem(API_KEY_STORAGE_KEY);
  inputEl.value = '';
  showMessage(messageEl, 'APIキーを削除しました。', 'text-gray-500');
}

function showMessage(messageEl, text, colorClass) {
  messageEl.textContent = text;
  messageEl.className = `text-sm mb-4 ${colorClass}`;
  messageEl.classList.remove('hidden');
}
