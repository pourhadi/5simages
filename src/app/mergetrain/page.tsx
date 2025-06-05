'use client';

import { useState, useEffect } from 'react';
import { Play, Pause, Volume2, Download, VolumeX, RefreshCw } from 'lucide-react';
import Navbar from '@/components/Navbar';

interface AudioTrack {
  name: string;
  url: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

export default function MergetrainPage() {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<{ [key: string]: HTMLAudioElement }>({});
  const [loading, setLoading] = useState(true);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);

  const fetchMP3s = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/mergetrain/files');
      const data = await response.json();
      
      if (data.files && Array.isArray(data.files)) {
        const availableTracks: AudioTrack[] = data.files.map((file: { name: string; url: string }) => ({
          name: file.name,
          url: file.url,
          isPlaying: false,
          currentTime: 0,
          duration: 0
        }));
        
        setTracks(availableTracks);
      }
    } catch (error) {
      console.error('Error fetching MP3s:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMP3s();
  }, []);

  useEffect(() => {
    // Create audio elements for each track
    const elements: { [key: string]: HTMLAudioElement } = {};
    tracks.forEach(track => {
      const audio = new Audio(track.url);
      audio.volume = isMuted ? 0 : volume;
      audio.addEventListener('loadedmetadata', () => {
        setTracks(prev => prev.map(t => 
          t.url === track.url ? { ...t, duration: audio.duration } : t
        ));
      });
      audio.addEventListener('timeupdate', () => {
        setTracks(prev => prev.map(t => 
          t.url === track.url ? { ...t, currentTime: audio.currentTime } : t
        ));
      });
      audio.addEventListener('ended', () => {
        setTracks(prev => prev.map(t => 
          t.url === track.url ? { ...t, isPlaying: false } : t
        ));
        setCurrentlyPlaying(null);
      });
      elements[track.url] = audio;
    });
    setAudioElements(elements);

    // Cleanup
    return () => {
      Object.values(elements).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, [tracks, volume, isMuted]);

  // Update volume on all audio elements when volume changes
  useEffect(() => {
    Object.values(audioElements).forEach(audio => {
      audio.volume = isMuted ? 0 : volume;
    });
  }, [volume, isMuted, audioElements]);

  const togglePlay = (trackUrl: string) => {
    const audio = audioElements[trackUrl];
    if (!audio) return;

    if (currentlyPlaying && currentlyPlaying !== trackUrl) {
      // Pause the currently playing track
      audioElements[currentlyPlaying]?.pause();
      setTracks(prev => prev.map(t => ({ ...t, isPlaying: false })));
    }

    if (audio.paused) {
      audio.play();
      setCurrentlyPlaying(trackUrl);
      setTracks(prev => prev.map(t => 
        t.url === trackUrl ? { ...t, isPlaying: true } : { ...t, isPlaying: false }
      ));
    } else {
      audio.pause();
      setCurrentlyPlaying(null);
      setTracks(prev => prev.map(t => 
        t.url === trackUrl ? { ...t, isPlaying: false } : t
      ));
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (trackUrl: string, value: number) => {
    const audio = audioElements[trackUrl];
    if (audio) {
      audio.currentTime = value;
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0E]">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 mt-16">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Mergetrain Audio</h1>
              <p className="text-gray-400">Listen to audio tracks from the mergetrain collection</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Volume Control */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    setVolume(parseFloat(e.target.value));
                    setIsMuted(false);
                  }}
                  className="w-24 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #2563eb 0%, #2563eb ${
                      (isMuted ? 0 : volume) * 100
                    }%, #374151 ${
                      (isMuted ? 0 : volume) * 100
                    }%, #374151 100%)`
                  }}
                />
              </div>
              
              {/* Refresh Button */}
              <button
                onClick={fetchMP3s}
                disabled={loading}
                className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                title="Refresh file list"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-400">Loading audio files...</div>
            </div>
          ) : tracks.length === 0 ? (
            <div className="bg-gray-900/50 rounded-lg p-12 text-center">
              <Volume2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-xl mb-2">No MP3 files found</p>
              <p className="text-gray-500 mb-6">Add MP3 files to the mergetrain folder to see them here.</p>
              
              <div className="bg-gray-800/50 rounded-lg p-6 text-left max-w-md mx-auto">
                <h3 className="text-white font-semibold mb-3">How to add audio files:</h3>
                <ol className="text-gray-400 space-y-2 text-sm">
                  <li>1. Navigate to <code className="bg-gray-700 px-2 py-1 rounded">/public/mergetrain/</code></li>
                  <li>2. Add your MP3 files to this folder</li>
                  <li>3. Refresh this page to see your audio files</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {tracks.map((track) => (
                <div key={track.url} className="bg-gray-900/50 rounded-lg p-6 hover:bg-gray-900/70 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-white capitalize">{track.name}</h3>
                    <a
                      href={track.url}
                      download
                      className="text-gray-400 hover:text-white transition-colors"
                      title="Download"
                    >
                      <Download className="w-5 h-5" />
                    </a>
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => togglePlay(track.url)}
                      className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center transition-colors"
                    >
                      {track.isPlaying ? (
                        <Pause className="w-5 h-5 text-white" />
                      ) : (
                        <Play className="w-5 h-5 text-white ml-0.5" />
                      )}
                    </button>

                    <div className="flex-1">
                      <div className="relative">
                        <input
                          type="range"
                          min={0}
                          max={track.duration || 100}
                          value={track.currentTime}
                          onChange={(e) => handleSeek(track.url, parseFloat(e.target.value))}
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                          style={{
                            background: `linear-gradient(to right, #2563eb 0%, #2563eb ${
                              (track.currentTime / (track.duration || 1)) * 100
                            }%, #374151 ${
                              (track.currentTime / (track.duration || 1)) * 100
                            }%, #374151 100%)`
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-gray-400">{formatTime(track.currentTime)}</span>
                        <span className="text-xs text-gray-400">{formatTime(track.duration)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb,
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: #2563eb;
          border-radius: 50%;
          cursor: pointer;
        }

        .slider::-moz-range-thumb,
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #2563eb;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}