import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import {
  ArrowDown, ArrowUp, ArrowUpRight, BellRing, BarChart3, Boxes, CalendarDays, ChevronDown, ChevronRight, Clock, Copy, FilePlus2, GitBranch, History, IndianRupee, Info,
  Loader2, ListChecks, Mail, MessageSquare, PackagePlus, Paperclip, PlusCircle, Search, ShieldCheck, Sparkles, Star, Trash2, TrendingUp, UserPlus, Target, Truck, Wallet, X, Zap, type LucideIcon,
} from 'lucide-react';
import { toast } from "../../utils/toast";
import { useAuthStore } from '../../store/useAuthStore';
import { aiApi, AiActionError, AiChatError } from '../../api/ai/aiApi';
import type { AiAgentTrace, AiBlock, AiCapabilities, AiChatAnalysis, AiConversation, AiMessage, AiTaskView } from '../../api/ai/aiTypes';
import { AiBlockView, AssistantText, type ActionState } from './AiBlocks';
import { AgentPanel, AnalysisChips, AnalysisFooter, isNoticeAnalysis } from './AiAgentPanel';
import { TaskPanel, TaskRow, isTaskFinished } from './AiTaskPanel';
import { CopilotRobot } from './CopilotRobot';

interface UiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  blocks: AiBlock[];
  /** Images the user attached to this message (data URIs, this session only). */
  images?: string[];
  error?: boolean;
  /** ISO time shown under the message. */
  at?: string;
  /** Agent trace from the live /chat response (not stored with history). */
  agent?: AiAgentTrace;
  /** How the server understood/checked the answer (live responses only). */
  analysis?: AiChatAnalysis;
  /** The user message that produced this reply, for "Try again". */
  prompt?: string;
}

const toUiMessages = (rows: AiMessage[]): UiMessage[] =>
  rows.filter((m) => m.role !== 'tool').map((m) => ({ id: m.id, role: m.role as 'user' | 'assistant', content: m.content, blocks: m.blocks ?? [], error: m.responseType === 'error', at: m.createdAt }));
const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');
const nowIso = () => new Date().toISOString();
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const SCOPE_LABELS: Record<string, string> = {
  organization: 'Organization',
  sub_organization: 'Sub-organization',
  branch: 'Branch',
  manager: 'Manager',
  sales_representative: 'My portfolio',
  staff: 'My records',
};

/** Cards in an old conversation: ask the server which proposed actions were already confirmed/cancelled/expired. */
const pendingActionIds = (rows: UiMessage[]): string[] => {
  const ids = new Set<string>();
  rows.forEach((m) => m.blocks.forEach((b) => {
    if ((b.type === 'confirmation' || b.type === 'email_preview') && b.actionId) ids.add(b.actionId);
  }));
  return [...ids].slice(-20);
};

/* ------------------------------------------------------------------------------------------------
 * Favourite chats are a per-browser convenience (the API has no favourites endpoint), kept in localStorage.
 * ---------------------------------------------------------------------------------------------- */

const FAV_KEY = 'yaa_ai_copilot_favorites';
const TIP_KEY = 'yaa_ai_copilot_fav_tip_dismissed';
const loadFavorites = (): string[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((x) => typeof x === 'string') : [];
  } catch { return []; }
};
const saveFavorites = (ids: string[]) => { try { localStorage.setItem(FAV_KEY, JSON.stringify(ids)); } catch { /* storage unavailable */ } };

/* ------------------------------------------------------------------------------------------------
 * Quick actions: icon + colour per action, and friendly categories for the "Try Asking" tabs.
 * ---------------------------------------------------------------------------------------------- */

type Category = 'Sales' | 'Payments' | 'Customers' | 'Inventory' | 'Reports' | 'General';
const CATEGORY_ORDER: Category[] = ['Sales', 'Payments', 'Customers', 'Inventory', 'Reports', 'General'];

const categoryOf = (q: { label: string; prompt: string }): Category => {
  const t = `${q.label} ${q.prompt}`;
  if (/e-?mail|report/i.test(t)) return 'Reports';
  if (/payment|pending|receivable|payable|\bdues?\b|reminder|outstanding/i.test(t)) return 'Payments';
  if (/sale|revenue|invoice|branch/i.test(t)) return 'Sales';
  if (/customer|lead|supplier|client/i.test(t)) return 'Customers';
  if (/stock|product|inventory/i.test(t)) return 'Inventory';
  return 'General';
};

/** One icon per kind of action (first match wins; checked on the label only). */
const ACTION_ICONS: { match: RegExp; icon: LucideIcon }[] = [
  { match: /payable|pending|payment|\bdues?\b|outstanding/i, icon: Wallet },
  { match: /supplier|vendor/i, icon: Truck },
  { match: /reminder/i, icon: BellRing },
  { match: /e-?mail|report/i, icon: Mail },
  { match: /lead/i, icon: Target },
  { match: /customer|client/i, icon: UserPlus },
  { match: /stock|inventory/i, icon: Boxes },
  { match: /product|item/i, icon: PackagePlus },
  { match: /branch/i, icon: GitBranch },
  { match: /revenue|monthly|trend/i, icon: TrendingUp },
  { match: /sale|invoice/i, icon: IndianRupee },
  { match: /today/i, icon: CalendarDays },
  { match: /create|add|new/i, icon: FilePlus2 },
];
const actionIcon = (label: string): LucideIcon => ACTION_ICONS.find((x) => x.match.test(label))?.icon ?? BarChart3;

