'use client';

import { useState, useEffect } from 'react';
import { playlistApi } from '@/lib/api';
import { getWebSocketClient } from '@/lib/websocket';
import TrackLibrary from '@/components/TrackLibrary';
import Playlist from '@/components/Playlist';
import NowPlaying from '@/components/NowPlaying';
import ConnectionStatus from '@/components/ConnectionStatus';
import PlaylistHeader from '@/components/PlaylistHeader';
import { NotificationProvider, useNotifications } from '@/contexts/NotificationContext';

function HomeContent() {
  const [playlist, setPlaylist] = useState([]);
  const [currentPlayingId, setCurrentPlayingId] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedPlaylistIndex, setSelectedPlaylistIndex] = useState(0);
  const { addNotification } = useNotifications();

  // Random background colors for playlist cards
  const backgroundColors = [
    'bg-gradient-to-br from-purple-600/20 to-pink-600/20',
    'bg-gradient-to-br from-blue-600/20 to-cyan-600/20',
    'bg-gradient-to-br from-green-600/20 to-emerald-600/20',
    'bg-gradient-to-br from-orange-600/20 to-red-600/20',
    'bg-gradient-to-br from-indigo-600/20 to-purple-600/20',
  ];

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

    // Handle playlist events with notifications
    ws.on('track.added', (message) => {
      loadPlaylist();
      addNotification(
        'added',
        'Track Added to Playlist',
        `${message.item?.track?.title || 'Unknown track'} was added to playlist`,
        message.item?.track
      );
    });

    ws.on('track.removed', (message) => {
      loadPlaylist();
      addNotification(
        'removed',
        'Track Removed from Playlist',
        `${message.item?.track?.title || 'Unknown track'} was removed from playlist`,
        message.item?.track
      );
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
      
      // Add notification for vote changes
      const voteChange = message.item.votes - (prev.find(i => i.id === message.item.id)?.votes || 0);
      if (voteChange > 0) {
        addNotification(
          'upvote',
          'Track Upvoted',
          `${message.item.track.title} received ${voteChange} upvote${voteChange > 1 ? 's' : ''}`,
          message.item.track
        );
      } else if (voteChange < 0) {
        addNotification(
          'downvote',
          'Track Downvoted',
          `${message.item.track.title} received ${Math.abs(voteChange)} downvote${Math.abs(voteChange) > 1 ? 's' : ''}`,
          message.item.track
        );
      }
    });

    ws.on('track.playing', (message) => {
      setCurrentPlayingId(message.id);
      setIsPaused(false);
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

  const isPlaying = Boolean(currentPlayingId) && !isPaused;

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative">
      {/* Animated background wave */}
      <div className={`wave-bg pointer-events-none ${isPlaying ? 'wave-running' : 'wave-paused'}`} />
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
        isPlaying={isPlaying}
      />

      {/* Header (kept small for status) */}
      <header className="bg-gray-800/40 backdrop-blur-sm border-b border-gray-700/60 shadow-lg animate-fade-in flex-none">
        <div className="w-full px-3 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-300 opacity-90 shimmer-underline">Realtime collaborative playlist</div>
          <ConnectionStatus />
        </div>
      </header>

      {/* Main Content - Full width no margins */}
      <div className="min-h-0 flex flex-wrap xl:flex-nowrap w-full px-4 py-4 gap-4 relative z-10">
        {/* Track Library (32%) */}
        <div className="h-full min-h-0 bg-gray-800/60 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-700/50 overflow-hidden transform transition-all duration-300 hover:scale-[1.01] flex flex-col w-full xl:basis-[32%]">
          <TrackLibrary 
            playlistTracks={playlist} 
            onAddTrack={() => {
              loadPlaylist();
              // Notification is handled by WebSocket event
            }} 
          />
        </div>

        {/* Playlist (52%) - With random background */}
        <div className={`h-full min-h-0 ${backgroundColors[selectedPlaylistIndex % backgroundColors.length]} backdrop-blur-sm rounded-xl shadow-2xl border border-gray-700/50 overflow-hidden transform transition-all duration-300 hover:scale-[1.01] flex flex-col w-full xl:basis-[52%]`}>
          <Playlist 
            playlist={playlist} 
            onUpdate={loadPlaylist}
            currentPlayingId={currentPlayingId}
          />
        </div>

        {/* Playing From (16%) - Full height card with footer */}
        <div className="h-full min-h-40 hidden xl:flex flex-col w-full xl:basis-[16%] bg-gray-800/60 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-700/50 overflow-hidden transform transition-all duration-300 hover:scale-[1.01]">
          <div className="flex-1 flex flex-col">
            {(() => {
              const current = playlist.find(i => i.id === currentPlayingId);
              if (!current) {
                return (
                  <div className="flex-1 flex items-center justify-center text-gray-400 p-4">
                    <div className="text-center">
                      <div className="text-sm">No track playing</div>
                    </div>
                  </div>
                );
              }
              const secs = playlist.reduce((s, i) => s + i.track.duration_seconds, 0);
              const mins = Math.floor(secs / 60);
              const rem = secs % 60;
              return (
                <>
                  <div className="flex-1 p-4">
                    <PlaylistHeader
                      compact
                      title={current.track.title}
                      coverUrl={current.track.cover_url}
                      totalTracks={playlist.length}
                      totalDurationLabel={`${mins}:${String(rem).padStart(2,'0')}`}
                      followersLabel={current.track.artist}
                      onPlayAll={() => playlistApi.setPlaying(current.id)}
                      isPlaying={isPlaying}
                    />
                  </div>
                  
                  {/* Footer with additional info */}
                  <div className="border-t border-gray-700/50 p-3 space-y-2">
                    <div className="text-xs text-gray-400">
                      <div className="flex justify-between">
                        <span>Artist:</span>
                        <span className="text-gray-300 truncate ml-2">{current.track.artist}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Album:</span>
                        <span className="text-gray-300 truncate ml-2">{current.track.album || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Genre:</span>
                        <span className="text-gray-300 truncate ml-2">{current.track.genre || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span className="text-gray-300 ml-2">
                          {Math.floor(current.track.duration_seconds / 60)}:{String(current.track.duration_seconds % 60).padStart(2, '0')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Votes:</span>
                        <span className={`ml-2 ${current.votes > 0 ? 'text-blue-400' : current.votes < 0 ? 'text-red-400' : 'text-gray-300'}`}>
                          {current.votes > 0 ? '+' : ''}{current.votes}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Bottom Now Playing bar (original) */}
      <div className="flex-none relative z-10">
        <NowPlaying 
          playlist={playlist}
          onPlaybackStateChange={(state) => {
            // state: { paused: boolean, hasTrack: boolean }
            setIsPaused(state.paused || false);
            if (!state.hasTrack) {
              setIsPaused(false);
            }
          }}
        />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <NotificationProvider>
      <HomeContent />
    </NotificationProvider>
  );
}
