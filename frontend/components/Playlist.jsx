'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { playlistApi } from '@/lib/api';
import { calculatePosition } from '@/lib/position';

export default function Playlist({ playlist, onUpdate, currentPlayingId }) {
  const [localPlaylist, setLocalPlaylist] = useState(playlist);

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
      await playlistApi.vote(id, direction);
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error voting:', error);
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
        <div className="grid grid-cols-[24px_minmax(0,4fr)_minmax(0,3fr)_120px_80px] gap-3 px-2">
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
                            className={`grid grid-cols-[24px_minmax(0,4fr)_minmax(0,3fr)_120px_80px] gap-3 items-center px-3 py-2 rounded-md transition-all duration-200 hover:bg-gray-700/40 ${
                              isPlaying ? 'bg-primary-900/20' : 'bg-transparent'
                            } ${snapshot.isDragging ? 'opacity-70 scale-[1.01]' : ''}`}
                          >
                            {/* Drag handle + index */}
                            <div {...provided.dragHandleProps} className="text-gray-400 hover:text-primary-400 cursor-grab select-none">{index + 1}</div>

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
                              <button onClick={() => handleVote(item.id, 'down')} className="p-1 hover:text-red-400 hover:scale-110 transition-transform" aria-label="Downvote">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                              </button>
                              <div className={`w-8 text-center ${item.votes>0?'text-green-400':item.votes<0?'text-red-400':'text-gray-400'}`}>{item.votes>0?'+':''}{item.votes}</div>
                              <button onClick={() => handleVote(item.id, 'up')} className="p-1 hover:text-green-400 hover:scale-110 transition-transform" aria-label="Upvote">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                              </button>
                              {!isPlaying && (
                                <button onClick={() => handleSetPlaying(item.id)} className="p-1 hover:text-primary-400 hover:scale-110 transition-transform" aria-label="Play">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                </button>
                              )}
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

