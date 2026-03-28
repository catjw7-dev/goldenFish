import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

let _socket = null;

export function useSocket() {
  const [ready, setReady] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!_socket) {
      _socket = io(window.location.origin, { transports: ['websocket', 'polling'] });
    }
    ref.current = _socket;
    const onConnect = () => setReady(true);
    const onDisconnect = () => setReady(false);
    _socket.on('connect', onConnect);
    _socket.on('disconnect', onDisconnect);
    if (_socket.connected) setReady(true);
    return () => {
      _socket.off('connect', onConnect);
      _socket.off('disconnect', onDisconnect);
    };
  }, []);

  return { socket: ref.current || _socket, ready };
}
