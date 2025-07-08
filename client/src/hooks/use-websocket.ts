import { useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketMessage } from '@/types';

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';

export function useWebSocket(onMessage?: (message: WebSocketMessage) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'unknown'>('unknown');

  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimer = useRef<NodeJS.Timeout | null>(null);
  const lastHeartbeat = useRef<number>(0);
  const messageQueue = useRef<any[]>([]);
  const isManualDisconnect = useRef(false);

  const maxReconnectAttempts = 10;
  const heartbeatInterval = 60000; // 60 seconds to match server

  const clearTimers = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
  }, []);

  const calculateBackoffDelay = useCallback((attempts: number): number => {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = baseDelay * Math.pow(1.5, attempts);
    return Math.min(delay, maxDelay);
  }, []);

  const startHeartbeat = useCallback(() => {
    // Disable heartbeat entirely to prevent connection issues
    // WebSocket connections will rely on browser's built-in keep-alive
    console.log('Heartbeat disabled for connection stability');
  }, []);

  const processMessageQueue = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && messageQueue.current.length > 0) {
      const queue = [...messageQueue.current];
      messageQueue.current = [];

      queue.forEach(message => {
        try {
          wsRef.current?.send(JSON.stringify(message));
        } catch (error) {
          console.error('Failed to send queued message:', error);
          messageQueue.current.push(message);
        }
      });
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === 1) { // OPEN state for EventSource
      return;
    }

    // Clean up existing connection
    if (wsRef.current) {
      (wsRef.current as EventSource).close();
    }

    setStatus('connecting');

    const sseUrl = `${window.location.origin}/api/training/stream`;

    try {
      const eventSource = new EventSource(sseUrl);
      wsRef.current = eventSource as any;

      eventSource.onopen = () => {
        setStatus('connected');
        setReconnectAttempts(0);
        setConnectionQuality('good');
        console.log('SSE connected');

        try {
          processMessageQueue();
        } catch (error) {
          console.error('Error in SSE onopen:', error);
          setStatus('error');
        }
      };

      eventSource.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          // Handle connection confirmation
          if (message.type === 'connection') {
            console.log('SSE connection confirmed:', message);
            setConnectionQuality('good');
            return;
          }

          // Handle ping responses
          if (message.type === 'ping') {
            setConnectionQuality('good');
            return;
          }

          setLastMessage(message);
          if (onMessage) {
            onMessage(message);
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      eventSource.onerror = (error) => {
        clearTimers();
        setStatus('disconnected');
        console.log('SSE disconnected');

        // More conservative reconnection strategy
        if (!isManualDisconnect.current && reconnectAttempts < maxReconnectAttempts) {
          setStatus('reconnecting');
          const delay = calculateBackoffDelay(reconnectAttempts);

          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);

          reconnectTimer.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connect();
          }, delay);
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          console.error('Max reconnection attempts reached');
          setStatus('error');
        }
      };
    } catch (error) {
      console.error('Failed to create SSE connection:', error);
      setStatus('error');
    }
  }, [reconnectAttempts, maxReconnectAttempts, calculateBackoffDelay, processMessageQueue, onMessage, clearTimers]);

  const disconnect = useCallback(() => {
    isManualDisconnect.current = true;
    clearTimers();

    if (wsRef.current) {
      (wsRef.current as EventSource).close();
      wsRef.current = null;
    }

    setStatus('disconnected');
    setReconnectAttempts(0);
    messageQueue.current = [];
  }, [clearTimers]);

  const sendMessage = useCallback((message: any) => {
    // For SSE, we don't send messages from client to server
    // SSE is unidirectional (server to client only)
    console.log('SSE message (not sent):', message);
    // For job subscription, we could use a separate HTTP endpoint if needed
  }, []);

  const subscribeToJob = useCallback((jobId: number) => {
    sendMessage({ type: 'subscribe', jobId });
  }, [sendMessage]);

  const forceReconnect = useCallback(() => {
    setReconnectAttempts(0);
    isManualDisconnect.current = false;
    connect();
  }, [connect]);

  useEffect(() => {
    isManualDisconnect.current = false;
    connect();

    return () => {
      isManualDisconnect.current = true;
      clearTimers();
      if (wsRef.current) {
        (wsRef.current as EventSource).close();
        wsRef.current = null;
      }
    };
  }, [connect, clearTimers]);

  // Reconnect when tab becomes visible (less aggressive)
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Only reconnect if tab is visible, status is disconnected, and it's been a while
      if (!document.hidden && status === 'disconnected' && !isManualDisconnect.current && reconnectAttempts < 3) {
        console.log('Tab became visible, attempting to reconnect SSE');
        setTimeout(() => {
          forceReconnect();
        }, 2000); // Wait 2 seconds before reconnecting
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [status, forceReconnect, reconnectAttempts]);

  // Reconnect when network comes back online
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network came back online, attempting to reconnect WebSocket');
      if (status !== 'connected' && !isManualDisconnect.current) {
        forceReconnect();
      }
    };

    const handleOffline = () => {
      console.log('Network went offline');
      setConnectionQuality('poor');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [status, forceReconnect]);

  return {
    status,
    isConnected: status === 'connected',
    isReconnecting: status === 'reconnecting',
    lastMessage,
    reconnectAttempts,
    connectionQuality,
    sendMessage,
    subscribeToJob,
    connect: forceReconnect,
    disconnect,
    queueLength: messageQueue.current.length
  };
}

interface UseWebSocketOptions {
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface WebSocketState {
  isConnected: boolean;
  error: string | null;
  reconnectAttempts: number;
}