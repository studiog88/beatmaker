import { useState } from 'react';
import { X } from 'lucide-react';

interface SaveBeatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (beatName: string) => void;
}

export function SaveBeatModal({ isOpen, onClose, onSave }: SaveBeatModalProps) {
  const [beatName, setBeatName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (beatName.trim()) {
      onSave(beatName.trim());
      setBeatName('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-[#18181b] rounded-[12px] p-[32px] w-[400px] border-2 border-[#3f3f47] relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-[16px] right-[16px] text-[#9f9fa9] hover:text-[#f1f5f9] transition-colors"
        >
          <X size={24} />
        </button>

        <h2 className="font-['Inter:Medium',sans-serif] font-medium text-[#f8fafc] text-[24px] mb-[24px]">
          Save Beat
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[16px]">
          <div className="flex flex-col gap-[8px]">
            <label className="font-['Inter:Medium',sans-serif] font-medium text-[#f1f5f9] text-[14px]">
              Beat Name
            </label>
            <input
              type="text"
              value={beatName}
              onChange={(e) => setBeatName(e.target.value)}
              required
              autoFocus
              className="bg-[#27272a] border border-[#3f3f47] rounded-[4px] px-[16px] py-[8px] text-[#f1f5f9] font-['Inter:Medium',sans-serif] font-medium text-[16px] outline-none focus:border-[#2563eb] transition-colors"
              placeholder="My Awesome Beat"
            />
          </div>

          <div className="flex gap-[8px]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[#27272a] border border-[#3f3f47] rounded-[8px] px-[16px] py-[12px] text-[#f1f5f9] font-['Geist:Medium',sans-serif] font-medium text-[16px] cursor-pointer hover:opacity-80 transition-opacity"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-[#2563eb] border border-[#60a5fa] rounded-[8px] px-[16px] py-[12px] text-[#f8fafc] font-['Geist:Medium',sans-serif] font-medium text-[16px] cursor-pointer hover:opacity-90 transition-opacity"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
