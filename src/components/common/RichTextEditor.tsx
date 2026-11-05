import React, { useEffect, useRef, useState } from 'react';
import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Subscript,
  Superscript,
  Highlighter,
  RemoveFormatting,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Info,
  Table as TableIcon,
  Link as LinkIcon,
  Minus,
  Smile,
  FileText,
  Maximize2,
  Minimize2,
  Check,
  ChevronDown,
  Baseline,
  Search,
} from 'lucide-react';
import { sanitizeHtml, htmlToText } from '../../utils/sanitizeHtml';

export interface EditorTemplate {
  id: string;
  name: string;
  description?: string;
  html: string;
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  templates?: EditorTemplate[];
  /** Shown above the editor tabs, e.g. an error message. */
  error?: string;
  minHeight?: number;
}

const BLOCKS = [
  { label: 'Normal Text', tag: 'p' },
  { label: 'Heading 1', tag: 'h1' },
  { label: 'Heading 2', tag: 'h2' },
  { label: 'Heading 3', tag: 'h3' },
];

// execCommand's fontSize takes 1-7; these are the sizes offered.
const SIZES = [
  { label: '12px (Small)', value: '2' },
  { label: '14px (Normal)', value: '3' },
  { label: '16px (Medium)', value: '4' },
  { label: '18px (Large)', value: '5' },
  { label: '24px (Huge)', value: '6' },
];

const COLORS = ['#0F172A', '#33077C', '#DC2626', '#EA580C', '#CA8A04', '#16A34A', '#0284C7', '#64748B'];
const HIGHLIGHTS = ['#FEF08A', '#BBF7D0', '#BFDBFE', '#FBCFE8', '#E9D5FF', '#FED7AA', '#E2E8F0', 'transparent'];
const EMOJIS = ['😀', '😊', '👍', '🎉', '🚀', '✅', '⚠️', '📢', '📅', '💡', '🙏', '❤️'];