/** Colour per category: gradient (tiles), soft (icon chip), chip (category tag). Colour identifies the area at a glance. */
const CATEGORY_STYLE: Record<Category, { grad: string; shadow: string; soft: string; chip: string }> = {
  Sales: { grad: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/30', soft: 'bg-violet-100 text-violet-700', chip: 'bg-violet-50 text-violet-700 ring-violet-200' },
  Payments: { grad: 'from-amber-400 to-orange-500', shadow: 'shadow-amber-500/30', soft: 'bg-amber-100 text-amber-700', chip: 'bg-amber-50 text-amber-700 ring-amber-200' },
  Customers: { grad: 'from-fuchsia-500 to-pink-500', shadow: 'shadow-fuchsia-500/30', soft: 'bg-fuchsia-100 text-fuchsia-700', chip: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200' },
  Inventory: { grad: 'from-emerald-400 to-teal-500', shadow: 'shadow-emerald-500/30', soft: 'bg-emerald-100 text-emerald-700', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  Reports: { grad: 'from-sky-400 to-blue-500', shadow: 'shadow-sky-500/30', soft: 'bg-sky-100 text-sky-700', chip: 'bg-sky-50 text-sky-700 ring-sky-200' },
  General: { grad: 'from-slate-400 to-slate-600', shadow: 'shadow-slate-500/25', soft: 'bg-slate-100 text-slate-600', chip: 'bg-slate-50 text-slate-600 ring-slate-200' },
};

const THINKING_STEPS = ['Understanding your question…', 'Reading your CRM data…', 'Crunching the numbers…', 'Preparing your answer…'];
const SPRING = { type: 'spring', stiffness: 300, damping: 28 } as const;

const dayBucket = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = (startOf(today) - startOf(d)) / 86_400_000;
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return 'Last 7 Days';
  return 'Older';
};
const GROUPS = ['Today', 'Yesterday', 'Last 7 Days', 'Older'];

const fmtTime = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
/** Sidebar caption: time for today's chats, otherwise the date. */
const fmtListWhen = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return dayBucket(iso) === 'Today' ? fmtTime(iso) : d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

const BotAvatar = ({ active = false }: { active?: boolean }) => (
  <div className="relative shrink-0 w-9 h-9 rounded-xl">
    {active && <span className="ai-orb-ring" />}
    <div className={`relative w-full h-full rounded-[inherit] bg-gradient-to-br from-[#33077C] via-[#6D28D9] to-[#C026D3] text-white flex items-center justify-center shadow-md shadow-[#33077C]/25 ${active ? 'ring-2 ring-white' : ''}`}>
      <Sparkles className="w-4 h-4" />
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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={SPRING} className="flex gap-3 items-start">
      <BotAvatar active />
      <div className="rounded-[18px] rounded-tl-md bg-white border border-violet-100 px-4 py-3 shadow-sm flex items-center gap-3">
        <div className="flex items-end gap-1 h-4">
          {[0, 1, 2].map((d) => (
            <motion.span key={d} className="w-1.5 rounded-full bg-gradient-to-t from-[#33077C] to-fuchsia-500"
              animate={{ height: ['30%', '100%', '30%'] }} transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.15, ease: 'easeInOut' }} />
          ))}
        </div>
        <div className="relative h-4 overflow-hidden min-w-[170px]">
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
  <div className="max-w-3xl mx-auto space-y-5">
    {[60, 85, 45].map((w, i) => (
      <div key={i} className={`flex gap-3 ${i % 2 === 0 ? 'justify-end' : ''}`}>
        {i % 2 === 1 && <div className="w-9 h-9 rounded-xl ai-skeleton" />}
        <div className="space-y-2" style={{ width: `${w}%` }}>
          <div className="h-4 rounded-md ai-skeleton" />
          {i % 2 === 1 && <><div className="h-4 rounded-md ai-skeleton w-4/5" /><div className="h-24 rounded-xl ai-skeleton" /></>}
        </div>
      </div>
    ))}
  </div>
);

