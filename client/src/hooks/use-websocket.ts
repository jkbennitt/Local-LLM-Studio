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
  const heartbeatInterval = 30000; // 30 seconds

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
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
    }
    
    heartbeatTimer.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const now = Date.now();
        lastHeartbeat.current = now;
        
        try {
          wsRef.current.send(JSON.stringify({
            type: 'heartbeat',
            timestamp: now
          }));
        } catch (error) {
          console.error('Failed to send heartbeat:', error);
          setConnectionQuality('poor');
        }
      }
    }, heartbeatInterval);
  }, [heartbeatInterval]);

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
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    setStatus('connecting');
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        setReconnectAttempts(0);
        setConnectionQuality('good');
        console.log('WebSocket connected');
        
        startHeartbeat();
        processMessageQueue();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Handle heartbeat responses
          if (message.type === 'heartbeat') {
            const now = Date.now();
            const latency = now - lastHeartbeat.current;
            
            if (latency > 5000) {
              setConnectionQuality('poor');
            } else {
              setConnectionQuality('good');
            }
            return;
          }
          
          setLastMessage(message);
          if (onMessage) {
            onMessage(message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        clearTimers();
        setStatus('disconnected');
        console.log('WebSocket disconnected:', event.code, event.reason);
        
        // Only attempt to reconnect if not manually disconnected
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

      ws.onerror = (error) => {
        setStatus('error');
        setConnectionQuality('poor');
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setStatus('error');
    }
  }, [reconnectAttempts, maxReconnectAttempts, calculateBackoffDelay, startHeartbeat, processMessageQueue, onMessage, clearTimers]);

  const disconnect = useCallback(() => {
    isManualDisconnect.current = true;
    clearTimers();
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    setStatus('disconnected');
    setReconnectAttempts(0);
    messageQueue.current = [];
  }, [clearTimers]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send message:', error);
        messageQueue.current.push(message);
      }
    } else {
      console.warn('WebSocket is not connected, queuing message');
      messageQueue.current.push(message);
      
      // Attempt to reconnect if not already trying
      if (status === 'disconnected' && !isManualDisconnect.current) {
        connect();
      }
    }
  }, [status, connect]);

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
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, clearTimers]);

  // Reconnect when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && status === 'disconnected' && !isManualDisconnect.current) {
        console.log('Tab became visible, attempting to reconnect WebSocket');
        forceReconnect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [status, forceReconnect]);

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
