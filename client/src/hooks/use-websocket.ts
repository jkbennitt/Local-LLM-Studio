import { useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketMessage } from '@/types';

export function useWebSocket(onMessage?: (message: WebSocketMessage) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [subscribedJobs, setSubscribedJobs] = useState<Set<number>>(new Set());
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;
  const baseReconnectDelay = 2000;

  const connect = useCallback(() => {
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      console.log('Establishing SSE connection...');
      const eventSource = new EventSource('/api/training/stream');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('✅ SSE connection established');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle different message types
          switch (data.type) {
            case 'heartbeat':
            case 'connection':
              // Keep connection alive, no action needed
              break;
            case 'training_update':
              if (onMessage) {
                onMessage(data);
              }
              break;
            default:
              if (onMessage) {
                onMessage(data);
              }
          }
        } catch (error) {
          console.error('Failed to parse SSE message:', error, event.data);
        }
      };

      eventSource.onerror = (event) => {
        console.warn('SSE connection error, attempting reconnect...');
        setIsConnected(false);

        // Close the current connection
        eventSource.close();

        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(
            baseReconnectDelay * Math.pow(1.5, reconnectAttemptsRef.current),
            30000
          );

          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else {
          console.error('❌ Max reconnection attempts reached, giving up');
        }
      };

    } catch (error) {
      console.error('Failed to create SSE connection:', error);
      setIsConnected(false);

      // Retry after a delay
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, baseReconnectDelay);
      }
    }
  }, [onMessage]);

  const disconnect = useCallback(() => {
    console.log('Disconnecting SSE...');

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnected(false);
    reconnectAttemptsRef.current = 0;
  }, []);

  const subscribeToJob = useCallback((jobId: number) => {
    setSubscribedJobs(prev => new Set([...prev, jobId]));
  }, []);

  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, disconnect to save resources
        disconnect();
      } else {
        // Page is visible again, reconnect
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    subscribeToJob
  };
}