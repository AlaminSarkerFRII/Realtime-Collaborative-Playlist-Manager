import React from 'react';

export default function PlaylistHeader({ title = 'Collaborative Playlist', coverUrl, totalTracks = 0, totalDurationLabel = '0:00', followersLabel = 'Public', onPlayAll }) {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-gray-700/40 to-gray-900" />
      <div className="relative max-w-7xl mx-auto px-4 py-8 flex items-center gap-6">
        <div className="w-40 h-40 rounded-md shadow-2xl bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center overflow-hidden">
          {coverUrl ? (
            <img src={coverUrl} alt={title} className="w-full h-full object-cover" />
          ) : (
            <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wide text-gray-300 mb-1">Playlist</div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight truncate">{title}</h1>
          <div className="mt-3 text-sm text-gray-300 space-x-2">
            <span className="text-white font-medium">{followersLabel}</span>
            <span>•</span>
            <span>{totalTracks} tracks</span>
            <span>•</span>
            <span>{totalDurationLabel}</span>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <button onClick={onPlayAll} className="px-5 py-2.5 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold hover:from-primary-600 hover:to-primary-700 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg hover:shadow-primary-500/40">
              Play
            </button>
            <button className="px-4 py-2 rounded-full border border-gray-600 text-gray-200 hover:bg-gray-700/60 transition-colors">
              Follow
            </button>
            <button className="p-2 rounded-full text-gray-300 hover:text-white hover:bg-gray-700/60 transition-colors" title="More options">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 7a2 2 0 110-4 2 2 0 010 4zm0 7a2 2 0 110-4 2 2 0 010 4zm0 7a2 2 0 110-4 2 2 0 010 4z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
