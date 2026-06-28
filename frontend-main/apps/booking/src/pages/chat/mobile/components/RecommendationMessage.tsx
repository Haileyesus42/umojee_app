import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, MapPin, Clock, Info, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

const markdownSanitizeSchema = {
    ...defaultSchema,
    attributes: {
        ...(defaultSchema.attributes || {}),
        img: [
            ...((defaultSchema.attributes?.img as any[]) || []),
            ["width"],
            ["height"],
        ],
        td: [...((defaultSchema.attributes?.td as any[]) || []), ["align"]],
        th: [...((defaultSchema.attributes?.th as any[]) || []), ["align"]],
    },
} as typeof defaultSchema;

export interface Recommendation {
    type: string;
    title: string;
    content: string;
    context_data?: any;
}

interface RecommendationMessageProps {
    recommendation: Recommendation;
    onAction?: (recommendation: Recommendation) => void;
}

const RecommendationMessage: React.FC<RecommendationMessageProps> = ({ recommendation, onAction }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const getIcon = () => {
        switch (recommendation.type) {
            case 'destination': return <MapPin className="w-5 h-5 text-amber-400" />;
            case 'logistics': return <Clock className="w-5 h-5 text-primary" />;
            case 'activity': return <Sparkles className="w-5 h-5 text-purple-400" />;
            default: return <Info className="w-5 h-5 text-indigo-400" />;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative h-full flex flex-col"
        >
            {/* Animated Glow Border - Using Primary */}
            <div className="absolute -inset-[1px] bg-gradient-to-r from-primary/20 via-indigo-200/20 to-primary/20 rounded-[22px] blur-sm opacity-20 group-hover:opacity-40 transition-opacity duration-500" />

            {/* Main Card Content: Using Primary Background theme */}
            <div className="relative flex flex-col justify-between h-full bg-primary/0 backdrop-blur-2xl border border-primary/20 rounded-[21px] p-5 overflow-hidden shadow-2xl">

                {/* Visual Flair: Primary Corner Gradient */}
                <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary/20 blur-3xl rounded-full" />
                <div className="absolute -bottom-12 -left-12 w-24 h-24 bg-indigo-500/10 blur-3xl rounded-full" />

                <div className="flex-1">
                    {/* Header: Icon + AI Tag */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-primary/20 border border-primary/30 rounded-xl shadow-inner backdrop-blur-md">
                                {getIcon()}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-primary leading-none mb-1">
                                    AI Insight
                                </span>
                                <h4 className="text-sm font-bold text-black/90 truncate max-w-[160px]">
                                    {recommendation.title || "Smart Suggestion"}
                                </h4>
                            </div>
                        </div>

                        {/* Pulsing Dot in Primary */}
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 border border-primary/20 rounded-full">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                            </span>
                            <span className="text-[9px] font-bold text-primary/90 tracking-tight">LIVE</span>
                        </div>
                    </div>

                    {/* Content Body with Expansion Toggle */}
                    <div className={`chat-markdown text-sm text-slate-900/90 leading-relaxed font-medium transition-all duration-300 ${!isExpanded ? 'line-clamp-3' : ''}`}>
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSanitizeSchema]]}
                        >
                            {recommendation.content}
                        </ReactMarkdown>
                    </div>

                    {recommendation.content.length > 100 && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="mt-2 flex items-center gap-1 text-[11px] font-bold text-primary hover:text-white transition-colors"
                        >
                            {isExpanded ? (
                                <>Show Less <ChevronUp className="w-3 h-3" /></>
                            ) : (
                                <>Read More <ChevronDown className="w-3 h-3" /></>
                            )}
                        </button>
                    )}
                </div>

                {/* Footer Action */}
                {onAction && (
                    <button
                        onClick={() => onAction(recommendation)}
                        className="mt-5 group/btn relative flex items-center justify-center gap-2 w-full py-3 bg-primary/20 hover:bg-primary/30 border border-primary/20 hover:border-primary/40 rounded-xl transition-all duration-300 overflow-hidden"
                    >
                        <span className="text-xs font-bold text-primary/90 group-hover/btn:text-white transition-colors">
                            Contact your AI Agent
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-primary group-hover/btn:translate-x-1 transition-transform" />

                        {/* Button Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] pointer-events-none" />
                    </button>
                )}
            </div>
        </motion.div>
    );
};

export default RecommendationMessage;
