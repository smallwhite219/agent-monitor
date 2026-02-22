import { motion, AnimatePresence } from 'framer-motion';
import { fixAvatar } from '../utils/fixAvatar';

export const AgentCard = ({ agent }) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card"
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <motion.img
                        src={fixAvatar(agent.avatar)}
                        alt={agent.name}
                        className={`avatar ${agent.status === 'acting' ? 'pulse' : ''}`}
                        layoutId={`avatar-${agent.id}`}
                    />
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{agent.name}</h3>
                        <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>{agent.role}</span>
                    </div>
                </div>
                <motion.span
                    layout
                    key={agent.status}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`status-badge status-${agent.status}`}
                >
                    {agent.status}
                </motion.span>
            </div>

            <div style={{ marginBottom: '0.75rem', minHeight: '40px' }}>
                <p style={{ fontSize: '0.9rem', color: '#e4e4e7', margin: 0, fontStyle: 'italic' }}>
                    "{agent.lastEvent}"
                </p>
            </div>

            <div className="progress-track">
                <motion.div
                    className="progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${agent.progress}%` }}
                    transition={{ type: 'spring', bounce: 0 }}
                />
            </div>

            <div className="event-log" style={{ marginTop: '1rem' }}>
                <AnimatePresence>
                    {agent.log.map((entry, i) => (
                        <motion.div
                            key={`${entry}-${i}`}
                            initial={{ opacity: 0, x: -10, height: 0 }}
                            animate={{ opacity: 1 - i * 0.25, x: 0, height: 'auto' }}
                            exit={{ opacity: 0, x: 10, height: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{
                                marginBottom: '0.4rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}
                        >
                            <span style={{ color: '#3b82f6', marginRight: '0.5rem' }}>&gt;</span>
                            {entry}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};
