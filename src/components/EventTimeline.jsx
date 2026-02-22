import { motion, AnimatePresence } from 'framer-motion';
import { fixAvatar } from '../utils/fixAvatar';

// Color palette by agent name hash
function nameColor(name) {
    const colors = ['#60A5FA', '#F472B6', '#34D399', '#FBBF24', '#A78BFA', '#FB923C', '#22D3EE', '#E879F9'];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
    return colors[Math.abs(h) % colors.length];
}

export const EventTimeline = ({ events }) => {
    return (
        <div className="glass-card chat-stream">
            <h2 style={{ fontSize: '1.1rem', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: '8px', width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }} className="pulse"></span>
                Chat Stream
            </h2>

            <div className="chat-messages">
                <AnimatePresence initial={false}>
                    {events.map((evt) => {
                        const color = nameColor(evt.agentName || '');
                        return (
                            <motion.div
                                key={evt.id}
                                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.25, ease: 'easeOut' }}
                                className="chat-bubble-row"
                            >
                                <img
                                    src={fixAvatar(evt.avatar)}
                                    alt=""
                                    className="chat-avatar"
                                />
                                <div className="chat-bubble-wrapper">
                                    <div className="chat-meta">
                                        <span style={{ color, fontWeight: 700, fontSize: '0.75rem' }}>{evt.agentName}</span>
                                        <span className="chat-time">
                                            {evt.time.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="chat-bubble" style={{ borderColor: color + '30' }}>
                                        {evt.event}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
};