/** A small toolbar dropdown. Items use onMouseDown so the editor keeps its text selection. */
const Menu: React.FC<{
  label: React.ReactNode;
  title?: string;
  children: (close: () => void) => React.ReactNode;
  width?: string;
  align?: 'left' | 'right';
  buttonClassName?: string;
}> = ({ label, title, children, width = 'min-w-[160px]', align = 'left', buttonClassName }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title={title}
        onMouseDown={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
        className={`inline-flex items-center border cursor-pointer transition-all ${
          buttonClassName ||
          'h-8 px-2.5 gap-1.5 rounded-md text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
        }`}
      >
        {label}
        <ChevronDown className="w-3.5 h-3.5 opacity-70" />
      </button>
      {open && (
        <div
          className={`absolute top-full mt-1 ${align === 'right' ? 'right-0' : 'left-0'} ${width} bg-white border border-slate-200 rounded-xl shadow-xl p-1 z-30 max-h-64 overflow-y-auto`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
};

const ToolButton: React.FC<{
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
}> = ({ title, onClick, children, active }) => (
  <button
    type="button"
    title={title}
    onMouseDown={(e) => {
      e.preventDefault();
      onClick();
    }}
    className={`w-8 h-8 inline-flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-[#33077C] cursor-pointer transition-colors ${
      active ? 'bg-slate-100 text-[#33077C]' : ''
    }`}
  >
    {children}
  </button>
);

const Divider = () => <span className="w-px h-6 bg-slate-200 mx-1 shrink-0" />;

/**
 * Multi-select list of templates (search + round tick circles). Ticking a template puts it in the message at once,
 * after whatever was written before the list was opened; unticking takes it out again.
 */
const TemplatePicker: React.FC<{
  templates: EditorTemplate[];
  baseHtml: string;
  onChange: (html: string) => void;
}> = ({ templates, baseHtml, onChange }) => {
  const base = useRef(baseHtml);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const q = query.trim().toLowerCase();
  const visible = templates.filter((t) => !q || t.name.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q));

  const apply = (ids: string[]) => {
    const chosen = templates.filter((t) => ids.includes(t.id)).map((t) => t.html).join('<hr>');
    const before = base.current.trim();
    onChange(before && chosen ? `${before}<p><br></p>${chosen}` : before || chosen);
  };

  const toggle = (id: string) => {
    const next = picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id];
    setPicked(next);
    apply(next);
  };

  return (
    <div className="w-[300px]">
      <div className="relative p-1.5">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search templates..."
          className="w-full h-9 pl-8 pr-3 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-[#4309A2]"
        />
      </div>
      <div className="max-h-56 overflow-y-auto px-1">
        {visible.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-5">No templates found.</p>
        ) : (
          visible.map((t) => {
            const checked = picked.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  toggle(t.id);
                }}
                className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left cursor-pointer transition-colors ${
                  checked ? 'bg-[#33077C]/10' : 'hover:bg-slate-50'
                }`}
              >
                <span
                  className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    checked ? 'bg-[#33077C] border-[#33077C]' : 'border-slate-300 bg-white'
                  }`}
                >
                  {checked && <Check className="w-3 h-3 text-white stroke-[3]" />}
                </span>
                <span>
                  <span className="block text-xs font-bold text-slate-800">{t.name}</span>
                  {t.description && <span className="block text-[11px] font-medium text-slate-500 mt-0.5">{t.description}</span>}
                </span>
              </button>
            );
          })
        )}
      </div>
      <div className="flex items-center justify-between gap-2 p-2 border-t border-slate-100 mt-1">
        <span className="text-[11px] font-semibold text-slate-500">{picked.length} selected</span>
        {picked.length > 0 && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setPicked([]);
              apply([]);
            }}
            className="text-[11px] font-bold text-[#33077C] hover:underline cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Write your message...',
  templates = [],
  error,
  minHeight = 320,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<'compose' | 'preview'>('compose');
  const [fullscreen, setFullscreen] = useState(false);

  // Keep the editor in step with `value` (templates, loading a draft) without disturbing typing.
  useEffect(() => {
    const el = editorRef.current;
    if (el && el.innerHTML !== value) el.innerHTML = value || '';
  }, [value, tab]);

  const sync = () => {
    const el = editorRef.current;
    if (!el) return;
    if (el.innerHTML === '<br>') el.innerHTML = '';
    onChange(el.innerHTML);
  };

  const exec = (command: string, arg?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    sync();
  };

  const insertHtml = (html: string) => exec('insertHTML', html);

  const wrapSelectionInCode = () => {
    const text = window.getSelection()?.toString() || 'code';
    insertHtml(`<code>${text.replace(/</g, '&lt;')}</code>`);
  };

  const insertLink = () => {
    const url = window.prompt('Link address (URL)', 'https://');
    if (url && /^(https?:|mailto:)/i.test(url.trim())) exec('createLink', url.trim());
  };

  const insertTable = () =>
    insertHtml(
      '<table><tbody>' +
        '<tr><th>Heading</th><th>Heading</th><th>Heading</th></tr>' +
        '<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>' +
        '<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>' +
        '</tbody></table><p><br></p>'
    );

  const insertCallout = () =>
    insertHtml('<div class="rte-callout"><strong>Note:</strong> Write your highlighted message here.</div><p><br></p>');

  const text = htmlToText(value);
  const words = text ? text.split(' ').length : 0;
  const readMinutes = Math.max(1, Math.ceil(words / 200));

  return (
    <div className={fullscreen ? 'fixed inset-0 z-[9999] bg-white p-4 overflow-auto' : ''}>
      <div
        className={`rounded-xl border bg-white overflow-visible ${
          error ? 'border-red-500' : 'border-slate-200'
        }`}
      >
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50/70 rounded-t-xl">
            <button
              type="button"
              onClick={() => setTab('compose')}
              className={`h-10 px-6 inline-flex items-center gap-2 rounded-lg text-xs sm:text-[13px] font-bold cursor-pointer transition-all active:scale-[0.98] ${
                tab === 'compose'
                  ? 'bg-[#33077C] text-white shadow-md'
                  : 'bg-white text-slate-700 border border-slate-200 shadow-xs hover:bg-slate-50'
              }`}
            >
              {tab === 'compose' && <Check className="w-4 h-4 stroke-[2.5]" />}
              Email Composer
            </button>
            <button
              type="button"
              onClick={() => setTab('preview')}
              className={`h-10 px-6 inline-flex items-center gap-2 rounded-lg text-xs sm:text-[13px] font-bold cursor-pointer transition-all active:scale-[0.98] ${
                tab === 'preview'
                  ? 'bg-[#33077C] text-white shadow-md'
                  : 'bg-white text-slate-700 border border-slate-200 shadow-xs hover:bg-slate-50'
              }`}
            >
              {tab === 'preview' && <Check className="w-4 h-4 stroke-[2.5]" />}
              Email Client Preview
            </button>
        </div>

        {tab === 'compose' ? (
          <>
            {/* Toolbar */}
            <div className="px-3 py-2 space-y-1.5 border-b border-slate-100">
              <div className="flex items-center flex-wrap gap-1">
                <ToolButton title="Undo" onClick={() => exec('undo')}>
                  <Undo2 className="w-4 h-4" />
                </ToolButton>
                <ToolButton title="Redo" onClick={() => exec('redo')}>
                  <Redo2 className="w-4 h-4" />
                </ToolButton>
                <Divider />
                <Menu label="Normal Text" title="Text style" width="min-w-[170px]">
                  {(close) =>
                    BLOCKS.map((b) => (
                      <button
                        key={b.tag}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          exec('formatBlock', b.tag);
                          close();
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
                      >
                        {b.label}
                      </button>
                    ))
                  }
                </Menu>
                <Menu label="14px (Normal)" title="Text size" width="min-w-[170px]">
                  {(close) =>
                    SIZES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          exec('fontSize', s.value);
                          close();
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
                      >
                        {s.label}
                      </button>
                    ))
                  }
                </Menu>
                <Divider />
                <ToolButton title="Bold" onClick={() => exec('bold')}>
                  <Bold className="w-4 h-4" />
                </ToolButton>
                <ToolButton title="Italic" onClick={() => exec('italic')}>
                  <Italic className="w-4 h-4" />
                </ToolButton>
                <ToolButton title="Underline" onClick={() => exec('underline')}>
                  <Underline className="w-4 h-4" />
                </ToolButton>
                <ToolButton title="Strikethrough" onClick={() => exec('strikeThrough')}>
                  <Strikethrough className="w-4 h-4" />
                </ToolButton>
                <ToolButton title="Code" onClick={wrapSelectionInCode}>
                  <Code className="w-4 h-4" />
                </ToolButton>
                <ToolButton title="Subscript" onClick={() => exec('subscript')}>
                  <Subscript className="w-4 h-4" />
                </ToolButton>
                <ToolButton title="Superscript" onClick={() => exec('superscript')}>
                  <Superscript className="w-4 h-4" />
                </ToolButton>
                <Divider />
                <Menu label={<Baseline className="w-4 h-4" />} title="Text colour" width="min-w-[150px]">
                  {(close) => (
                    <div className="grid grid-cols-4 gap-1.5 p-1.5">
                      {COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          title={c}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            exec('foreColor', c);
                            close();
                          }}
                          style={{ backgroundColor: c }}
                          className="w-6 h-6 rounded-md border border-slate-200 cursor-pointer"
                        />
                      ))}
                    </div>
                  )}
                </Menu>
                <Menu label={<Highlighter className="w-4 h-4" />} title="Highlight" width="min-w-[150px]">
                  {(close) => (
                    <div className="grid grid-cols-4 gap-1.5 p-1.5">
                      {HIGHLIGHTS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          title={c === 'transparent' ? 'No highlight' : c}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            exec('hiliteColor', c);
                            close();
                          }}
                          style={{ backgroundColor: c === 'transparent' ? '#ffffff' : c }}
                          className="w-6 h-6 rounded-md border border-slate-300 cursor-pointer"
                        />
                      ))}
                    </div>
                  )}
                </Menu>
                <ToolButton title="Clear formatting" onClick={() => exec('removeFormat')}>
                  <RemoveFormatting className="w-4 h-4" />
                </ToolButton>
              </div>

              <div className="flex items-center flex-wrap gap-1">
                <ToolButton title="Align left" onClick={() => exec('justifyLeft')}>
                  <AlignLeft className="w-4 h-4" />
                </ToolButton>
                <ToolButton title="Align centre" onClick={() => exec('justifyCenter')}>
                  <AlignCenter className="w-4 h-4" />
                </ToolButton>
                <ToolButton title="Align right" onClick={() => exec('justifyRight')}>
                  <AlignRight className="w-4 h-4" />
                </ToolButton>
                <ToolButton title="Justify" onClick={() => exec('justifyFull')}>
                  <AlignJustify className="w-4 h-4" />
                </ToolButton>
                <Divider />
                <ToolButton title="Bulleted list" onClick={() => exec('insertUnorderedList')}>
                  <List className="w-4 h-4" />
                </ToolButton>
                <ToolButton title="Numbered list" onClick={() => exec('insertOrderedList')}>
                  <ListOrdered className="w-4 h-4" />
                </ToolButton>
                <ToolButton title="Quote" onClick={() => exec('formatBlock', 'blockquote')}>
                  <Quote className="w-4 h-4" />
                </ToolButton>
                <button
                  type="button"
                  title="Callout box"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertCallout();
                  }}
                  className="h-8 px-2.5 inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  <Info className="w-4 h-4" />
                  Callout
                </button>
                <Divider />
                <ToolButton title="Insert table" onClick={insertTable}>
                  <TableIcon className="w-4 h-4" />
                </ToolButton>
                <ToolButton title="Insert link" onClick={insertLink}>
                  <LinkIcon className="w-4 h-4" />
                </ToolButton>
                <ToolButton title="Horizontal line" onClick={() => exec('insertHorizontalRule')}>
                  <Minus className="w-4 h-4" />
                </ToolButton>
                <Menu label={<Smile className="w-4 h-4" />} title="Emoji" width="min-w-[170px]">
                  {(close) => (
                    <div className="grid grid-cols-6 gap-1 p-1.5">
                      {EMOJIS.map((em) => (
                        <button
                          key={em}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            insertHtml(em);
                            close();
                          }}
                          className="w-7 h-7 text-base hover:bg-slate-100 rounded cursor-pointer"
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  )}
                </Menu>

                <div className="ml-auto flex items-center gap-2">
                  {templates.length > 0 && (
                    <Menu
                      label={
                        <span className="inline-flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Email Templates
                        </span>
                      }
                      title="Start from a template"
                      width="min-w-[300px]"
                      align="right"
                      buttonClassName="h-10 sm:h-11 px-4 sm:px-5 gap-2 rounded-lg text-xs sm:text-sm font-bold border-[#33077C] bg-[#33077C] hover:bg-[#4309A2] text-white shadow-md active:scale-[0.98]"
                    >
                      {() => <TemplatePicker templates={templates} baseHtml={value} onChange={onChange} />}
                    </Menu>
                  )}
                  <ToolButton title={fullscreen ? 'Exit full screen' : 'Full screen'} onClick={() => setFullscreen((f) => !f)}>
                    {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </ToolButton>
                </div>
              </div>
            </div>

            {/* Editing area */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              data-placeholder={placeholder}
              onInput={sync}
              onBlur={sync}
              style={{ minHeight }}
              className="rte-editor rte-content px-5 py-4 outline-none"
            />
          </>
        ) : (
          <div className="p-5 bg-slate-50/60" style={{ minHeight }}>
            <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-xl shadow-xs p-6">
              {value ? (
                <div className="rte-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }} />
              ) : (
                <p className="text-sm text-slate-400 text-center py-10">Nothing to preview yet. Write your message in the composer.</p>
              )}
            </div>
          </div>
        )}

        {/* Footer counts */}
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/70 rounded-b-xl flex items-center gap-3 text-[11px] font-medium text-slate-500">
          <span>
            <span className="font-bold text-slate-700">{words}</span> words
          </span>
          <span>•</span>
          <span>
            <span className="font-bold text-slate-700">{text.length}</span> characters
          </span>
          <span>•</span>
          <span>~{readMinutes} min read</span>
          <span className="ml-auto hidden sm:inline text-slate-400">Select text to format size, colour, alignment or wrapping</span>
        </div>
      </div>
      {error && <p className="text-[11px] font-medium text-red-500 mt-1">{error}</p>}
    </div>
  );
};
