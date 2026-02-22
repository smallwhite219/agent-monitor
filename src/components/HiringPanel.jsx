import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fixAvatar } from '../utils/fixAvatar';

export const HiringPanel = ({ proposal, onApprove, onReject, isSending }) => {
    if (!proposal) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
            >
                <div className="w-full max-w-3xl bg-slate-900/90 border border-indigo-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-full">
                    {/* Header */}
                    <div className="p-6 border-b border-white/10 bg-gradient-to-r from-indigo-900/40 to-purple-900/40">
                        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                            <span>🤝</span> 團隊招募提案 (Team Proposal)
                        </h2>
                        <p className="text-indigo-200/80 text-sm">
                            大腦 (Brain) 已根據您的任務需求，從人才庫挑選了最適合的專家。請審核並批准組建團隊。
                        </p>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                        <div className="mb-6 p-4 bg-slate-800/50 rounded-xl border border-white/5">
                            <h3 className="text-sm font-semibold text-indigo-300 mb-2 uppercase tracking-wider">組建理由 (Reasoning)</h3>
                            <p className="text-white/90 leading-relaxed text-base">{proposal.reasoning}</p>
                        </div>

                        <h3 className="text-sm font-semibold text-indigo-300 mb-4 uppercase tracking-wider">預計招募成員 (Selected Agents)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {proposal.hired_agents && proposal.hired_agents.map((agent, idx) => (
                                <motion.div
                                    key={agent.id + idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="bg-slate-800/80 border border-white/10 rounded-xl p-4 flex gap-4 hover:border-indigo-500/50 transition-colors"
                                >
                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-700 flex-shrink-0 border border-white/10">
                                        <img src={fixAvatar(agent.avatar)} alt={agent.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="text-white font-medium truncate">{agent.name}</h4>
                                        </div>
                                        <div className="text-xs text-indigo-300 mb-2 truncate">{agent.role}</div>
                                        <div className="text-sm text-slate-300 bg-slate-900/50 p-2 rounded-lg border border-white/5 italic">
                                            "{agent.justification}"
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-white/10 bg-slate-900/80 flex justify-end gap-4">
                        <button
                            onClick={onReject}
                            disabled={isSending}
                            className={`px-6 py-2.5 rounded-xl font-medium transition-colors ${isSending ? 'text-white/30 cursor-not-allowed' : 'text-white/70 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            拒絕重建 (Reject)
                        </button>
                        <button
                            onClick={onApprove}
                            disabled={isSending}
                            className={`px-8 py-2.5 rounded-xl font-medium text-white shadow-lg transition-all flex items-center gap-2 ${isSending
                                ? 'bg-indigo-500/50 cursor-not-allowed opacity-70'
                                : 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 shadow-indigo-500/25 transform hover:scale-105 active:scale-95'
                                }`}
                        >
                            <span>{isSending ? '⏳' : '✨'}</span>
                            {isSending ? '處理中 (Processing...)' : '批准並開始任務 (Approve & Start)'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
