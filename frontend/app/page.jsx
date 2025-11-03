'use client';

import { useState, useEffect } from 'react';
import { playlistApi } from '@/lib/api';
import { getWebSocketClient } from '@/lib/websocket';
import TrackLibrary from '@/components/TrackLibrary';
import Playlist from '@/components/Playlist';
import NowPlaying from '@/components/NowPlaying';
import ConnectionStatus from '@/components/ConnectionStatus';
import PlaylistHeader from '@/components/PlaylistHeader';

export default function Home() {
  const [playlist, setPlaylist] = useState([]);
  const [currentPlayingId, setCurrentPlayingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  

  useEffect(() => {
    loadPlaylist();
    setupWebSocket();
    
    return () => {
      const ws = getWebSocketClient();
      ws.disconnect();
    };
  }, []);

  const loadPlaylist = async () => {
    try {
      setLoading(true);
      const data = await playlistApi.getAll();
      setPlaylist(data);
      
      // Find currently playing track
      const playing = data.find(item => item.is_playing);
      setCurrentPlayingId(playing?.id || null);
    } catch (error) {
      console.error('Error loading playlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocket = () => {
    const ws = getWebSocketClient();
    ws.connect();

    // Handle playlist events
    ws.on('track.added', (message) => {
      loadPlaylist();
    });

    ws.on('track.removed', (message) => {
      loadPlaylist();
    });

    ws.on('track.moved', (message) => {
      loadPlaylist();
    });

    ws.on('track.voted', (message) => {
      setPlaylist(prev => 
        prev.map(item => 
          item.id === message.item.id ? message.item : item
        )
      );
    });

    ws.on('track.playing', (message) => {
      setCurrentPlayingId(message.id);
      setPlaylist(prev =>
        prev.map(item => ({
          ...item,
          is_playing: item.id === message.id,
        }))
      );
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <div className="text-xl font-medium mb-2 text-white animate-pulse">Loading playlist...</div>
          <div className="text-gray-400">Please wait</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Spotify-like Header */}
      <PlaylistHeader 
        title="Collaborative Playlist"
        totalTracks={playlist.length}
        totalDurationLabel={(() => {
          const secs = playlist.reduce((s, i) => s + i.track.duration_seconds, 0);
          const mins = Math.floor(secs / 60);
          const rem = secs % 60;
          return `${mins}:${String(rem).padStart(2,'0')}`;
        })()}
        followersLabel="Public"
        onPlayAll={() => {
          const first = playlist[0];
          if (first) {
            playlistApi.setPlaying(first.id);
          }
        }}
      />

      {/* Header (kept small for status) */}
      <header className="bg-gray-800/40 backdrop-blur-sm border-b border-gray-700/60 shadow-lg animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-300">Realtime collaborative playlist</div>
          <ConnectionStatus />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 py-4 gap-4">
        {/* Track Library */}
        <div className="w-1/3 bg-gray-800/60 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-700/50 overflow-hidden transform transition-all duration-300 hover:scale-[1.01]">
          <TrackLibrary playlistTracks={playlist} onAddTrack={loadPlaylist} />
        </div>

        {/* Playlist */}
        <div className="w-2/3 bg-gray-800/60 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-700/50 overflow-hidden transform transition-all duration-300 hover:scale-[1.01]">
          <Playlist 
            playlist={playlist} 
            onUpdate={loadPlaylist}
            currentPlayingId={currentPlayingId}
          />
        </div>
      </div>

      {/* Now Playing Bar */}
      <NowPlaying playlist={playlist} />
    </div>
  );
}

