import { useState, useEffect, useRef } from 'react';
import { getActiveApiKey, rotateApiKey, getGasUrl } from '../utils/apiKeys';

const INITIAL_AGENTS = [
    { id: 'dev', name: 'Developer', role: 'Engineering', avatar: '/dev.png', status: 'thinking', progress: 0, lastEvent: 'Connecting to DB...', log: [] },
    { id: 'design', name: 'Designer', role: 'UI/UX', avatar: '/design.png', status: 'thinking', progress: 0, lastEvent: 'Connecting to DB...', log: [] },
    { id: 'pm', name: 'Manager', role: 'Coordination', avatar: '/pm.png', status: 'thinking', progress: 0, lastEvent: 'Connecting to DB...', log: [] },
    { id: 'security', name: 'Security', role: 'Safety', avatar: '/security.png', status: 'thinking', progress: 0, lastEvent: 'Connecting to DB...', log: [] }
];

export const useAgentSim = () => {
    const [isPaused, setIsPaused] = useState(false);
    const [agents, setAgents] = useState(INITIAL_AGENTS);
    const [globalEvents, setGlobalEvents] = useState(() => {
        const saved = localStorage.getItem('ag_monitor_events_real');
        if (saved) {
            try {
                return JSON.parse(saved).map(e => ({ ...e, time: new Date(e.time) }));
            } catch (e) {
                return [];
            }
        }
        return [];
    });
    const [activeLinks, setActiveLinks] = useState([]);

    // New V2 State
    const [systemState, setSystemState] = useState('IDLE');
    const [proposal, setProposal] = useState(null);
    const systemStateRef = useRef('IDLE');

    useEffect(() => {
        systemStateRef.current = systemState;
    }, [systemState]);

    // We need to perfectly track seen IDs because gasp! GAS generates exactly identical timestamps for different rows
    // It's crucial we dedupe by event.id 
    const seenEventIdsRef = useRef(new Set(globalEvents.map(e => e.id)));

    useEffect(() => {
        localStorage.setItem('ag_monitor_events_real', JSON.stringify(globalEvents));
    }, [globalEvents]);

    useEffect(() => {
        if (isPaused) return;

        const fetchData = async () => {
            try {
                const response = await fetch(getGasUrl());
                if (!response.ok) throw new Error('API request failed');

                const data = await response.json();

                if (data.systemState) setSystemState(data.systemState);
                if (data.proposal) setProposal(data.proposal);

                if (data.agents && data.agents.length > 0) {
                    setAgents(data.agents);
                }

                if (data.globalEvents && data.globalEvents.length > 0) {
                    let hasNew = false;
                    const newEvents = [];

                    // data.globalEvents from GAS is ordered newest to oldest
                    // We iterate backwards (oldest to newest) to process them chronologically
                    for (let i = data.globalEvents.length - 1; i >= 0; i--) {
                        const evt = data.globalEvents[i];

                        // Check exact ID because Commander and PM events get written in the exact same millisecond
                        if (!seenEventIdsRef.current.has(evt.id)) {
                            hasNew = true;
                            seenEventIdsRef.current.add(evt.id);
                            newEvents.unshift({ ...evt, time: new Date(evt.time) });
                        }
                    }

                    if (hasNew) {
                        setGlobalEvents(prevEvents => {
                            // Prepend new events (newEvents is already sorted newest-first)
                            return [...newEvents, ...prevEvents].slice(0, 50);
                        });
                    }
                }

                if (data.activeLinks && data.activeLinks.length > 0) {
                    // freshLinks now has guaranteed unique IDs from the backend (timestamp + agentId + targetAgentId + i)
                    const freshLinks = data.activeLinks.filter(link => {
                        const timestampStr = link.id.substring(0, 24);
                        const linkAge = new Date() - new Date(timestampStr);
                        // Show links from the last 30 seconds
                        return linkAge < 30000 && linkAge >= 0;
                    });

                    if (freshLinks.length > 0) {
                        // Compare current active links with incoming ones by exact ID to trigger CSS animations naturally
                        setActiveLinks(prev => {
                            const newLinks = freshLinks.filter(fl => !prev.some(pl => pl.id === fl.id));
                            if (newLinks.length > 0) {
                                // Clear links after animation duration (2.5s)
                                setTimeout(() => {
                                    setActiveLinks(current => current.filter(cl => !newLinks.some(nl => nl.id === cl.id)));
                                }, 2500);
                                return [...prev, ...newLinks];
                            }
                            return prev;
                        });
                    }
                }
            } catch (error) {
                console.error("Polling Error:", error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 3000);

        return () => clearInterval(interval);
    }, [isPaused]);

    // NEXT_TURN 自動輪詢器
    useEffect(() => {
        if (isPaused) return;
        let isSending = false;
        let consecutive429Errors = 0;

        const nextTurnPoller = setInterval(async () => {
            if (systemStateRef.current === 'DISCUSSION_LOOP' && !isSending) {
                isSending = true;
                try {
                    const apiKey = getActiveApiKey();
                    if (apiKey) {
                        const response = await fetch(getGasUrl(), {
                            method: 'POST',
                            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                            body: JSON.stringify({ action: 'NEXT_TURN', apiKey: apiKey })
                        });
                        const result = await response.json();

                        // Check for rate limit error and rotate key for the NEXT polling cycle
                        if (result.code === 429) {
                            consecutive429Errors++;
                            const rawKeys = localStorage.getItem('gemini_api_key') || '';
                            const maxKeys = rawKeys.split(',').filter(Boolean).length;

                            if (consecutive429Errors >= maxKeys) {
                                console.error("🚨 All API keys hit rate limit!");
                                alert("API 流量已耗盡 (429)！所有設定的 API Key 皆已觸發限制。\n系統即將暫停。請稍候 1~2 分鐘點擊上方 Resume 繼續，或前往 Settings 重新更換 API Key。");
                                setIsPaused(true);
                                consecutive429Errors = 0;
                            } else {
                                console.warn(`API 429 Rate Limit Hit during NEXT_TURN polling. (${consecutive429Errors}/${maxKeys})`);
                                rotateApiKey();
                            }
                        } else {
                            consecutive429Errors = 0;
                        }
                    }
                } catch (e) {
                    console.error('Next Turn API Error', e);
                } finally {
                    isSending = false;
                }
            }
        }, 10000); // 延長到10秒一次，避免觸發 Gemini API 15 RPM 的 Rate Limit

        return () => clearInterval(nextTurnPoller);
    }, [isPaused]);

    const stats = {
        thinking: agents.filter(a => a.status === 'thinking').length,
        acting: agents.filter(a => a.status === 'acting').length,
        completed: agents.filter(a => a.status === 'completed').length
    };

    return {
        systemState,
        proposal,
        agents,
        stats,
        globalEvents,
        activeLinks,
        isPaused,
        togglePause: () => setIsPaused(!isPaused),
        clearHistory: () => {
            setGlobalEvents([]);
            seenEventIdsRef.current = new Set();
            localStorage.removeItem('ag_monitor_events_real');
        }
    };
};