export const AiCopilotView: React.FC = () => {
  const currentUser = useAuthStore((s) => s.currentUser);
  const firstName = (currentUser?.name || '').trim().split(/\s+/)[0] || '';

  const [capabilities, setCapabilities] = useState<AiCapabilities | null>(null);
  const [capError, setCapError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'history' | 'favorites' | 'tasks'>('history');
  // Saved multi-step tasks (the backend returns them in `agent.task`; /ai/tasks lists them). Hidden when the server has none.
  const [taskStates, setTaskStates] = useState<Record<string, AiTaskView>>({});
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [taskBusy, setTaskBusy] = useState<Record<string, boolean>>({});
  const [tasks, setTasks] = useState<AiTaskView[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksDisabled, setTasksDisabled] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const [tipDismissed, setTipDismissed] = useState(() => { try { return localStorage.getItem(TIP_KEY) === '1'; } catch { return false; } });
  const [category, setCategory] = useState<Category | 'All'>('All');
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

  // The composer grows with the text (up to ~6 lines) and shrinks back after sending.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) setShowJump(el.scrollHeight - el.scrollTop - el.clientHeight > 240);
  };

  const toggleFavorite = (id: string) => {
    setFavorites((cur) => {
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      saveFavorites(next);
      return next;
    });
  };

  const dismissTip = () => {
    setTipDismissed(true);
    try { localStorage.setItem(TIP_KEY, '1'); } catch { /* ignore */ }
  };

  const addCurrentToFavorites = () => {
    if (!conversationId) {
      toast.info('Open a chat, then tap its star to add it to Favorites.');
      return;
    }
    if (!favorites.includes(conversationId)) toggleFavorite(conversationId);
    setTab('favorites');
  };

  const restoreActionStates = async (rows: UiMessage[]) => {
    const ids = pendingActionIds(rows);
    if (!ids.length) return;
    const settled = await Promise.allSettled(ids.map((id) => aiApi.getAction(id)));
    const next: Record<string, ActionState> = {};
    settled.forEach((r, i) => {
      if (r.status !== 'fulfilled') return;
      const { status, message } = r.value;
      if (status === 'succeeded') next[ids[i]] = { status: 'succeeded', message: message ?? 'Done' };
      else if (status === 'failed') next[ids[i]] = { status: 'failed', message: message ?? 'This action failed.' };
      else if (status === 'cancelled') next[ids[i]] = { status: 'cancelled' };
      else if (status === 'expired') next[ids[i]] = { status: 'expired' };
      else if (status === 'partial') next[ids[i]] = { status: 'partial', message: message ?? 'Only part of this was done.' };
      else if (status === 'outcome_unknown') next[ids[i]] = { status: 'unknown', message };
    });
    // Merge: do not clobber a card the user acted on while this was loading.
    setActionStates((cur) => ({ ...next, ...cur }));
  };

  const openConversation = async (id: string) => {
    setHistoryOpen(false);
    if (id === conversationId) return;
    setLoadingHistory(true);
    try {
      const rows = await aiApi.getMessages(id);
      const ui = toUiMessages(rows);
      setConversationId(id);
      setMessages(ui);
      setActionStates({});
      setActiveTaskId(null);
      restoreActionStates(ui);
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
    setActiveTaskId(null);
    setHistoryOpen(false);
    inputRef.current?.focus();
  };

  const removeConversation = async (id: string) => {
    try {
      await aiApi.deleteConversation(id);
      if (id === conversationId) newConversation();
      setConversations((list) => list.filter((c) => c.id !== id));
      setFavorites((cur) => {
        if (!cur.includes(id)) return cur;
        const next = cur.filter((x) => x !== id);
        saveFavorites(next);
        return next;
      });
    } catch (e) {
      toast.error('Could not delete conversation', { description: errorMessage(e) });
    }
  };

  const readImage = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the image'));
    reader.readAsDataURL(file);
  });

  const addImages = async (files: File[]) => {
    const picked: string[] = [];
    for (const file of files) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast.error('Only JPG, PNG or WebP images can be attached'); continue; }
      if (file.size > MAX_IMAGE_BYTES) { toast.error(`${file.name || 'Image'} is larger than 3 MB`); continue; }
      try { picked.push(await readImage(file)); } catch (e) { toast.error(errorMessage(e)); }
    }
    if (picked.length) {
      setAttachments((cur) => {
        if (cur.length + picked.length > MAX_IMAGES) toast.error(`You can attach up to ${MAX_IMAGES} images`);
        return [...cur, ...picked].slice(0, MAX_IMAGES);
      });
    }
  };

  const send = async (text: string) => {
    const images = attachments;
    const message = text.trim() || (images.length ? 'Please look at the attached image.' : '');
    if (!message || sending) return;
    setInput('');
    setAttachments([]);
    setMessages((m) => [...m, { id: `local-${Date.now()}`, role: 'user', content: message, blocks: [], images: images.length ? images : undefined, at: nowIso() }]);
    setSending(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await aiApi.chat(message, conversationId, controller.signal, images);
      const isNew = res.conversation_id !== conversationId;
      setConversationId(res.conversation_id);
      setMessages((m) => [...m, { id: res.message_id, role: 'assistant', content: res.message, blocks: res.data.blocks, agent: res.agent, analysis: res.analysis, prompt: message, at: nowIso() }]);
      applyTask(res.agent?.task, true);
      if (isNew) refreshConversations();
      if (res.agent?.stop_reason === 'needs_input' || res.analysis?.reason === 'needs_clarification') setTimeout(() => inputRef.current?.focus(), 0);
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
      setMessages((m) => [...m, { id: `err-${Date.now()}`, role: 'assistant', content: errorMessage(e), blocks: [], error: true, at: nowIso() }]);
    } finally {
      setSending(false);
    }
  };

  /** Keeps the latest state of a saved task; `makeActive` shows its panel under the conversation. */
  const applyTask = (task?: AiTaskView | null, makeActive = false) => {
    if (!task) return;
    setTaskStates((cur) => ({ ...cur, [task.id]: task }));
    setTasks((list) => (list.some((t) => t.id === task.id) ? list.map((t) => (t.id === task.id ? task : t)) : [task, ...list]));
    if (makeActive) setActiveTaskId(task.id);
  };

  const confirm = async (actionId: string) => {
    setActionStates((s) => ({ ...s, [actionId]: { status: 'working' } }));
    try {
      const res = await aiApi.confirmAction(actionId);
      // succeeded | partial (only part happened) | failed (nothing changed) | outcome_unknown (sent, no answer: may have applied)
      const outcome = res.status ?? (res.success ? 'succeeded' : 'failed');
      const state: ActionState =
        outcome === 'succeeded' ? { status: 'succeeded', message: res.message }
          : outcome === 'partial' ? { status: 'partial', message: res.message }
          : outcome === 'outcome_unknown' ? { status: 'unknown', message: res.message }
          : { status: 'failed', message: res.message };
      setActionStates((s) => ({ ...s, [actionId]: state }));
      setMessages((m) => [...m, { id: `act-${actionId}`, role: 'assistant', content: res.message, blocks: res.data?.blocks ?? [], error: outcome === 'failed', at: nowIso() }]);
      applyTask(res.task, true);
      if (outcome === 'succeeded') toast.success(res.message);
      else if (outcome === 'partial' || outcome === 'outcome_unknown') toast.warning(res.message);
      else toast.error('Action failed', { description: res.message });
    } catch (e) {
      const code = e instanceof AiActionError ? e.code : '';
      if (code === 'ACTION_EXPIRED') {
        setActionStates((s) => ({ ...s, [actionId]: { status: 'expired', message: errorMessage(e) } }));
      } else if (code === 'ACTION_ALREADY_PROCESSED') {
        // Another tab / double click got there first: show the real outcome instead of a scary error.
        try {
          const cur = await aiApi.getAction(actionId);
          setActionStates((s) => ({
            ...s,
            [actionId]:
              cur.status === 'succeeded' ? { status: 'succeeded', message: cur.message ?? 'Already done.' }
                : cur.status === 'partial' ? { status: 'partial', message: cur.message }
                : cur.status === 'outcome_unknown' ? { status: 'unknown', message: cur.message }
                : cur.status === 'cancelled' ? { status: 'cancelled' }
                : { status: 'failed', message: errorMessage(e) },
          }));
        } catch {
          setActionStates((s) => ({ ...s, [actionId]: { status: 'failed', message: errorMessage(e) } }));
        }
      } else {
        setActionStates((s) => ({ ...s, [actionId]: { status: 'failed', message: errorMessage(e) } }));
        toast.error('Could not confirm', { description: errorMessage(e) });
      }
    }
  };

  const cancel = async (actionId: string) => {
    setActionStates((s) => ({ ...s, [actionId]: { status: 'working' } }));
    try {
      const task = await aiApi.cancelAction(actionId);
      setActionStates((s) => ({ ...s, [actionId]: { status: 'cancelled' } }));
      applyTask(task, true);
    } catch (e) {
      const code = e instanceof AiActionError ? e.code : '';
      setActionStates((s) => ({ ...s, [actionId]: code === 'ACTION_EXPIRED' ? { status: 'expired', message: errorMessage(e) } : { status: 'failed', message: errorMessage(e) } }));
    }
  };

  /** After an unknown outcome: only looks the record up. It never runs the change again. */
  const recheck = async (actionId: string) => {
    setActionStates((s) => ({ ...s, [actionId]: { status: 'unknown', message: s[actionId]?.message, busy: true } }));
    try {
      const r = await aiApi.recheckAction(actionId);
      if (r.status === 'succeeded') {
        setActionStates((s) => ({ ...s, [actionId]: { status: 'succeeded', message: r.message || 'Done' } }));
        toast.success(r.message || 'The change was applied.');
      } else {
        setActionStates((s) => ({ ...s, [actionId]: { status: 'unknown', message: r.message || s[actionId]?.message } }));
        toast.info(r.message || 'Not found yet. The server may still be processing it.');
      }
    } catch (e) {
      const code = e instanceof AiActionError ? e.code : '';
      setActionStates((s) => ({ ...s, [actionId]: { status: 'unknown', message: s[actionId]?.message } }));
      if (code === 'ACTION_NOT_UNKNOWN') {
        // Its outcome is known after all: show the real one.
        try {
          const cur = await aiApi.getAction(actionId);
          setActionStates((s) => ({ ...s, [actionId]: cur.status === 'succeeded' ? { status: 'succeeded', message: cur.message ?? 'Done' } : cur.status === 'cancelled' ? { status: 'cancelled' } : { status: 'failed', message: cur.message } }));
        } catch { /* keep what is shown */ }
      }
      toast.error('Could not check', { description: errorMessage(e) });
    }
  };

  /* ---- saved tasks ---- */
  const loadTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const list = await aiApi.listTasks(undefined, 1, 30);
      setTasks(list);
      setTaskStates((cur) => { const next = { ...cur }; list.forEach((t) => { next[t.id] = t; }); return next; });
    } catch (e) {
      // 404 / TASKS_DISABLED: the server has no saved tasks (switched off, or not deployed yet). Hide the whole feature.
      const code = (e as { code?: string })?.code;
      const status = (e as { status?: number })?.status;
      if (code === 'TASKS_DISABLED' || status === 404) setTasksDisabled(true);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);
  useEffect(() => { if (tab === 'tasks') loadTasks(); }, [tab, loadTasks]);
  useEffect(() => { if (tasksDisabled && tab === 'tasks') setTab('history'); }, [tasksDisabled, tab]);

  const handleTaskError = async (taskId: string, e: unknown) => {
    const code = (e as { code?: string })?.code ?? '';
    const msg = errorMessage(e);
    if (code === 'TASKS_DISABLED') {
      setTasksDisabled(true);
      setActiveTaskId(null);
      toast.info(msg);
      return;
    }
    if (code === 'TASK_AWAITING_APPROVAL') {
      toast.info(msg); // the confirmation card is still open: nothing else to do
      return;
    }
    if (code === 'TASK_NOT_FOUND') {
      setTasks((l) => l.filter((t) => t.id !== taskId));
      setActiveTaskId((cur) => (cur === taskId ? null : cur));
      toast.error(msg);
      return;
    }
    toast.error(msg);
    if (['TASK_NOT_RESUMABLE', 'TASK_NOT_CANCELLABLE', 'TASK_IN_PROGRESS', 'TASK_CHANGED', 'AI_SCOPE_DENIED'].includes(code)) {
      try { applyTask(await aiApi.getTask(taskId)); } catch { /* keep what is shown */ }
    }
  };

  /** Continues a task. Only ever runs from a click: the user must see what happens next. */
  const resumeTask = async (taskId: string) => {
    if (sending || taskBusy[taskId]) return;
    setTaskBusy((s) => ({ ...s, [taskId]: true }));
    setSending(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await aiApi.resumeTask(taskId, controller.signal);
      setConversationId(res.conversation_id);
      setMessages((m) => [...m, { id: res.message_id, role: 'assistant', content: res.message, blocks: res.data.blocks, agent: res.agent, analysis: res.analysis, at: nowIso() }]);
      applyTask(res.agent?.task, true);
      if (res.agent?.stop_reason === 'needs_input') setTimeout(() => inputRef.current?.focus(), 0);
    } catch (e) {
      if (!controller.signal.aborted) await handleTaskError(taskId, e);
    } finally {
      setSending(false);
      setTaskBusy((s) => ({ ...s, [taskId]: false }));
    }
  };

  const cancelTask = async (taskId: string) => {
    if (taskBusy[taskId]) return;
    setTaskBusy((s) => ({ ...s, [taskId]: true }));
    try {
      const t = await aiApi.cancelTask(taskId);
      applyTask(t);
      // Its open confirmation cards can no longer be confirmed.
      setActionStates((s) => {
        const next = { ...s };
        t.steps.forEach((st) => {
          if (st.action_id && st.status === 'cancelled' && next[st.action_id]?.status !== 'succeeded') next[st.action_id] = { status: 'cancelled' };
        });
        return next;
      });
      toast.success('Task cancelled');
    } catch (e) {
      await handleTaskError(taskId, e);
    } finally {
      setTaskBusy((s) => ({ ...s, [taskId]: false }));
    }
  };

  /** Opens a task from the Tasks tab: its conversation, with the task panel under it. */
  const openTask = async (task: AiTaskView) => {
    try {
      const detail = await aiApi.getTask(task.id);
      applyTask(detail);
      if (detail.conversation_id) await openConversation(detail.conversation_id);
      setActiveTaskId(detail.id);
      setHistoryOpen(false);
    } catch (e) {
      await handleTaskError(task.id, e);
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Could not copy');
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
  const quickActions = capabilities?.quickActions ?? [];

  const scopeLabel = capabilities ? `${SCOPE_LABELS[capabilities.scope.level] ?? capabilities.scope.level} · ${capabilities.scope.organizationName}` : null;
  const matchesSearch = (c: AiConversation) => c.title.toLowerCase().includes(search.trim().toLowerCase());
  const listed = conversations.filter((c) => matchesSearch(c) && (tab === 'history' || favorites.includes(c.id)));
  const grouped = listed.reduce<Record<string, AiConversation[]>>((acc, c) => {
    const key = dayBucket(c.lastMessageAt ?? c.createdAt);
    (acc[key] ??= []).push(c);
    return acc;
  }, {});
  const canSend = !disabled && !sending && (!!input.trim() || attachments.length > 0);

  // Quick Actions strip = the first five; "Try Asking" = the rest (or everything when there are only a few).
  const primaryActions = quickActions.slice(0, 5);
  const tryActions = quickActions.length > 5 ? quickActions.slice(5) : quickActions;
  const categories = CATEGORY_ORDER.filter((c) => tryActions.some((q) => categoryOf(q) === c));
  const visibleActions = category === 'All' ? tryActions : tryActions.filter((q) => categoryOf(q) === category);
  const lastId = messages[messages.length - 1]?.id;
  const activeTask = activeTaskId ? taskStates[activeTaskId] : undefined;
  const unfinishedTasks = tasks.filter((t) => !isTaskFinished(t.status)).length;
  // Unfinished work first, then the rest; the search box filters by goal.
  const visibleTasks = [...tasks]
    .filter((t) => t.goal.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((x, y) => Number(isTaskFinished(x.status)) - Number(isTaskFinished(y.status)));
  const tabItems: { id: 'history' | 'favorites' | 'tasks'; label: string; icon: LucideIcon }[] = [
    { id: 'history', label: 'History', icon: Clock },
    { id: 'favorites', label: 'Favorites', icon: Star },
    ...(tasksDisabled ? [] : [{ id: 'tasks' as const, label: 'Tasks', icon: ListChecks }]),
  ];
  const showWelcome = !loadingHistory && messages.length === 0;

  const conversationRow = (c: AiConversation) => {
    const active = c.id === conversationId;
    const fav = favorites.includes(c.id);
    return (
      <motion.div key={c.id} layout exit={{ opacity: 0, height: 0, transition: { duration: 0.18 } }}
        className={`group relative flex items-center gap-1 rounded-xl mb-1 transition-colors ${active ? 'bg-violet-100/70' : 'hover:bg-slate-50'}`}>
        <button type="button" onClick={() => openConversation(c.id)} className="flex-1 min-w-0 flex items-center gap-3 text-left pl-2.5 py-2.5">
          <span className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ${active ? 'bg-white text-[#33077C]' : 'bg-violet-50 text-[#6D28D9]'}`}><MessageSquare className="w-4 h-4" /></span>
          <span className="min-w-0">
            <span className={`block text-[13px] font-semibold truncate ${active ? 'text-[#33077C]' : 'text-slate-800'}`}>{c.title}</span>
            <span className="block text-[11px] text-slate-400 mt-0.5">{fmtListWhen(c.lastMessageAt ?? c.createdAt)}</span>
          </span>
        </button>
        <button type="button" onClick={() => toggleFavorite(c.id)} aria-label={fav ? 'Remove from favorites' : 'Add to favorites'} aria-pressed={fav}
          className={`p-1.5 rounded-lg transition-opacity hover:bg-amber-50 ${fav ? 'text-amber-500 opacity-100' : 'text-slate-400 hover:text-amber-500 opacity-0 group-hover:opacity-100 focus:opacity-100'}`}>
          <Star className={`w-3.5 h-3.5 ${fav ? 'fill-amber-400' : ''}`} />
        </button>
        <button type="button" onClick={() => removeConversation(c.id)} aria-label="Delete conversation"
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <ChevronRight className="w-4 h-4 text-slate-300 mr-2 shrink-0 group-hover:hidden" />
      </motion.div>
    );
  };

  // Rendered in both the desktop aside and the mobile drawer.
  const historyPanel = (
    <div className="flex flex-col h-full bg-white">
      <div className="px-4 pt-3 flex items-center justify-between gap-2 border-b border-slate-100">
        <div role="tablist" className="flex gap-4">
          {tabItems.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-1.5 pb-2.5 text-[13px] font-semibold transition-colors ${tab === t.id ? 'text-[#33077C]' : 'text-slate-500 hover:text-slate-800'}`}>
              <t.icon className="w-4 h-4" /> {t.label}
              {t.id === 'tasks' && unfinishedTasks > 0 && (
                <span className="min-w-[18px] rounded-full bg-amber-100 px-1 text-center text-[10px] font-bold leading-[18px] text-amber-800">{unfinishedTasks}</span>
              )}
              {tab === t.id && <motion.span layoutId="ai-sidebar-tab" className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#33077C]" transition={SPRING} />}
            </button>
          ))}
        </div>
        <button type="button" className="lg:hidden mb-2 p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" onClick={() => setHistoryOpen(false)} aria-label="Close history"><X className="w-4 h-4" /></button>
      </div>

      <div className="p-4 space-y-3">
        <button type="button" onClick={newConversation}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4C1D95] hover:bg-[#33077C] text-white text-sm font-semibold py-3 shadow-md shadow-[#33077C]/25 transition-colors active:scale-[0.98]">
          <PlusCircle className="w-4 h-4" /> New Chat
        </button>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chats..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2.5 text-[13px] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#33077C]/15 focus:border-[#33077C]/40 transition" />
        </div>
      </div>

      <div className="ai-scroll flex-1 overflow-y-auto px-3 pb-2">
        {tab === 'history' && conversations.length === 0 && (
          <div className="flex flex-col items-center text-center px-4 py-10">
            <div className="w-11 h-11 rounded-xl bg-violet-50 text-violet-400 flex items-center justify-center mb-2"><MessageSquare className="w-5 h-5" /></div>
            <p className="text-xs font-semibold text-slate-600">No conversations yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Your chats will appear here.</p>
          </div>
        )}
        {tab === 'favorites' && favorites.length === 0 && (
          <div className="flex flex-col items-center text-center px-4 py-10">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-400 flex items-center justify-center mb-2"><Star className="w-5 h-5" /></div>
            <p className="text-xs font-semibold text-slate-600">No favorites yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Tap the star on a chat to pin it here.</p>
          </div>
        )}
        {tab === 'tasks' && (
          <div className="pt-1">
            {tasksLoading && tasks.length === 0 && <div className="flex justify-center py-8 text-[#33077C]"><Loader2 className="w-5 h-5 animate-spin" /></div>}
            {!tasksLoading && visibleTasks.length === 0 && (
              <div className="flex flex-col items-center text-center px-4 py-10">
                <div className="w-11 h-11 rounded-xl bg-violet-50 text-violet-400 flex items-center justify-center mb-2"><ListChecks className="w-5 h-5" /></div>
                <p className="text-xs font-semibold text-slate-600">{search.trim() ? `No tasks match “${search}”.` : 'No saved tasks yet'}</p>
                {!search.trim() && <p className="text-[11px] text-slate-400 mt-0.5">When a request needs several steps, it is saved here so you can continue it later.</p>}
              </div>
            )}
            {visibleTasks.map((t) => (
              <TaskRow key={t.id} task={taskStates[t.id] ?? t} active={t.id === activeTaskId} onOpen={openTask} />
            ))}
          </div>
        )}
        {tab !== 'tasks' && listed.length === 0 && search.trim() && <p className="text-xs text-slate-400 text-center py-6">No chats match “{search}”.</p>}
        {tab !== 'tasks' && GROUPS.filter((k) => grouped[k]).map((group) => (
          <div key={group} className="mb-2">
            <button type="button" onClick={() => setCollapsed((s) => ({ ...s, [group]: !s[group] }))} aria-expanded={!collapsed[group]}
              className="w-full flex items-center justify-between px-1.5 py-2 text-[13px] font-bold text-slate-800">
              {group}
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${collapsed[group] ? '-rotate-90' : ''}`} />
            </button>
            <AnimatePresence initial={false}>{!collapsed[group] && grouped[group].map(conversationRow)}</AnimatePresence>
          </div>
        ))}
      </div>

      {tab === 'history' && !tipDismissed && (
        <div className="relative m-4 mt-1 rounded-2xl bg-violet-50 border border-violet-100 p-3.5">
          <button type="button" onClick={dismissTip} aria-label="Dismiss tip" className="absolute right-2 top-2 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-white/70"><X className="w-3.5 h-3.5" /></button>
          <div className="flex items-start gap-2.5 pr-5">
            <span className="w-8 h-8 shrink-0 rounded-lg bg-white text-[#6D28D9] flex items-center justify-center shadow-sm"><Sparkles className="w-4 h-4" /></span>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900">Save your important chats</div>
              <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">Mark as favorite for quick access</div>
            </div>
          </div>
          <button type="button" onClick={addCurrentToFavorites}
            className="mt-3 mx-auto flex items-center gap-1.5 rounded-full border border-violet-300 bg-white px-4 py-1.5 text-xs font-semibold text-[#5B21B6] hover:bg-violet-100 transition-colors">
            <Star className="w-3 h-3" /> Add to Favorites
          </button>
        </div>
      )}
    </div>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-full pb-4 font-sans">
        <div className="flex gap-4 h-[calc(100vh-8.5rem)] min-h-[600px]">
          {/* Chat history */}
          <aside className="hidden lg:block w-[300px] shrink-0 rounded-[20px] border border-slate-200/80 bg-white shadow-[0_8px_30px_-18px_rgba(51,7,124,0.25)] overflow-hidden">
            {historyPanel}
          </aside>
          <AnimatePresence>
            {historyOpen && (
              <div className="fixed inset-0 z-50 lg:hidden flex">
                <motion.div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={() => setHistoryOpen(false)}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
                <motion.div className="relative w-80 max-w-[88%] h-full shadow-2xl bg-white"
                  initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}>
                  {historyPanel}
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Main */}
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 min-w-0 flex flex-col rounded-[20px] border border-slate-200/80 bg-[#F6F3FD] shadow-[0_8px_30px_-18px_rgba(51,7,124,0.25)] overflow-hidden">
            {/* Compact header (only once a chat is under way; the welcome banner replaces it) */}
            {!showWelcome && (
              <header className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-white border-b border-slate-100">
                <div className="flex items-center gap-3 min-w-0">
                  <button type="button" className="lg:hidden p-2 -ml-1 rounded-lg text-slate-600 hover:bg-slate-100" onClick={() => setHistoryOpen(true)} aria-label="Open chat history"><History className="w-4 h-4" /></button>
                  <BotAvatar active={sending} />
                  <div className="min-w-0">
                    <h1 className="text-sm sm:text-[15px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      Copilot
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-violet-100 text-[#5B21B6]">Beta</span>
                    </h1>
                    <p className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${disabled || capError ? 'bg-slate-300' : 'bg-emerald-500'}`} />
                      {sending ? 'Thinking…' : disabled || capError ? 'Unavailable' : 'Online · ask me anything about your CRM'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {scopeLabel && (
                    <div title={capabilities?.scope.access} className="hidden md:flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/70 px-3 py-1.5 text-[11px] font-medium max-w-[260px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> <span className="truncate">{scopeLabel}</span>
                    </div>
                  )}
                  <button type="button" onClick={newConversation}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 hover:border-[#33077C]/40 hover:bg-violet-50 text-slate-700 hover:text-[#33077C] text-xs font-semibold px-3 py-2 transition-colors">
                    <PlusCircle className="w-3.5 h-3.5" /> <span className="hidden sm:inline">New Chat</span>
                  </button>
                </div>
              </header>
            )}

            {(capError || disabled) && (
              <div className="mx-4 sm:mx-5 mt-3 p-3 rounded-xl text-xs font-medium bg-amber-50 border border-amber-200 text-amber-800">
                {capError ? `AI Copilot is unavailable: ${capError}` : 'The AI assistant is not configured on the server yet.'}
              </div>
            )}

            {/* Content */}
            <div className="relative flex-1 min-h-0">
              <div ref={scrollRef} onScroll={onScroll} className="ai-scroll absolute inset-0 overflow-y-auto px-3 sm:px-5 py-4 sm:py-5 space-y-5">
                {loadingHistory && <HistorySkeleton />}

                {showWelcome && (
                  <>
                    {/* Hero */}
                    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
                      className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#2A0A6B] via-[#4C1D95] to-[#6D28D9] text-white px-5 sm:px-7 pt-4 pb-5 sm:pb-6 shadow-xl shadow-[#33077C]/20">
                      <div className="pointer-events-none absolute -right-16 -top-20 w-80 h-80 rounded-full bg-white/[0.06]" />
                      <div className="pointer-events-none absolute right-40 -bottom-24 w-64 h-64 rounded-full bg-fuchsia-400/10" />
                      <div className="relative flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <button type="button" className="lg:hidden p-2 -ml-2 rounded-lg text-white/80 hover:bg-white/10" onClick={() => setHistoryOpen(true)} aria-label="Open chat history"><History className="w-4 h-4" /></button>
                          <span className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center shadow-lg shadow-black/20 ring-1 ring-white/20"><Sparkles className="w-6 h-6" /></span>
                          <span className="text-2xl font-extrabold tracking-tight">Copilot</span>
                          <span className="rounded-lg bg-white/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">Beta</span>
                        </div>
                        <span className="hidden md:inline-flex items-center gap-2 text-xs text-violet-100 shrink-0 pt-1">
                          <span className={`w-2.5 h-2.5 rounded-full ${disabled || capError ? 'bg-slate-300' : 'bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.25)]'}`} />
                          {disabled || capError ? 'Unavailable' : 'Online • Ask me anything about your CRM'}
                        </span>
                      </div>
                      <div className="relative mt-4 sm:mt-5 sm:max-w-[68%]">
                        <h2 className="text-[26px] sm:text-[30px] 2xl:text-4xl font-extrabold tracking-tight leading-[1.15]">
                          Hello{firstName ? ` ${firstName}` : ''}! <span aria-hidden>👋</span>
                          <br />
                          How can I help <span className="text-[#C4B5FD]">you today?</span>
                        </h2>
                        <p className="mt-2 text-sm text-violet-100/90">Get insights, find data, or perform actions — just ask!</p>
                        {capabilities?.scope.access && (
                          <p title={capabilities.scope.access} className="mt-3 hidden md:inline-flex max-w-full items-center gap-1.5 rounded-full bg-black/20 px-3 py-1 text-[11px] text-violet-100">
                            <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{capabilities.scope.access}</span>
                          </p>
                        )}
                      </div>
                      <CopilotRobot className="pointer-events-none absolute right-0 bottom-0 hidden sm:block w-[30%] max-w-[250px] h-auto" />
                    </motion.div>

                    {/* Quick actions: app-style tiles in a swipeable row */}
                    {primaryActions.length > 0 && (
                      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.4 }}>
                        <div className="mb-2.5 px-1">
                          <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                            <Zap className="w-[18px] h-[18px] text-[#6D28D9] fill-[#6D28D9]/15" /> Quick Actions
                          </h3>
                          <p className="mt-0.5 text-xs text-slate-500">One tap runs it. Swipe for more.</p>
                        </div>
                        <div className="ai-scroll -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pt-1 pb-3">
                          {primaryActions.map((q) => {
                            const Icon = actionIcon(q.label);
                            const cat = CATEGORY_STYLE[categoryOf(q)];
                            return (
                              <button key={q.label} type="button" disabled={disabled || sending} onClick={() => send(q.prompt)} title={q.prompt}
                                className="group snap-start shrink-0 w-[134px] sm:w-[150px] flex flex-col items-center gap-3 rounded-[18px] bg-white border border-slate-200/80 px-3 pt-4 pb-3.5 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-violet-300 hover:shadow-xl hover:shadow-violet-500/15 disabled:opacity-50 disabled:pointer-events-none">
                                <span className={`w-12 h-12 rounded-[14px] bg-gradient-to-br ${cat.grad} text-white flex items-center justify-center shadow-lg ${cat.shadow} transition-transform group-hover:scale-110 group-hover:-rotate-3`}>
                                  <Icon className="w-6 h-6" />
                                </span>
                                <span className="line-clamp-2 min-h-[2.1em] text-[12.5px] font-semibold leading-tight text-slate-800 group-hover:text-[#33077C]">{q.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </motion.section>
                    )}

                    {/* Try asking: colour-coded prompt cards */}
                    {tryActions.length > 0 && (
                      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14, duration: 0.4 }}>
                        <div className="mb-3 flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                              <Sparkles className="w-[18px] h-[18px] text-[#6D28D9]" /> Try Asking
                            </h3>
                            <p className="mt-0.5 text-xs text-slate-500">Pick a question and I will ask it for you.</p>
                          </div>
                          {categories.length > 1 && (
                            <div className="ai-scroll flex max-w-full gap-1 overflow-x-auto rounded-full border border-slate-200 bg-white p-1 shadow-sm">
                              {(['All', ...categories] as (Category | 'All')[]).map((c) => {
                                const count = c === 'All' ? tryActions.length : tryActions.filter((q) => categoryOf(q) === c).length;
                                return (
                                  <button key={c} type="button" onClick={() => setCategory(c)} aria-pressed={category === c}
                                    className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${category === c ? 'bg-gradient-to-r from-[#33077C] to-[#6D28D9] text-white shadow-sm' : 'text-slate-600 hover:bg-violet-50 hover:text-[#33077C]'}`}>
                                    {c}
                                    <span className={`rounded-full px-1.5 text-[10px] tabular-nums ${category === c ? 'bg-white/25' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-3">
                          {visibleActions.map((q, i) => {
                            const Icon = actionIcon(q.label);
                            const catName = categoryOf(q);
                            const cat = CATEGORY_STYLE[catName];
                            return (
                              <motion.button key={q.label} type="button" disabled={disabled || sending} onClick={() => send(q.prompt)}
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.035, duration: 0.3 }}
                                whileTap={{ scale: 0.985 }}
                                className="group relative flex items-center gap-3.5 overflow-hidden rounded-[18px] border border-slate-200/80 bg-white py-3.5 pl-5 pr-3.5 text-left shadow-sm transition-[border-color,box-shadow] hover:border-violet-300 hover:shadow-lg hover:shadow-violet-500/10 disabled:opacity-50 disabled:pointer-events-none">
                                <span className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${cat.grad}`} />
                                <span className={`flex w-11 h-11 shrink-0 items-center justify-center rounded-[14px] ${cat.soft}`}><Icon className="w-5 h-5" /></span>
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-center gap-2">
                                    <span className="truncate text-sm font-semibold text-slate-900 group-hover:text-[#33077C]">{q.label}</span>
                                    <span className={`shrink-0 rounded-full px-2 py-px text-[10px] font-semibold ring-1 ${cat.chip}`}>{catName}</span>
                                  </span>
                                  <span className="mt-1 block line-clamp-2 text-xs italic leading-snug text-slate-500">“{q.prompt}”</span>
                                </span>
                                <span className="flex w-8 h-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-colors group-hover:bg-[#4C1D95] group-hover:text-white">
                                  <ArrowUpRight className="w-4 h-4" />
                                </span>
                              </motion.button>
                            );
                          })}
                        </div>
                      </motion.section>
                    )}
                  </>
                )}

                {!loadingHistory && messages.map((m) => (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}
                    className={`group/msg flex gap-3 max-w-3xl mx-auto w-full ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.role === 'assistant' && <div className="mt-0.5"><BotAvatar /></div>}
                    <div className={`min-w-0 ${m.role === 'user' ? 'max-w-[85%] sm:max-w-[75%] flex flex-col items-end' : 'flex-1'} space-y-2.5`}>
                      {m.role === 'user' ? (
                        <>
                          {m.images && m.images.length > 0 && (
                            <div className="flex flex-wrap justify-end gap-2">
                              {m.images.map((src, i) => (
                                <a key={i} href={src} target="_blank" rel="noreferrer">
                                  <img src={src} alt={`Attachment ${i + 1}`} className="max-h-40 max-w-[220px] rounded-2xl border border-violet-200 object-cover shadow-sm" />
                                </a>
                              ))}
                            </div>
                          )}
                          <div className="bg-gradient-to-br from-[#33077C] to-[#6D28D9] text-white rounded-[18px] rounded-br-md px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-md shadow-[#33077C]/20">{m.content}</div>
                          {m.at && <span className="text-[10px] text-slate-400 pr-1">{fmtTime(m.at)}</span>}
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="font-bold text-slate-700">Copilot</span>
                            {m.at && <span className="text-slate-400">{fmtTime(m.at)}</span>}
                            {m.content && (
                              <button type="button" onClick={() => copyText(m.content)} aria-label="Copy answer" title="Copy answer"
                                className="ml-auto p-1 rounded-md text-slate-400 hover:text-[#5B21B6] hover:bg-violet-50 opacity-0 group-hover/msg:opacity-100 focus:opacity-100 transition-opacity">
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <AnalysisChips analysis={m.analysis} />
                          {m.content && (
                            <div className={`rounded-[18px] rounded-tl-md px-4 sm:px-5 py-3.5 border ${m.error ? 'bg-rose-50 border-rose-200' : isNoticeAnalysis(m.analysis) ? 'bg-slate-50 border-slate-200 border-dashed' : 'bg-white border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(51,7,124,0.2)]'}`}>
                              <AssistantText text={m.content} error={m.error} />
                            </div>
                          )}
                          {m.blocks.map((b, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay: 0.1 + i * 0.08 }}>
                              <AiBlockView block={b} actionStates={actionStates} onConfirm={confirm} onCancel={cancel} onRecheck={recheck} />
                            </motion.div>
                          ))}
                          <AnalysisFooter analysis={m.analysis} hasBlocks={m.blocks.length > 0}
                            canRetry={!sending && !disabled}
                            onRetry={m.prompt && m.id === lastId ? () => send(m.prompt!) : undefined}
                            quickActions={m.id === lastId ? capabilities?.quickActions : undefined}
                            onQuickAction={send} />
                          {m.agent && (
                            <AgentPanel agent={m.agent} canContinue={!sending && !disabled}
                              onContinue={m.id === lastId ? () => send('Please continue') : undefined} />
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                ))}

                {!loadingHistory && activeTask && (
                  <div className="max-w-3xl mx-auto w-full">
                    <TaskPanel task={activeTask} busy={sending || !!taskBusy[activeTask.id]}
                      onResume={resumeTask} onCancel={cancelTask} onDismiss={() => setActiveTaskId(null)} />
                  </div>
                )}

                <AnimatePresence>{sending && <div className="max-w-3xl mx-auto w-full"><ThinkingIndicator /></div>}</AnimatePresence>
              </div>

              <AnimatePresence>
                {showJump && !showWelcome && (
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
            <div className="px-3 sm:px-5 pb-3 sm:pb-4 pt-1">
              <div className="rounded-[22px] bg-white border border-slate-200/70 shadow-sm px-3 sm:px-4 pt-3 pb-2.5">
                {!showWelcome && !sending && !loadingHistory && quickActions.length > 0 && (
                  <div className="ai-scroll flex gap-1.5 overflow-x-auto pb-2.5">
                    {quickActions.slice(0, 6).map((q) => (
                      <button key={q.label} type="button" disabled={disabled} onClick={() => send(q.prompt)} title={q.prompt}
                        className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 hover:border-violet-300 hover:text-[#33077C] hover:bg-violet-50 disabled:opacity-50 transition-colors">
                        {q.label}
                      </button>
                    ))}
                  </div>
                )}
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pb-2.5">
                    {attachments.map((src, i) => (
                      <div key={i} className="relative">
                        <img src={src} alt={`Attachment ${i + 1}`} className="w-16 h-16 rounded-xl object-cover border border-violet-200" />
                        <button type="button" onClick={() => setAttachments((cur) => cur.filter((_, idx) => idx !== i))} aria-label="Remove image"
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center shadow">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden
                  onChange={(e) => { const files = Array.from(e.target.files ?? []); e.target.value = ''; void addImages(files); }} />
                <div className={`flex items-end gap-2 rounded-[26px] border pl-2 pr-1.5 py-1.5 transition-[border-color,box-shadow] ${disabled ? 'border-slate-200 bg-slate-50' : 'bg-white border-violet-300/70 focus-within:border-[#7C3AED] focus-within:ring-4 focus-within:ring-violet-500/10'}`}>
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={disabled || sending || attachments.length >= MAX_IMAGES}
                    aria-label="Attach image" title="Attach image (JPG, PNG, WebP · up to 3 MB)"
                    className="w-9 h-9 shrink-0 self-center rounded-full flex items-center justify-center text-[#6D28D9] hover:bg-violet-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <Paperclip className="w-[18px] h-[18px]" />
                  </button>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value.slice(0, maxChars))}
                    onKeyDown={onKeyDown}
                    onPaste={(e) => {
                      const files = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith('image/'));
                      if (files.length) { e.preventDefault(); void addImages(files); }
                    }}
                    rows={1}
                    disabled={disabled}
                    aria-label="Message the Copilot"
                    placeholder={'Ask anything… e.g. "Show today\'s sales" or "Create a lead named Kumar, 9876543210"'}
                    className="flex-1 min-w-0 resize-none bg-transparent py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed max-h-40"
                  />
                  {input.length > maxChars * 0.8 && <span className="self-center text-[10px] tabular-nums text-slate-400">{input.length}/{maxChars}</span>}
                  <motion.button type="button" onClick={() => send(input)} disabled={!canSend} aria-label="Send message"
                    whileHover={canSend ? { scale: 1.06 } : undefined} whileTap={canSend ? { scale: 0.92 } : undefined}
                    className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center transition-colors ${canSend ? 'bg-[#33077C] text-white shadow-md shadow-[#33077C]/30' : sending ? 'bg-violet-100 text-[#6D28D9]' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-5 h-5" />}
                  </motion.button>
                </div>
                <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 mt-2.5">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>Copilot can make mistakes — please verify important details.</span>
                </p>
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </MotionConfig>
  );
};

export default AiCopilotView;
