import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import {
  ArrowDown, ArrowRight, ArrowUp, BarChart3, Boxes, CalendarDays, FilePlus2, GitBranch, History, IndianRupee, Loader2, Mail, MessageSquare,
  MessageSquarePlus, PackagePlus, Search, ShieldCheck, Sparkles, Trash2, TrendingUp, User, UserPlus, Wallet, X, type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { aiApi, AiChatError } from '../../api/ai/aiApi';
import type { AiBlock, AiCapabilities, AiConversation, AiMessage } from '../../api/ai/aiTypes';
import { AiBlockView, AssistantText, type ActionState } from './AiBlocks';
import './aiCopilot.css';

interface UiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  blocks: AiBlock[];
  error?: boolean;
}

const toUiMessages = (rows: AiMessage[]): UiMessage[] =>
  rows.filter((m) => m.role !== 'tool').map((m) => ({ id: m.id, role: m.role as 'user' | 'assistant', content: m.content, blocks: m.blocks ?? [], error: m.responseType === 'error' }));
const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');
const SCOPE_LABELS: Record<string, string> = {
  organization: 'Organization',
  sub_organization: 'Sub-organization',
  branch: 'Branch',
  sales_representative: 'My portfolio',
  staff: 'Organization (role-limited)',
};

const QUICK_ACTION_STYLES: { match: RegExp; icon: LucideIcon; tint: string }[] = [
  { match: /today/i, icon: CalendarDays, tint: 'from-violet-500 to-purple-600 shadow-violet-500/30' },
  { match: /revenue|monthly/i, icon: TrendingUp, tint: 'from-emerald-400 to-teal-600 shadow-emerald-500/30' },
  { match: /pending|payment due|outstanding/i, icon: Wallet, tint: 'from-amber-400 to-orange-500 shadow-amber-500/30' },
  { match: /reminder/i, icon: Mail, tint: 'from-rose-400 to-pink-600 shadow-rose-500/30' },
  { match: /email|report/i, icon: Mail, tint: 'from-sky-400 to-blue-600 shadow-sky-500/30' },
  { match: /product/i, icon: PackagePlus, tint: 'from-indigo-400 to-indigo-600 shadow-indigo-500/30' },
  { match: /lead|client|customer/i, icon: UserPlus, tint: 'from-fuchsia-400 to-fuchsia-600 shadow-fuchsia-500/30' },
  { match: /stock|inventory/i, icon: Boxes, tint: 'from-orange-400 to-red-500 shadow-orange-500/30' },
  { match: /branch/i, icon: GitBranch, tint: 'from-teal-400 to-cyan-600 shadow-teal-500/30' },
  { match: /sale|invoice/i, icon: IndianRupee, tint: 'from-violet-500 to-purple-700 shadow-violet-500/30' },
  { match: /create|add|new/i, icon: FilePlus2, tint: 'from-indigo-400 to-violet-600 shadow-indigo-500/30' },
];
const quickActionStyle = (label: string) =>
  QUICK_ACTION_STYLES.find((s) => s.match.test(label)) ?? { icon: BarChart3, tint: 'from-slate-400 to-slate-600 shadow-slate-500/30' };

const THINKING_STEPS = ['Understanding your question…', 'Reading your CRM data…', 'Crunching the numbers…', 'Preparing your answer…'];
const SPRING = { type: 'spring', stiffness: 280, damping: 26 } as const;

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const dayBucket = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = (startOf(today) - startOf(d)) / 86_400_000;
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return 'Previous 7 days';
  return 'Older';
};

const BotAvatar = ({ size = 'md', active = false }: { size?: 'md' | 'lg'; active?: boolean }) => (
  <div className={`relative shrink-0 ${size === 'lg' ? 'w-20 h-20 rounded-3xl' : 'w-8 h-8 rounded-xl'}`}>
    {active && <span className="ai-orb-ring" />}
    <div className={`relative w-full h-full rounded-[inherit] bg-gradient-to-br from-[#33077C] via-[#6D28D9] to-[#C026D3] text-white flex items-center justify-center shadow-lg shadow-[#33077C]/30 ${active ? 'ring-2 ring-white' : 'ring-1 ring-white/60'}`}>
      <Sparkles className={size === 'lg' ? 'w-9 h-9' : 'w-4 h-4'} />
    </div>
  </div>
);

