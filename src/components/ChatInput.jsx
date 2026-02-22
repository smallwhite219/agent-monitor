import { useState, useEffect } from 'react';
import { Send, Key, Eye, EyeOff } from 'lucide-react';
import { getRawApiKeys, saveApiKeys } from '../utils/apiKeys';

export const ChatInput = ({ onSendMessage, disabled, compact, settingsOnly }) => {
    const [message, setMessage] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);

    useEffect(() => {
        const saved = getRawApiKeys();
        if (saved) setApiKey(saved);
    }, []);

    const handleSaveKey = () => {
        saveApiKeys(apiKey);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (message.trim() && onSendMessage) {
            onSendMessage(message.trim());
            setMessage('');
        }
    };

    // Settings-only mode (for the side panel)
    if (settingsOnly) {
        return (
            <div className="settings-content">
                <h3 style={{ fontSize: '1rem', margin: '0 0 1rem 0', color: '#e4e4e7' }}>
                    <Key size={14} style={{ marginRight: '6px' }} />
                    API Key Settings
                </h3>
                <div style={{ fontSize: '0.75rem', color: '#71717A', marginBottom: '0.75rem' }}>
                    Stored locally only. 可用逗號分隔輸入多組 Key 自動輪替。
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
                    <button onClick={handleSaveKey} className="save-btn">Save</button>
                </div>
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
                    placeholder={getRawApiKeys() ? "輸入指令給 AI 團隊..." : "請先設定 API Key (右上角齒輪)"}
                    disabled={disabled || !getRawApiKeys()}
                    className="compact-input-field"
                />
                <button
                    type="submit"
                    disabled={!message.trim() || disabled || !getRawApiKeys()}
                    className="compact-send-btn"
                    style={{
                        background: message.trim() && getRawApiKeys() ? 'linear-gradient(135deg, #f43f5e, #fbbf24)' : 'rgba(255,255,255,0.1)',
                        color: message.trim() && getRawApiKeys() ? '#18181b' : '#71717A',
                    }}
                >
                    <Send size={18} />
                </button>
            </form>
        );
    }

    return null;
};
