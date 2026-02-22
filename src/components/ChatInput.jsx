import { useState, useEffect } from 'react';
import { Send, Key, Eye, EyeOff, Link2 } from 'lucide-react';
import { getRawApiKeys, saveApiKeys, getGasUrl, saveGasUrl } from '../utils/apiKeys';

export const ChatInput = ({ onSendMessage, disabled, compact, settingsOnly }) => {
    const [message, setMessage] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [gasUrl, setGasUrl] = useState('');
    const [showKey, setShowKey] = useState(false);

    useEffect(() => {
        const saved = getRawApiKeys();
        if (saved) setApiKey(saved);
        setGasUrl(getGasUrl());
    }, []);

    const handleSave = () => {
        saveApiKeys(apiKey);
        saveGasUrl(gasUrl);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (message.trim() && onSendMessage) {
            onSendMessage(message.trim());
            setMessage('');
        }
    };

    const isConfigured = getRawApiKeys() && getGasUrl();

    // Settings-only mode (for the side panel)
    if (settingsOnly) {
        return (
            <div className="settings-content">
                {/* GAS URL */}
                <h3 style={{ fontSize: '0.95rem', margin: '0 0 0.6rem 0', color: '#e4e4e7', display: 'flex', alignItems: 'center' }}>
                    <Link2 size={14} style={{ marginRight: '6px' }} />
                    GAS Deploy URL
                </h3>
                <div style={{ fontSize: '0.7rem', color: '#71717A', marginBottom: '0.5rem' }}>
                    貼上你自己部署的 Google Apps Script 網址。
                </div>
                <input
                    type="text"
                    value={gasUrl}
                    onChange={(e) => setGasUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="settings-input"
                    style={{ marginBottom: '1rem', fontSize: '0.7rem' }}
                />

                {/* API Key */}
                <h3 style={{ fontSize: '0.95rem', margin: '0 0 0.6rem 0', color: '#e4e4e7', display: 'flex', alignItems: 'center' }}>
                    <Key size={14} style={{ marginRight: '6px' }} />
                    Gemini API Key
                </h3>
                <div style={{ fontSize: '0.7rem', color: '#71717A', marginBottom: '0.5rem' }}>
                    可用逗號分隔輸入多組 Key 自動輪替。資料只存在你的瀏覽器。
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <input
                            type={showKey ? "text" : "password"}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="AIzaSy..."
                            className="settings-input"
                        />
                        <button
                            onClick={() => setShowKey(!showKey)}
                            className="eye-btn"
                        >
                            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                    </div>
                </div>

                {/* Single save button for both */}
                <button onClick={handleSave} className="save-btn" style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}>
                    Save All
                </button>

                {getRawApiKeys() && (
                    <div style={{ fontSize: '0.7rem', color: '#34d399' }}>
                        ✓ {getRawApiKeys().split(',').filter(Boolean).length} key(s) saved
                    </div>
                )}
            </div>
        );
    }

    // Compact mode (fixed bottom bar)
    if (compact) {
        return (
            <form onSubmit={handleSubmit} className="compact-input">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={isConfigured ? "輸入指令給 AI 團隊..." : "請先設定 GAS URL 與 API Key (⚙️)"}
                    disabled={disabled || !isConfigured}
                    className="compact-input-field"
                />
                <button
                    type="submit"
                    disabled={!message.trim() || disabled || !isConfigured}
                    className="compact-send-btn"
                    style={{
                        background: message.trim() && isConfigured ? 'linear-gradient(135deg, #f43f5e, #fbbf24)' : 'rgba(255,255,255,0.1)',
                        color: message.trim() && isConfigured ? '#18181b' : '#71717A',
                    }}
                >
                    <Send size={18} />
                </button>
            </form>
        );
    }

    return null;
};