function ThinkingIndicator() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, THINKING_STEPS.length - 1)), 1800);
    return () => clearInterval(t);
  }, []);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={SPRING} className="flex gap-3 items-start">
      <BotAvatar active />
      <div className="rounded-2xl rounded-tl-md bg-white/90 backdrop-blur border border-violet-100 px-4 py-3 shadow-[0_10px_30px_-14px_rgba(51,7,124,0.25)] flex items-center gap-3">
        <div className="flex items-end gap-1 h-4">
          {[0, 1, 2].map((d) => (
            <motion.span key={d} className="w-1.5 rounded-full bg-gradient-to-t from-[#33077C] to-fuchsia-500"
              animate={{ height: ['30%', '100%', '30%'] }} transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.15, ease: 'easeInOut' }} />
          ))}
        </div>
        <div className="relative h-4 overflow-hidden min-w-[180px]">
          <AnimatePresence mode="wait">
            <motion.span key={step} initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} transition={{ duration: 0.3 }}
              className="absolute inset-0 text-xs font-medium ai-shimmer-text whitespace-nowrap">
              {THINKING_STEPS[step]}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

const HistorySkeleton = () => (
  <div className="max-w-4xl mx-auto space-y-5">
    {[60, 85, 45].map((w, i) => (
      <div key={i} className={`flex gap-3 ${i % 2 === 0 ? 'justify-end' : ''}`}>
        {i % 2 === 1 && <div className="w-8 h-8 rounded-xl ai-skeleton" />}
        <div className="space-y-2" style={{ width: `${w}%` }}>
          <div className="h-4 rounded-md ai-skeleton" />
          {i % 2 === 1 && <><div className="h-4 rounded-md ai-skeleton w-4/5" /><div className="h-24 rounded-xl ai-skeleton" /></>}
        </div>
      </div>
    ))}
  </div>
);

