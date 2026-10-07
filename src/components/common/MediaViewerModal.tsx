import React from 'react';
import { X, ExternalLink, Download, Play, Image as ImageIcon } from 'lucide-react';

interface MediaViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  clientName?: string;
  caption?: string;
  tags?: string[];
}

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  isOpen,
  onClose,
  title,
  mediaUrl,
  mediaType,
  clientName,
  caption,
  tags = [],
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="media-viewer-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="media-viewer-container"
        className="relative w-full max-w-4xl bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#4309A2]/20 text-[#4309A2]">
              {mediaType === 'video' ? <Play className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
            </div>
            <div>
              <h4 className="text-base font-semibold text-white">{title}</h4>
              {clientName && <p className="text-xs text-slate-400">Client: {clientName}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={mediaUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Open full resolution in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Media Frame */}
        <div className="bg-black/90 flex items-center justify-center min-h-[360px] max-h-[560px] overflow-hidden p-2">
          {mediaType === 'video' ? (
            <video
              id="inline-media-player"
              src={mediaUrl}
              controls
              autoPlay
              playsInline
              className="max-h-[520px] max-w-full rounded-lg object-contain shadow-lg"
            >
              Your browser does not support HTML5 video.
            </video>
          ) : (
            <img
              src={mediaUrl}
              alt={title}
              className="max-h-[520px] max-w-full rounded-lg object-contain"
              referrerPolicy="no-referrer"
            />
          )}
        </div>

        {/* Caption & Metadata Footer */}
        {(caption || tags.length > 0) && (
          <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 text-slate-300 text-sm">
            {caption && <p className="whitespace-pre-line leading-relaxed text-xs sm:text-sm text-slate-200">{caption}</p>}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] font-mono px-2 py-0.5 bg-slate-800 text-[#4309A2] rounded-md"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
