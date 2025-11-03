'use client';

import { useState, useEffect, useMemo } from 'react';
import { tracksApi, playlistApi } from '@/lib/api';

export default function TrackLibrary({ playlistTracks, onAddTrack }) {
  const [tracks, setTracks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTracks();
  }, []);

  const loadTracks = async () => {
    try {
      setLoading(true);
      const data = await tracksApi.getAll();
      setTracks(data);
    } catch (error) {
      console.error('Error loading tracks:', error);
    } finally {
      setLoading(false);
    }
  };

  const playlistTrackIds = new Set(playlistTracks.map(t => t.track_id));

  const genres = useMemo(() => {
    const genreSet = new Set(['all']);
    tracks.forEach(track => {
      if (track.genre) {
        genreSet.add(track.genre);
      }
    });
    return Array.from(genreSet).sort();
  }, [tracks]);

  const filteredTracks = useMemo(() => {
    return tracks.filter(track => {
      const matchesSearch = 
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (track.album && track.album.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesGenre = selectedGenre === 'all' || track.genre === selectedGenre;
      
      return matchesSearch && matchesGenre;
    });
  }, [tracks, searchQuery, selectedGenre]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAddTrack = async (trackId) => {
    try {
      await playlistApi.add(trackId, 'User', {});
      if (onAddTrack) {
        onAddTrack();
      }
    } catch (error) {
      console.error('Error adding track:', error);
      if (error.response?.data?.error?.code === 'DUPLICATE_TRACK') {
        alert('This track is already in the playlist');
      }
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-center text-gray-400 animate-pulse">Loading tracks...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-700 space-y-3">
        <h2 className="text-xl font-bold text-white">Track Library</h2>
        
        <input
          type="text"
          placeholder="Search tracks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
        />
        
        <select
          value={selectedGenre}
          onChange={(e) => setSelectedGenre(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
        >
          {genres.map(genre => (
            <option key={genre} value={genre}>
              {genre === 'all' ? 'All Genres' : genre}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {filteredTracks.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No tracks found
            </div>
          ) : (
            filteredTracks.map((track, index) => {
              const isInPlaylist = playlistTrackIds.has(track.id);
              
              return (
                <div
                  key={track.id}
                  className="flex items-center justify-between p-3 bg-gray-700/30 border border-gray-600/50 rounded-lg hover:bg-gray-700/50 hover:border-gray-500 hover:shadow-lg transition-all duration-300 animate-slide-up hover:scale-[1.02] backdrop-blur-sm"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-white">{track.title}</div>
                    <div className="text-sm text-gray-300 truncate">
                      {track.artist} {track.album && `• ${track.album}`}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {formatDuration(track.duration_seconds)}
                      {track.genre && ` • ${track.genre}`}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleAddTrack(track.id)}
                    disabled={isInPlaylist}
                    className={`ml-4 px-3 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 border ${
                      isInPlaylist
                        ? 'border-gray-600/60 text-gray-400 cursor-not-allowed bg-transparent'
                        : 'border-primary-500/50 text-primary-300 bg-transparent hover:bg-primary-500/10 active:scale-95'
                    }`}
                  >
                    {isInPlaylist ? (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4 1.5 1.5L11 16 7.5 12.5 9 12z"/></svg>
                        <span>Added</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5v14m-7-7h14"/></svg>
                        <span>Add</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