export const AiCopilotView: React.FC = () => {
  const [capabilities, setCapabilities] = useState<AiCapabilities | null>(null);
  const [capError, setCapError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [actionStates, setActionStates] = useState<Record<string, ActionState>>({});
  const [showJump, setShowJump] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const refreshConversations = useCallback(async () => {
    try { setConversations(await aiApi.listConversations()); } catch { /* history is optional */ }
  }, []);

  useEffect(() => {
    aiApi.capabilities().then(setCapabilities).catch((e) => setCapError(errorMessage(e)));
    refreshConversations();
    return () => abortRef.current?.abort();
  }, [refreshConversations]);

  const scrollToBottom = () => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });

  useEffect(() => { scrollToBottom(); }, [messages, sending]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) setShowJump(el.scrollHeight - el.scrollTop - el.clientHeight > 240);
  };

  const openConversation = async (id: string) => {
    setHistoryOpen(false);
    if (id === conversationId) return;
    setLoadingHistory(true);
    try {
      const rows = await aiApi.getMessages(id);
      setConversationId(id);
      setMessages(toUiMessages(rows));
      setActionStates({});
    } catch (e) {
      toast.error('Could not load conversation', { description: errorMessage(e) });
    } finally {
      setLoadingHistory(false);
    }
  };

  const newConversation = () => {
    abortRef.current?.abort();
    setConversationId(null);
    setMessages([]);
    setActionStates({});
    setHistoryOpen(false);
    inputRef.current?.focus();
  };

  const removeConversation = async (id: string) => {
    try {
      await aiApi.deleteConversation(id);
      if (id === conversationId) newConversation();
      setConversations((list) => list.filter((c) => c.id !== id));
    } catch (e) {
      toast.error('Could not delete conversation', { description: errorMessage(e) });
    }
  };

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || sending) return;
    setInput('');
    setMessages((m) => [...m, { id: `local-${Date.now()}`, role: 'user', content: message, blocks: [] }]);
    setSending(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await aiApi.chat(message, conversationId, controller.signal);
      const isNew = res.conversation_id !== conversationId;
      setConversationId(res.conversation_id);
      setMessages((m) => [...m, { id: res.message_id, role: 'assistant', content: res.message, blocks: res.data.blocks }]);
      if (isNew) refreshConversations();
    } catch (e) {
      if (controller.signal.aborted) return;
      const failedIn = e instanceof AiChatError ? e.conversationId : null;
      if (failedIn) {
        // The server saved the message and the failure (plus any confirmations made before it): stay in that
        // conversation, show what the server stored, and list it in the history.
        setConversationId(failedIn);
        refreshConversations();
        try {
          setMessages(toUiMessages(await aiApi.getMessages(failedIn)));
          return;
        } catch { /* fall back to the local error below */ }
      }
      setMessages((m) => [...m, { id: `err-${Date.now()}`, role: 'assistant', content: errorMessage(e), blocks: [], error: true }]);
    } finally {
      setSending(false);
    }
  };

  const confirm = async (actionId: string) => {
    setActionStates((s) => ({ ...s, [actionId]: { status: 'working' } }));
    try {
      const res = await aiApi.confirmAction(actionId);
      setActionStates((s) => ({ ...s, [actionId]: { status: res.success ? 'succeeded' : 'failed', message: res.message } }));
      setMessages((m) => [...m, { id: `act-${actionId}`, role: 'assistant', content: res.message, blocks: res.data?.blocks ?? [], error: !res.success }]);
      if (res.success) toast.success(res.message);
      else toast.error('Action failed', { description: res.message });
    } catch (e) {
      setActionStates((s) => ({ ...s, [actionId]: { status: 'failed', message: errorMessage(e) } }));
      toast.error('Could not confirm', { description: errorMessage(e) });
    }
  };

  const cancel = async (actionId: string) => {
    setActionStates((s) => ({ ...s, [actionId]: { status: 'working' } }));
    try {
      await aiApi.cancelAction(actionId);
      setActionStates((s) => ({ ...s, [actionId]: { status: 'cancelled' } }));
    } catch (e) {
      setActionStates((s) => ({ ...s, [actionId]: { status: 'failed', message: errorMessage(e) } }));
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const disabled = capabilities ? !capabilities.enabled : false;
  const maxChars = capabilities?.limits.messageChars ?? 4000;

  const scopeLabel = capabilities ? `${SCOPE_LABELS[capabilities.scope.level] ?? capabilities.scope.level} · ${capabilities.scope.organizationName}` : null;
  const filtered = conversations.filter((c) => c.title.toLowerCase().includes(search.trim().toLowerCase()));
  const grouped = filtered.reduce<Record<string, AiConversation[]>>((acc, c) => {
    const key = dayBucket(c.lastMessageAt ?? c.createdAt);
    (acc[key] ??= []).push(c);
    return acc;
  }, {});
  const canSend = !disabled && !sending && !!input.trim();

  // Rendered in both the desktop aside and the mobile drawer; `variant` keeps their shared-layout ids apart.
  const historyPanel = (variant: 'desktop' | 'mobile') => (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50 to-violet-50/40">
      <div className="p-3 space-y-2.5 border-b border-slate-200/70">
        <div className="flex items-center justify-between lg:hidden">
          <span className="text-sm font-bold text-slate-800">Chat history</span>
          <button type="button" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/60" onClick={() => setHistoryOpen(false)} aria-label="Close history"><X className="w-4 h-4" /></button>
        </div>
        <motion.button type="button" onClick={newConversation} whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}
          className="group relative w-full overflow-hidden flex items-center justify-center gap-2 rounded-xl ai-gradient-flow text-white text-sm font-semibold py-2.5 shadow-lg shadow-[#33077C]/25 hover:shadow-xl hover:shadow-[#33077C]/35 transition-shadow">
          <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          <MessageSquarePlus className="relative w-4 h-4 group-hover:rotate-12 transition-transform" /> <span className="relative">New chat</span>
        </motion.button>
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chats"
            className="w-full rounded-lg border border-slate-200 bg-white/80 pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#33077C]/15 focus:border-[#33077C]/40 transition-shadow" />
        </div>
      </div>
      <div className="ai-scroll flex-1 overflow-y-auto p-2">
        {conversations.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center text-center px-4 py-10">
            <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 text-violet-400 flex items-center justify-center mb-2 ai-float"><MessageSquare className="w-5 h-5" /></div>
            <p className="text-xs font-semibold text-slate-600">No conversations yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Your chats will appear here.</p>
          </motion.div>
        )}
        {conversations.length > 0 && filtered.length === 0 && <p className="text-xs text-slate-400 text-center py-6">No chats match “{search}”.</p>}
        {['Today', 'Yesterday', 'Previous 7 days', 'Older'].filter((k) => grouped[k]).map((group) => (
          <div key={group} className="mb-3">
            <div className="px-2.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{group}</div>
            <AnimatePresence initial={true}>
              {grouped[group].map((c, i) => {
                const active = c.id === conversationId;
                return (
                  <motion.div key={c.id} layout
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24, height: 0, transition: { duration: 0.2 } }}
                    transition={{ ...SPRING, delay: Math.min(i, 10) * 0.025 }}
                    className={`group relative flex items-center rounded-lg mb-0.5 transition-colors ${active ? '' : 'hover:bg-white/80'}`}>
                    {active && (
                      <motion.div layoutId={`ai-active-chat-${variant}`} transition={SPRING}
                        className="absolute inset-0 rounded-lg bg-white shadow-sm ring-1 ring-[#33077C]/15">
                        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-gradient-to-b from-[#33077C] to-fuchsia-500" />
                      </motion.div>
                    )}
                    <button type="button" onClick={() => openConversation(c.id)} className="relative flex-1 min-w-0 text-left pl-3.5 pr-2 py-2">
                      <div className={`text-xs font-semibold truncate transition-colors ${active ? 'text-[#33077C]' : 'text-slate-700 group-hover:text-slate-900'}`}>{c.title}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{new Date(c.lastMessageAt ?? c.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</div>
                    </button>
                    <button type="button" onClick={() => removeConversation(c.id)} className="relative p-1.5 mr-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity" aria-label="Delete conversation">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-full space-y-4 pb-6 font-sans">
        {capError && <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-sm text-rose-800">AI Copilot is unavailable: {capError}</div>}
        {disabled && <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-800">The AI assistant is not configured on the server yet.</div>}

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="relative bg-white rounded-3xl border border-slate-200/80 shadow-[0_20px_50px_-24px_rgba(51,7,124,0.25)] overflow-hidden grid grid-cols-1 lg:grid-cols-[280px_1fr] h-[calc(100vh-8.5rem)] min-h-[520px]">
          <aside className="hidden lg:block border-r border-slate-200/70 overflow-hidden">{historyPanel('desktop')}</aside>
          <AnimatePresence>
            {historyOpen && (
              <div className="fixed inset-0 z-50 lg:hidden flex">
                <motion.div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={() => setHistoryOpen(false)}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
                <motion.div className="relative w-80 max-w-[85%] h-full shadow-2xl bg-white"
                  initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}>
                  {historyPanel('mobile')}
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <section className="flex flex-col min-w-0 overflow-hidden">
            {/* Header */}
            <header className="relative z-10 flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-slate-200/70 bg-gradient-to-r from-white via-white to-violet-50/60 backdrop-blur">
              <div className="flex items-center gap-3 min-w-0">
                <button type="button" className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100" onClick={() => setHistoryOpen(true)} aria-label="Open history"><History className="w-4 h-4" /></button>
                <div className="relative">
                  <BotAvatar active={sending} />
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white ${disabled || capError ? 'bg-slate-300' : 'bg-emerald-500 ai-ping'}`} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    AI Copilot
                    <span className="ai-gradient-flow text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md text-white shadow-sm shadow-violet-500/30">Beta</span>
                  </h1>
                  <div className="relative h-4 overflow-hidden">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.p key={sending ? 'busy' : 'idle'} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} transition={{ duration: 0.25 }}
                        className={`text-[11px] truncate ${sending ? 'ai-shimmer-text font-medium' : 'text-slate-500'}`}>
                        {sending ? 'Thinking…' : 'Your CRM assistant for sales, leads, payments & stock'}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                </div>
              </div>
              {scopeLabel && (
                <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                  className="hidden md:flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-emerald-50/70 px-3 py-1.5 text-[11px] font-medium text-emerald-800 shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> {scopeLabel}
                </motion.div>
              )}
            </header>

            {/* Messages */}
            <div className="relative flex-1 min-h-0 bg-slate-50/50">
              <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                <div className="ai-aurora-blob w-80 h-80 -top-24 -left-16 bg-violet-400/25" />
                <div className="ai-aurora-blob w-72 h-72 -top-10 right-0 bg-fuchsia-300/20" style={{ animationDelay: '-6s' }} />
                <div className="ai-aurora-blob w-96 h-96 -bottom-40 left-1/3 bg-sky-300/15" style={{ animationDelay: '-12s' }} />
              </div>

              <div ref={scrollRef} onScroll={onScroll} className="ai-scroll absolute inset-0 overflow-y-auto px-3 sm:px-6 py-6 space-y-6">
                {loadingHistory && <HistorySkeleton />}

                {!loadingHistory && messages.length === 0 && (
                  <div className="max-w-3xl mx-auto text-center pt-4 sm:pt-8 pb-4">
                    <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 14 }}
                      className="relative inline-block ai-float">
                      <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-[#33077C] via-violet-500 to-fuchsia-500 blur-2xl opacity-40 animate-pulse" />
                      <div className="absolute -inset-1.5 rounded-[1.9rem] overflow-hidden opacity-70"><span className="ai-orb-ring" style={{ animationDuration: '6s', inset: '-50%' }} /></div>
                      <div className="relative"><BotAvatar size="lg" /></div>
                    </motion.div>
                    <motion.h2 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }}
                      className="mt-6 text-2xl sm:text-3xl font-extrabold tracking-tight ai-gradient-flow bg-clip-text text-transparent">
                      {greeting()}! How can I help today?
                    </motion.h2>
                    <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.5 }}
                      className="text-sm text-slate-500 mt-2 max-w-xl mx-auto">
                      Ask about sales, leads, customers, payments and stock — or ask me to create records and send emails. <span className="font-semibold text-slate-700">You confirm every change.</span>
                    </motion.p>

                    {(capabilities?.quickActions?.length ?? 0) > 0 && (
                      <motion.div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 mt-8 text-left"
                        initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.35 } } }}>
                        {capabilities!.quickActions.map((q) => {
                          const { icon: Icon, tint } = quickActionStyle(q.label);
                          return (
                            <motion.button key={q.label} type="button" disabled={disabled || sending} onClick={() => send(q.prompt)} title={q.prompt}
                              variants={{ hidden: { opacity: 0, y: 18, scale: 0.95 }, show: { opacity: 1, y: 0, scale: 1, transition: SPRING } }}
                              whileHover={{ y: -4 }} whileTap={{ scale: 0.97 }}
                              className="group relative overflow-hidden flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur p-3.5 shadow-sm hover:shadow-xl hover:shadow-violet-500/10 hover:border-violet-300/70 transition-[box-shadow,border-color] disabled:opacity-50 disabled:pointer-events-none">
                              <span className="absolute inset-0 bg-gradient-to-br from-violet-50/0 to-fuchsia-50/0 group-hover:from-violet-50 group-hover:to-fuchsia-50/60 transition-colors duration-300" />
                              <span className={`relative w-9 h-9 rounded-xl flex items-center justify-center text-white bg-gradient-to-br shadow-md ${tint} group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300`}><Icon className="w-4 h-4" /></span>
                              <span className="relative flex items-end justify-between gap-2">
                                <span className="text-xs sm:text-[13px] font-semibold text-slate-800 group-hover:text-[#33077C] leading-snug transition-colors">{q.label}</span>
                                <ArrowRight className="w-3.5 h-3.5 shrink-0 text-[#6D28D9] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                              </span>
                            </motion.button>
                          );
                        })}
                      </motion.div>
                    )}
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-6 inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                      <ShieldCheck className="w-3.5 h-3.5" /> Answers use live CRM data limited to what your account can access.
                    </motion.p>
                  </div>
                )}

                {!loadingHistory && messages.map((m) => (
                  <motion.div key={m.id}
                    initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={SPRING}
                    style={{ transformOrigin: m.role === 'user' ? 'bottom right' : 'top left' }}
                    className={`flex gap-3 max-w-5xl mx-auto ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.role === 'assistant' && <div className="mt-0.5"><BotAvatar /></div>}
                    <div className={`min-w-0 ${m.role === 'user' ? 'max-w-[85%] sm:max-w-[70%]' : 'flex-1 max-w-4xl'} space-y-3`}>
                      {m.role === 'user' ? (
                        <div className="bg-gradient-to-br from-[#33077C] via-[#5B21B6] to-[#7C3AED] text-white rounded-2xl rounded-tr-md px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-lg shadow-[#33077C]/20">{m.content}</div>
                      ) : (
                        <>
                          {m.content && (
                            <div className={`rounded-2xl rounded-tl-md px-4 sm:px-5 py-3.5 border backdrop-blur ${m.error ? 'bg-rose-50/95 border-rose-200' : 'bg-white/95 border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_30px_-14px_rgba(51,7,124,0.18)]'}`}>
                              <AssistantText text={m.content} error={m.error} />
                            </div>
                          )}
                          {m.blocks.map((b, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay: 0.12 + i * 0.1 }}>
                              <AiBlockView block={b} actionStates={actionStates} onConfirm={confirm} onCancel={cancel} />
                            </motion.div>
                          ))}
                        </>
                      )}
                    </div>
                    {m.role === 'user' && <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-500 flex items-center justify-center shrink-0 mt-0.5 shadow-sm"><User className="w-4 h-4" /></div>}
                  </motion.div>
                ))}

                <AnimatePresence>{sending && <div className="max-w-5xl mx-auto"><ThinkingIndicator /></div>}</AnimatePresence>
              </div>

              <AnimatePresence>
                {showJump && (
                  <motion.button type="button" onClick={scrollToBottom} aria-label="Scroll to latest"
                    initial={{ opacity: 0, y: 10, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.8 }}
                    whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-9 h-9 rounded-full bg-white border border-violet-200 text-[#5B21B6] shadow-lg shadow-violet-500/20 flex items-center justify-center">
                    <ArrowDown className="w-4 h-4" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Composer */}
            <div className="relative z-10 px-3 sm:px-6 pb-4 pt-3 bg-white/90 backdrop-blur border-t border-slate-200/70">
              <div className={`max-w-4xl mx-auto rounded-2xl p-[1.5px] ${disabled ? 'bg-slate-200' : 'ai-composer'}`}>
                <div className={`rounded-[9px] ${disabled ? 'bg-slate-50' : 'bg-white'}`}>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value.slice(0, maxChars))}
                    onKeyDown={onKeyDown}
                    rows={2}
                    disabled={disabled}
                    placeholder={'Ask anything… e.g. "Show today\'s sales for my branch" or "Create a lead named Kumar, 9876543210"'}
                    className="block w-full resize-none bg-transparent px-4 pt-3 pb-1 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed"
                  />
                  <div className="flex items-center justify-between gap-2 px-3 pb-2.5">
                    <span className="text-[10px] text-slate-400 hidden sm:inline-flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-violet-400" />
                      <kbd className="px-1 py-0.5 rounded border border-slate-200 bg-slate-50 font-sans">Enter</kbd> to send · <kbd className="px-1 py-0.5 rounded border border-slate-200 bg-slate-50 font-sans">Shift + Enter</kbd> new line
                    </span>
                    <div className="flex items-center gap-2 ml-auto">
                      {input.length > maxChars * 0.8 && <span className="text-[10px] tabular-nums text-slate-400">{input.length}/{maxChars}</span>}
                      <motion.button type="button" onClick={() => send(input)} disabled={!canSend} aria-label="Send"
                        whileHover={canSend ? { scale: 1.08 } : undefined} whileTap={canSend ? { scale: 0.9 } : undefined}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-[box-shadow,background-color,color] duration-300 ${canSend ? 'ai-gradient-flow text-white shadow-lg shadow-[#33077C]/30' : sending ? 'bg-violet-100 text-[#6D28D9]' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.span key={sending ? 'busy' : 'idle'} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} transition={{ duration: 0.15 }}>
                            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4.5 h-4.5" />}
                          </motion.span>
                        </AnimatePresence>
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-center text-[10px] text-slate-400 mt-2">AI can make mistakes. Figures come from your CRM data — please verify important details.</p>
            </div>
          </section>
        </motion.div>
      </div>
    </MotionConfig>
  );
};

export default AiCopilotView;
