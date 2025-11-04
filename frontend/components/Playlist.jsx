'use client';

import { useState, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { playlistApi } from '@/lib/api';
import { calculatePosition } from '@/lib/position';

export default function Playlist({ playlist, onUpdate, currentPlayingId }) {
  const [localPlaylist, setLocalPlaylist] = useState(playlist);
  const [bumpingId, setBumpingId] = useState(null);

  useEffect(() => {
    setLocalPlaylist(playlist);
  }, [playlist]);

  // Sort playlist by votes (highest first)
  const sortedPlaylist = useMemo(() => {
    return [...localPlaylist].sort((a, b) => b.votes - a.votes);
  }, [localPlaylist]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRemove = async (id) => {
    try {
      await playlistApi.remove(id);
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error removing track:', error);
    }
  };

  const handleVote = async (id, direction) => {
    try {
      setBumpingId(id);
      await playlistApi.vote(id, direction);
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error voting:', error);
    }
    finally {
      setTimeout(() => setBumpingId(null), 250);
    }
  };

  const handleSetPlaying = async (id) => {
    try {
      await playlistApi.setPlaying(id);
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error setting playing:', error);
    }
  };

  const onDragEnd = async (result) => {
    if (!result.destination) {
      return;
    }

    const { source, destination } = result;

    if (source.index === destination.index) {
      return;
    }

    const items = Array.from(sortedPlaylist);
    const [reorderedItem] = items.splice(source.index, 1);
    items.splice(destination.index, 0, reorderedItem);

    // Optimistic update
    setLocalPlaylist(items);

    // Calculate new position
    const prevItem = destination.index > 0 ? items[destination.index - 1] : null;
    const nextItem = destination.index < items.length - 1 ? items[destination.index + 1] : null;

    const newPosition = calculatePosition(
      prevItem?.position || null,
      nextItem?.position || null
    );

    try {
      await playlistApi.update(reorderedItem.id, { position: newPosition });
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error reordering track:', error);
      // Revert on failure
      setLocalPlaylist(playlist);
      if (onUpdate) {
        onUpdate();
      }
    }
  };

  const totalDuration = sortedPlaylist.reduce((sum, item) => sum + item.track.duration_seconds, 0);

  // Auto-scroll current playing row into view
  useEffect(() => {
    if (!currentPlayingId) return;
    const el = document.getElementById(`playlist-row-${currentPlayingId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentPlayingId]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Playlist</h2>
          <div className="text-sm text-gray-300">
            {sortedPlaylist.length} tracks • {formatDuration(totalDuration)}
          </div>
        </div>
      </div>

      <div className="px-4 pt-3 text-xs uppercase tracking-wide text-gray-400">
        <div className="grid grid-cols-[56px_minmax(0,4fr)_minmax(0,3fr)_120px_80px] gap-3 px-2">
          <div>#</div>
          <div>Title</div>
          <div>Album</div>
          <div>Added</div>
          <div>Time</div>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="playlist">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`flex-1 overflow-y-auto p-2 transition-colors duration-200 ${
                snapshot.isDraggingOver ? 'bg-gray-800/40' : ''
              }`}
            >
              {sortedPlaylist.length === 0 ? (
                <div className="text-center text-gray-400 py-8 animate-pulse">
                  Playlist is empty. Add some tracks!
                </div>
              ) : (
                <div className="space-y-1">
                  {sortedPlaylist.map((item, index) => {
                    const isPlaying = item.is_playing || item.id === currentPlayingId;
                    return (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`grid grid-cols-[56px_minmax(0,4fr)_minmax(0,3fr)_120px_80px] gap-3 items-center px-3 py-2 rounded-md transition-all duration-200 hover:bg-gray-700/40 ${
                              isPlaying ? 'bg-primary-900/20' : 'bg-transparent'
                            } ${snapshot.isDragging ? 'opacity-70 scale-[1.01]' : ''}`}
                            id={`playlist-row-${item.id}`}
                          >
                            {/* Row controls: play + drag handle/index */}
                            <div className="flex items-center gap-2 w-12">
                              <button
                                onClick={() => handleSetPlaying(item.id)}
                                title={isPlaying ? 'Playing' : 'Play'}
                                className={`p-1 rounded-md transition-colors flex items-center justify-center w-6 h-6 ${isPlaying ? 'text-primary-400' : 'text-gray-400 hover:text-primary-300'}`}
                                aria-label="Play"
                              >
                                {isPlaying ? (
                                  <span className="eq eq-sm">
                                    <span className="eq-bar"></span>
                                    <span className="eq-bar"></span>
                                    <span className="eq-bar"></span>
                                  </span>
                                ) : (
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                )}
                              </button>
                              <div {...provided.dragHandleProps} className="text-gray-400 hover:text-primary-400 cursor-grab select-none w-5 text-right">{index + 1}</div>
                            </div>

                            {/* Title + artist */}
                            <div className="min-w-0">
                              <div className={`truncate ${isPlaying ? 'text-primary-300' : 'text-white'}`}>{item.track.title}</div>
                              <div className="truncate text-sm text-gray-400">{item.track.artist}</div>
                            </div>

                            {/* Album */}
                            <div className="truncate text-gray-300">{item.track.album || '-'}</div>

                            {/* Added by */}
                            <div className="text-sm text-gray-400 truncate">{item.added_by}</div>

                            {/* Right controls */}
                            <div className="flex items-center justify-end gap-2 text-gray-400">
                              <button onClick={() => handleVote(item.id, 'down')} className="p-1 hover:text-red-400 hover:scale-110 transition-transform" aria-label="Dislike">
                                {/* Thumbs down icon */}
                                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l-4-4m0 0l4-4M4 14h6m4-4v6m0 4l-4-4" />
                                </svg>
                              </button>
                              <div className={`w-8 text-center ${bumpingId===item.id?'vote-bump':''} ${item.votes>0?'text-blue-400':item.votes<0?'text-red-400':'text-gray-400'}`}>{item.votes>0?'+':''}{item.votes}</div>
                              <button onClick={() => handleVote(item.id, 'up')} className="p-1 hover:text-blue-400 hover:scale-110 transition-transform" aria-label="Like">
                                {/* Thumbs up icon */}
                                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 10l4-4m0 0l4 4M18 14h6m4-4v6m0 4l-4-4" />
                                </svg>
                              </button>
                              <button onClick={() => handleRemove(item.id)} className="p-1 hover:text-red-400 hover:scale-110 transition-transform" aria-label="Remove">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                </div>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
