'use client';

import React, { useState, useRef, useEffect } from 'react';

export default function PlaylistHeader({ title = 'Collaborative Playlist', coverUrl, totalTracks = 0, totalDurationLabel = '0:00', followersLabel = 'Public', onPlayAll, compact = false }) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') setIsUserMenuOpen(false);
    }
    function onClick(e) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setIsUserMenuOpen(false);
    }
    if (isUserMenuOpen) {
      document.addEventListener('keydown', onKey);
      document.addEventListener('mousedown', onClick);
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [isUserMenuOpen]);

  if (compact) {
    return (
      <div className="m-0 rounded-xl border border-gray-700/60 overflow-hidden relative h-full min-h-[220px]">
        {/* Background cover */}
        <div
          className={`absolute inset-0 ${coverUrl ? 'bg-cover bg-center' : 'bg-gradient-to-br from-primary-500 to-primary-700'}`}
          style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined}
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />

        {/* Content */}
        <div className="relative p-4 h-full flex flex-col">
          <div className="text-[10px] uppercase tracking-wide text-gray-300 drop-shadow">Playing from</div>
          <div className="text-2xl font-extrabold text-white truncate drop-shadow">{title}</div>
          <div className="mt-1 text-xs text-gray-200 space-x-2 truncate drop-shadow">
            <span className="text-white/95">{followersLabel}</span>
            <span>•</span>
            <span>{totalTracks} tracks</span>
            <span>•</span>
            <span>{totalDurationLabel}</span>
          </div>
          <div className="mt-auto">
            <button onClick={onPlayAll} className="px-3 py-1.5 rounded-full bg-white/90 text-gray-900 text-sm font-semibold hover:bg-white transition-colors shadow">
              Play
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Minimal top navigation bar
  return (
    <div className="bg-gray-900/60 backdrop-blur-sm sticky top-0 z-20">
      <div className="max-w-[1400px] mx-auto px-3 py-3 flex items-center gap-3">
        {/* Home button */}
        <button className="p-2 rounded-full bg-gray-800 text-gray-200 hover:text-white hover:bg-gray-700 transition-colors" title="Home">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6" />
          </svg>
        </button>

        {/* Back / Forward (disabled visuals) */}
        <div className="hidden md:flex items-center gap-2">
          <button className="p-2 rounded-full bg-gray-800 text-gray-400 cursor-not-allowed" title="Back">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          </button>
          <button className="p-2 rounded-full bg-gray-800 text-gray-400 cursor-not-allowed" title="Forward">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>

        {/* Search field */}
        <div className="flex-1">
          <div className="relative max-w-xl">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"/></svg>
            </span>
            <input
              type="text"
              placeholder="What do you want to play?"
              className="w-full pl-9 pr-3 py-2 rounded-full bg-gray-800 text-gray-200 placeholder-gray-400 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* User actions */}
        <div className="flex items-center gap-2 relative" ref={menuRef}>
          <button className="px-3 py-1.5 rounded-full border border-gray-700 text-gray-200 hover:bg-gray-800/80">Explore Premium</button>
          <button className="p-2 rounded-full bg-gray-800 text-gray-200 hover:text-white hover:bg-gray-700" title="Notifications">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
          </button>
          <button onClick={() => setIsUserMenuOpen(v => !v)} className="p-1.5 rounded-full bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-primary-500" title="Account" aria-haspopup="menu" aria-expanded={isUserMenuOpen}>
            <span className="inline-flex w-7 h-7 items-center justify-center rounded-full bg-primary-600 text-white font-semibold">U</span>
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 top-12 w-56 rounded-md border border-gray-700 bg-gray-900 shadow-xl overflow-hidden">
              <ul className="py-1 text-sm text-gray-200">
                <li><button className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-800">Account<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5"/></svg></button></li>
                <li><button className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-800">Profile<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5"/></svg></button></li>
                <li><button className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-800">Upgrade to Premium<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5"/></svg></button></li>
                <li><button className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-800">Support<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5"/></svg></button></li>
                <li><button className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-800">Download<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5"/></svg></button></li>
                <li><button className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-800">Settings</button></li>
                <li><hr className="border-gray-700" /></li>
                <li><button className="w-full text-left px-4 py-2 hover:bg-gray-800 text-red-300">Log out</button></li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
