import { motion, AnimatePresence } from 'framer-motion';
import { fixAvatar } from '../utils/fixAvatar';

export const AgentGraph = ({ agents, activeLinks }) => {
    const radius = 80;
    const centerX = 150;
    const centerY = 100;

    // Dynamically calculate positions in a circle layout
    const dynamicPositions = {};
    const nodeCount = agents.length;

    agents.forEach((agent, i) => {
        // Start from top (-90 degrees)
        const angle = (i / nodeCount) * 2 * Math.PI - Math.PI / 2;
        dynamicPositions[agent.id] = {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
        };
    });
    return (
        <div className="glass-card" style={{ marginTop: '2rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', margin: '0 0 1rem 0', alignSelf: 'flex-start', display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: '8px', width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6' }}></span>
                Topology Graph
            </h2>

            <div style={{ position: 'relative', width: '300px', height: '200px' }}>
                {/* SVG Lines for connections */}
                <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, zIndex: 1, pointerEvents: 'none' }}>
                    <AnimatePresence>
                        {activeLinks.map(link => {
                            const p1 = dynamicPositions[link.from];
                            const p2 = dynamicPositions[link.to];
                            if (!p1 || !p2) return null;

                            return (
                                <motion.line
                                    key={link.id}
                                    x1={p1.x}
                                    y1={p1.y}
                                    x2={p2.x}
                                    y2={p2.y}
                                    stroke="url(#gradient)"
                                    strokeWidth="3"
                                    strokeDasharray="4 4"
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5 }}
                                />
                            );
                        })}
                    </AnimatePresence>
                    <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                    </defs>
                </svg>

                {/* Agent Nodes */}
                {agents.map(agent => (
                    <div
                        key={agent.id}
                        style={{
                            position: 'absolute',
                            left: (dynamicPositions[agent.id]?.x || centerX) - 24,
                            top: (dynamicPositions[agent.id]?.y || centerY) - 24,
                            zIndex: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        <div style={{ position: 'relative' }}>
                            <img
                                src={fixAvatar(agent.avatar)}
                                alt={agent.name}
                                className={agent.status === 'acting' ? 'pulse' : ''}
                                style={{
                                    width: '48px', height: '48px', borderRadius: '50%',
                                    border: `2px solid ${agent.status === 'acting' ? '#fbbf24' : agent.status === 'completed' ? '#34d399' : '#60a5fa'}`,
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                                }}
                            />
                            {/* Inner glow for active nodes */}
                            {agent.status === 'acting' && (
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                    borderRadius: '50%', boxShadow: '0 0 15px #fbbf24', pointerEvents: 'none'
                                }} />
                            )}
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: '4px' }}>
                            {agent.name}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};
