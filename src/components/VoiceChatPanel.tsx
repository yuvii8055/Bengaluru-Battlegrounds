import React, { useState, useEffect } from 'react';
import { X, Mic, MicOff, Volume2, Radio, Users, Signal } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface VoiceChatPanelProps {
  onClose: () => void;
}

export const VoiceChatPanel: React.FC<VoiceChatPanelProps> = ({ onClose }) => {
  const [channel, setChannel] = useState<'squad' | 'all' | 'mute'>('squad');
  const [isMicOn, setIsMicOn] = useState(true);
  const [micLevel, setMicLevel] = useState(25);
  const [squadmates, setSquadmates] = useState([
    { id: '1', name: 'Vikram_Rao (Squad Lead)', isSpeaking: false, ping: '24ms' },
    { id: '2', name: 'Karthik_BLR (Marksman)', isSpeaking: true, ping: '28ms' },
    { id: '3', name: 'BangaloreSniper (Scout)', isSpeaking: false, ping: '31ms' },
    { id: '4', name: 'You (Operative)', isSpeaking: false, ping: '18ms' },
  ]);

  // Simulate active squad voice radio chatter & audio volume bouncing
  useEffect(() => {
    const interval = setInterval(() => {
      setSquadmates((prev) =>
        prev.map((sq) => {
          if (sq.id === '4') return sq;
          const speaks = Math.random() > 0.65;
          return { ...sq, isSpeaking: speaks };
        })
      );

      if (isMicOn && channel !== 'mute') {
        setMicLevel(Math.floor(20 + Math.random() * 65));
      } else {
        setMicLevel(0);
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [isMicOn, channel]);

  const toggleMic = () => {
    soundEngine.playRadioBleep();
    setIsMicOn(!isMicOn);
  };

  const selectChannel = (ch: 'squad' | 'all' | 'mute') => {
    soundEngine.playRadioBleep();
    setChannel(ch);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 font-mono select-none">
      <div className="bg-zinc-950 border border-white/20 rounded-2xl w-full max-w-lg shadow-2xl text-white overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-zinc-900 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-emerald-400">
              CROSS-PLATFORM SQUAD RADIO & PROXIMITY VOICE
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Channel Selection Buttons */}
        <div className="p-4 bg-zinc-900/60 border-b border-white/10 flex items-center justify-between gap-2">
          <button
            onClick={() => selectChannel('squad')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
              channel === 'squad'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>SQUAD ONLY</span>
          </button>
          <button
            onClick={() => selectChannel('all')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
              channel === 'all'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            <Signal className="w-3.5 h-3.5" />
            <span>ALL PROXIMITY</span>
          </button>
          <button
            onClick={() => selectChannel('mute')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
              channel === 'mute'
                ? 'bg-red-600 text-white shadow-lg'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            <MicOff className="w-3.5 h-3.5" />
            <span>MUTE RADIO</span>
          </button>
        </div>

        {/* Squadmates List */}
        <div className="p-4 space-y-2.5 flex-1">
          <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
            CONNECTED SQUAD OPERATIVES (VOIP CODEC OPUS 32KBPS)
          </div>

          {squadmates.map((sq) => (
            <div
              key={sq.id}
              className={`p-3 rounded-xl border flex items-center justify-between transition ${
                sq.isSpeaking
                  ? 'bg-emerald-950/60 border-emerald-500/80 ring-1 ring-emerald-500/30'
                  : 'bg-zinc-900 border-white/10'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    sq.isSpeaking ? 'bg-emerald-400 animate-ping' : 'bg-zinc-600'
                  }`}
                />
                <span className="text-xs font-bold text-white">{sq.name}</span>
              </div>
              <div className="flex items-center space-x-2 text-[10px] text-zinc-400">
                <span className="text-emerald-400">{sq.ping}</span>
                {sq.isSpeaking && (
                  <span className="text-emerald-400 font-extrabold uppercase animate-pulse">
                    TRANSMITTING
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* Microphone Spectrum Meter */}
          <div className="mt-4 p-3 rounded-xl bg-black/60 border border-white/10 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 flex items-center space-x-1.5">
                <Mic className="w-3.5 h-3.5 text-yellow-400" />
                <span>INPUT SPECTRUM LEVEL:</span>
              </span>
              <span className="text-yellow-400 font-bold">{isMicOn ? `${micLevel}%` : 'MUTED'}</span>
            </div>
            <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-yellow-400 to-red-500 transition-all duration-100"
                style={{ width: `${isMicOn ? micLevel : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="p-4 bg-zinc-900 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={toggleMic}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 cursor-pointer transition ${
              isMicOn ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'
            }`}
          >
            {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            <span>{isMicOn ? 'MIC ACTIVE [LIVE]' : 'MIC MUTED'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold cursor-pointer transition"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
