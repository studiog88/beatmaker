import { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface Beat {
  id: string;
  name: string;
  pattern: boolean[][];
  tempo: number;
  createdAt: string;
}

interface LoadBeatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (pattern: boolean[][], tempo: number) => void;
  accessToken: string | null;
}

export function LoadBeatModal({ isOpen, onClose, onLoad, accessToken }: LoadBeatModalProps) {
  const [beats, setBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && accessToken) {
      loadBeats();
    }
  }, [isOpen, accessToken]);

  const loadBeats = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e44554cb`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken!}`,
            'apikey': publicAnonKey,
            'X-Access-Token': accessToken!,
          },
          body: JSON.stringify({ _rpc: 'listBeats' })
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load beats');
      }

      setBeats(data.beats || []);
    } catch (err: any) {
      console.error('Load beats error:', err);
      setError(err.message || 'Failed to load beats');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (beatId: string) => {
    if (!confirm('Are you sure you want to delete this beat?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e44554cb`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken!}`,
            'apikey': publicAnonKey,
            'X-Access-Token': accessToken!,
          },
          body: JSON.stringify({ _rpc: 'deleteBeat', beatId })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete beat');
      }

      // Refresh the list
      loadBeats();
    } catch (err: any) {
      console.error('Delete beat error:', err);
      alert(err.message || 'Failed to delete beat');
    }
  };

  const handleLoadBeat = (beat: Beat) => {
    onLoad(beat.pattern, beat.tempo);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-[#18181b] rounded-[12px] p-[32px] w-[500px] max-h-[600px] border-2 border-[#3f3f47] relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-[16px] right-[16px] text-[#9f9fa9] hover:text-[#f1f5f9] transition-colors"
        >
          <X size={24} />
        </button>

        <h2 className="font-['Inter:Medium',sans-serif] font-medium text-[#f8fafc] text-[24px] mb-[24px]">
          Load Beat
        </h2>

        {loading ? (
          <p className="text-[#9f9fa9] font-['Inter:Medium',sans-serif] font-medium text-[16px]">
            Loading...
          </p>
        ) : error ? (
          <p className="text-red-500 font-['Inter:Medium',sans-serif] font-medium text-[16px]">
            {error}
          </p>
        ) : beats.length === 0 ? (
          <p className="text-[#9f9fa9] font-['Inter:Medium',sans-serif] font-medium text-[16px]">
            No saved beats yet. Create and save your first beat!
          </p>
        ) : (
          <div className="flex flex-col gap-[8px] overflow-y-auto max-h-[400px]">
            {beats.map((beat) => (
              <div
                key={beat.id}
                className="bg-[#27272a] border border-[#3f3f47] rounded-[8px] p-[16px] flex items-center justify-between hover:border-[#2563eb] transition-colors"
              >
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => handleLoadBeat(beat)}
                >
                  <p className="font-['Inter:Medium',sans-serif] font-medium text-[#f1f5f9] text-[16px]">
                    {beat.name}
                  </p>
                  <p className="font-['Inter:Medium',sans-serif] font-medium text-[#9f9fa9] text-[12px] mt-[4px]">
                    {new Date(beat.createdAt).toLocaleDateString()} • {beat.tempo} BPM
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(beat.id);
                  }}
                  className="text-[#9f9fa9] hover:text-red-500 transition-colors p-[8px]"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}