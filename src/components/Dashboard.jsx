import { useState } from 'react';
import { useAgentSim } from '../hooks/useAgentSim';
import { EventTimeline } from './EventTimeline';
import { PixelOffice } from './PixelOffice';
import { ChatInput } from './ChatInput';
import { HiringPanel } from './HiringPanel';
import { FinalReview } from './FinalReview';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Brain, CheckCircle, Pause, Play, Trash2, Loader, MessageSquare, Settings } from 'lucide-react';
import { getActiveApiKey, rotateApiKey, getRawApiKeys, getGasUrl } from '../utils/apiKeys';

export const Dashboard = () => {
    const { systemState, proposal, agents, stats, globalEvents, activeLinks, isPaused, togglePause, clearHistory, setSystemState, setProposal } = useAgentSim();
    const [isSending, setIsSending] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const handleApprove = async () => {
        const apiKey = getActiveApiKey();
        if (!apiKey) { alert("API Key 遺失，請重新設定。"); return; }
        setIsSending(true);
        try {
            const response = await fetch(getGasUrl(), {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'APPROVE_HIRING', proposal, apiKey })
            });
            const result = await response.json();
            if (result.error) alert("核准發生錯誤: " + result.error);
        } catch (e) { alert("Approve API failed: " + e.message); }
        finally { setIsSending(false); }
    };

    const handleReject = async () => {
        setIsSending(true);
        try {
            const response = await fetch(getGasUrl(), {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'REJECT_HIRING', apiKey: getActiveApiKey() || '' })
            });
            const result = await response.json();
            if (result.error) alert("拒絕發生錯誤: " + result.error);
        } catch (e) { alert("Reject API failed: " + e.message); }
        finally { setIsSending(false); }
    };

    const handleReset = async () => {
        const apiKey = getActiveApiKey();
        if (!apiKey) return;
        setIsSending(true);
        try {
            await fetch(getGasUrl(), {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'RESET_SYSTEM', apiKey })
            });
            clearHistory();
        } catch (e) { console.error("Reset API failed:", e); }
        finally { setIsSending(false); }
    };

    const handleSendMessage = async (message) => {
        const initialApiKey = getActiveApiKey();
        if (!initialApiKey) {
            alert("請先點擊右上角齒輪設定 Gemini API Key");
            setShowSettings(true);
            return;
        }

        const rawKeys = localStorage.getItem('gemini_api_key') || '';
        const maxRetries = rawKeys.split(',').filter(Boolean).length;
        let retries = 0;
        setIsSending(true);
        let success = false;
        let currentApiKey = initialApiKey;

        while (!success && retries < maxRetries) {
            try {
                const response = await fetch(getGasUrl(), {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: 'START_PLANNING', instruction: message, apiKey: currentApiKey })
                });
                const result = await response.json();
                if (result.code === 429) {
                    if (rotateApiKey() && retries < maxRetries - 1) {
                        currentApiKey = getActiveApiKey();
                        retries++;
                        continue;
                    } else {
                        alert("API 用量超標 (429)，請稍後再試。");
                        break;
                    }
                } else if (result.error) {
                    alert("派送發生錯誤：" + result.error);
                    break;
                } else {
                    success = true;
                }
            } catch (e) { break; }
        }
        setIsSending(false);
    };

    return (
        <div className="dashboard-fullscreen">
            <PixelOffice agents={agents} />

            {/* ─── Chat Stream panel (right side overlay) ─── */}
            <AnimatePresence>
                {showChat && (
                    <motion.div
                        className="side-panel right-panel"
                        initial={{ x: 320, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 320, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        <EventTimeline events={globalEvents} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Settings panel (right side overlay) ─── */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div
                        className="side-panel right-panel settings-panel"
                        initial={{ x: 320, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 320, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        <ChatInput onSendMessage={() => { }} settingsOnly />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Modal overlays ─── */}
            {systemState === 'HIRING_APPROVAL' && proposal && (
                <div className="modal-overlay">
                    <HiringPanel proposal={proposal} onApprove={handleApprove} onReject={handleReject} isSending={isSending} />
                </div>
            )}
            {systemState === 'FINAL_REVIEW' && proposal && (
                <div className="modal-overlay">
                    <FinalReview
                        conclusion={typeof proposal === 'string' ? proposal : JSON.stringify(proposal)}
                        onComplete={handleReset}
                    />
                </div>
            )}

            {/* ─── Fixed bottom bar: stats + input + toolbar ─── */}
            <div className="bottom-bar">
                <div className="bottom-stats">
                    <div className="stat-pill" style={{ color: '#34d399' }}><Activity size={13} /> {stats.acting}</div>
                    <div className="stat-pill" style={{ color: '#60a5fa' }}><Brain size={13} /> {stats.thinking}</div>
                    <div className="stat-pill" style={{ color: '#a1a1aa' }}><CheckCircle size={13} /> {stats.completed}</div>
                    {isPaused && <div className="stat-pill" style={{ color: '#fbbf24' }}>PAUSED</div>}
                </div>

                <div className="bottom-input-wrapper">
                    {isSending && (
                        <div style={{ fontSize: '0.7rem', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                            <Loader size={11} className="spin" /> 規劃中...
                        </div>
                    )}
                    <ChatInput onSendMessage={handleSendMessage} disabled={isSending} compact />
                </div>

                <div className="bottom-toolbar">
                    <button className="toolbar-btn" onClick={handleReset} title="Clear & Reset"><Trash2 size={15} /></button>
                    <button className="toolbar-btn" onClick={togglePause} title={isPaused ? 'Resume' : 'Pause'} style={isPaused ? { background: '#10b981' } : {}}>
                        {isPaused ? <Play size={15} /> : <Pause size={15} />}
                    </button>
                    <button
                        className="toolbar-btn"
                        onClick={() => { setShowChat(!showChat); setShowSettings(false); }}
                        title="Chat Stream"
                        style={showChat ? { background: 'rgba(52,211,153,0.2)', borderColor: '#34d399' } : {}}
                    >
                        <MessageSquare size={15} />
                        {globalEvents.length > 0 && <span className="toolbar-badge">{Math.min(globalEvents.length, 99)}</span>}
                    </button>
                    <button
                        className="toolbar-btn"
                        onClick={() => { setShowSettings(!showSettings); setShowChat(false); }}
                        title="Settings"
                        style={showSettings ? { background: 'rgba(251,191,36,0.2)', borderColor: '#fbbf24' } : {}}
                    >
                        <Settings size={15} />
                    </button>
                </div>
            </div>
        </div>
    );
};
