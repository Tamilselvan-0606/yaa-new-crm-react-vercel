import React, { useEffect, useState } from "react";
import { Image as ImageIcon, X } from "lucide-react";
import { FormError } from "../../../components/common/FormError";
import { FormLabel } from "./formUtils";
import { IMAGE_FILE_ACCEPT, validateImageFile } from "./imageUpload";
import { toast } from "../../../utils/toast";

export interface ImageAttachmentBoxProps {
  attachedImageName: string | null;
  onImageSelect: (fileName: string) => void;
  onImageClear?: () => void;
}

/**
 * Shared image attachment section for Sales Hub documents.
 * Strictly accepts image files and rejects all non-image files with inline + toast feedback.
 */
export const ImageAttachmentBox: React.FC<ImageAttachmentBoxProps> = ({
  attachedImageName,
  onImageSelect,
  onImageClear,
}) => {
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    setImageError(null);
  }, [attachedImageName]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Clear input value so selecting the same or a new file always triggers onChange.
    e.target.value = "";
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setImageError(validation.error);
      toast.error(validation.error);
      return;
    }

    setImageError(null);
    onImageSelect(file.name);
    toast.success(`Image "${file.name}" attached!`);
  };

  return (
    <div className="p-3.5 bg-slate-50/70 border border-purple-100 rounded-xl space-y-2 animate-in fade-in duration-100 text-xs">
      <FormLabel>Attach Image</FormLabel>
      <div className="flex items-center gap-3 flex-wrap">
        <label className="px-3 py-1.5 bg-white border border-slate-200 hover:border-[#33077C] rounded-lg font-semibold text-slate-700 cursor-pointer flex items-center gap-1.5 transition-colors">
          <ImageIcon className="w-3.5 h-3.5 text-[#33077C]" />
          <span>Choose Image</span>
          <input
            type="file"
            accept={IMAGE_FILE_ACCEPT}
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
        {attachedImageName && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg max-w-xs">
            <span className="text-slate-600 font-medium truncate">
              {attachedImageName}
            </span>
            {onImageClear && (
              <button
                type="button"
                onClick={() => {
                  setImageError(null);
                  onImageClear();
                }}
                className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer shrink-0"
                title="Remove Image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
      <FormError message={imageError ?? undefined} />
    </div>
  );
};
