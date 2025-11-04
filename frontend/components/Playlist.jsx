'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { playlistApi } from '@/lib/api';
import { calculatePosition } from '@/lib/position';

export default function Playlist({ playlist, onUpdate, currentPlayingId }) {
  const [localPlaylist, setLocalPlaylist] = useState(playlist);
  const [bumpingId, setBumpingId] = useState(null);

  useEffect(() => {
    setLocalPlaylist(playlist);
  }, [playlist]);

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

    const items = Array.from(localPlaylist);
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

  const totalDuration = localPlaylist.reduce((sum, item) => sum + item.track.duration_seconds, 0);

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
            {localPlaylist.length} tracks • {formatDuration(totalDuration)}
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
              {localPlaylist.length === 0 ? (
                <div className="text-center text-gray-400 py-8 animate-pulse">
                  Playlist is empty. Add some tracks!
                </div>
              ) : (
                <div className="space-y-1">
                  {localPlaylist.map((item, index) => {
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
                                className={`p-1 rounded-md transition-colors flex items-center justify-center w-5 h-5 ${isPlaying ? 'text-primary-400' : 'text-gray-400 hover:text-primary-300'}`}
                                aria-label="Play"
                              >
                                {isPlaying ? (
                                  <span className="eq eq-sm">
                                    <span className="eq-bar"></span>
                                    <span className="eq-bar"></span>
                                    <span className="eq-bar"></span>
                                  </span>
                                ) : (
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
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
                                {/* Facebook-like thumbs down (outlined until hover) */}
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M10.5 4.75c.69 0 1.25.56 1.25 1.25v4.25l2.02 4.03c.42.84-.19 1.97-1.13 1.97H8.5a1.5 1.5 0 0 1-1.45-1.12L5.2 13H3.5A1.5 1.5 0 0 1 2 11.5v-5A1.5 1.5 0 0 1 3.5 5h7Z"/>
                                  <path d="M18 5h3a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-3V5Z"/>
                                </svg>
                              </button>
                              <div className={`w-8 text-center ${bumpingId===item.id?'vote-bump':''} ${item.votes>0?'text-blue-400':item.votes<0?'text-red-400':'text-gray-400'}`}>{item.votes>0?'+':''}{item.votes}</div>
                              <button onClick={() => handleVote(item.id, 'up')} className="p-1 hover:text-blue-400 hover:scale-110 transition-transform" aria-label="Like">
                                {/* Facebook-like thumbs up */}
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M13.5 19.25c-.69 0-1.25-.56-1.25-1.25V13.75L10.23 9.7c-.42-.84.19-1.97 1.13-1.97h4.14c.66 0 1.25.45 1.43 1.1L18.8 11H20.5A1.5 1.5 0 0 1 22 12.5v5A1.5 1.5 0 0 1 20.5 19h-7Z"/>
                                  <path d="M6 19H3a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h3v8Z"/>
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
