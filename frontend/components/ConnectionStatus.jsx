'use client';

import { useEffect, useState } from 'react';
import { getWebSocketClient } from '@/lib/websocket';

export default function ConnectionStatus() {
  const [status, setStatus] = useState('disconnected');

  useEffect(() => {
    const ws = getWebSocketClient();
    
    const updateStatus = () => {
      setStatus(ws.getState());
    };

    const unsubscribeConnected = ws.on('connected', updateStatus);
    const unsubscribeDisconnected = ws.on('disconnected', updateStatus);
    const unsubscribeError = ws.on('error', updateStatus);

    // Initial status
    updateStatus();
    const interval = setInterval(updateStatus, 1000);

    return () => {
      unsubscribeConnected();
      unsubscribeDisconnected();
      unsubscribeError();
      clearInterval(interval);
    };
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 animate-pulse';
      case 'connecting':
        return 'bg-yellow-500';
      case 'closing':
        return 'bg-yellow-500';
      case 'disconnected':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'closing':
        return 'Closing...';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-3 h-3 rounded-full ${getStatusColor()} shadow-lg shadow-green-500/50`} />
      <span className="text-gray-600 dark:text-gray-400">{getStatusText()}</span>
    </div>
  );
}
