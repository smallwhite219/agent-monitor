import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

export const FinalReview = ({ conclusion, onComplete }) => {
    if (!conclusion) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-md"
            >
                <div className="w-full max-w-2xl bg-slate-900 border-2 border-green-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-green-500/20 bg-gradient-to-r from-green-900/40 to-emerald-900/40 text-center">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 text-green-400 mb-4"
                        >
                            <CheckCircle size={32} />
                        </motion.div>
                        <h2 className="text-2xl font-bold text-white mb-2 tracking-wide">任務圓滿達成 (Mission Accomplished)</h2>
                        <p className="text-green-200/80 text-sm">團隊已結束討論，並產出了最終結論報告。請審閱。</p>
                    </div>

                    <div className="p-8 overflow-y-auto custom-scrollbar bg-slate-800/50">
                        <h3 className="text-xs font-semibold text-green-400 mb-3 uppercase tracking-[0.2em]">最終結論 (Final Report)</h3>
                        <div className="bg-slate-900/80 border border-white/10 rounded-xl p-5 shadow-inner">
                            <p className="text-white/90 leading-relaxed text-base whitespace-pre-wrap font-medium">
                                {conclusion}
                            </p>
                        </div>
                    </div>

                    <div className="p-6 bg-slate-900 border-t border-white/5 flex justify-center">
                        <button
                            onClick={onComplete}
                            className="w-full py-3 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 shadow-lg shadow-green-500/25 transition-all transform hover:scale-105 active:scale-95"
                        >
                            確認並返回待機畫面 (Acknowledge & Reset)
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
