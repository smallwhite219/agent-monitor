// src/utils/apiKeys.js

/**
 * Gets the first active API key from localStorage.
 * Supports multiple keys separated by commas for rotation.
 */
export const getActiveApiKey = () => {
    const keysStr = localStorage.getItem('gemini_api_key') || '';
    const keys = keysStr.split(',').map(k => k.trim()).filter(Boolean);
    return keys.length > 0 ? keys[0] : null;
};

/**
 * Gets all raw configured API keys as a string.
 */
export const getRawApiKeys = () => {
    return localStorage.getItem('gemini_api_key') || '';
};

/**
 * Saves a string of API keys (can be comma-separated)
 */
export const saveApiKeys = (keysString) => {
    if (keysString.trim()) {
        localStorage.setItem('gemini_api_key', keysString.trim());
    } else {
        localStorage.removeItem('gemini_api_key');
    }
};

/**
 * Rotates the current active API key out, moving the first key to the back of the line.
 * Returns true if rotation happened, false if there are no other keys to rotate to.
 */
export const rotateApiKey = () => {
    const keysStr = localStorage.getItem('gemini_api_key') || '';
    const keys = keysStr.split(',').map(k => k.trim()).filter(Boolean);

    // 只有在提供兩把以上的 Key 時才能輪替
    if (keys.length > 1) {
        const first = keys.shift();
        keys.push(first);
        const newKeysStr = keys.join(', ');
        localStorage.setItem('gemini_api_key', newKeysStr);
        console.log("♻️ [API Key] Rate Limit Hit (429)! API Key Rotated Automatically. Using next key starting with:", keys[0].substring(0, 5) + "...");
        return true;
    } else {
        console.warn("⚠️ [API Key] Rate Limit Hit (429)! No fallback API keys provided. Please wait for cooldown or add more keys.");
        return false;
    }
};
