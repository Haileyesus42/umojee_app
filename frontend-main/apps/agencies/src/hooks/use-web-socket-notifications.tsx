import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { fetchNotifications, updateNotifications } from '../store/notifications/notificationSlice';

const useWebSocketNotifications = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Open WebSocket connection
    const socket = new WebSocket('ws://your-websocket-url');

    socket.onopen = () => {
      console.log('WebSocket connection established');
    };

    // Listen for messages from the WebSocket
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'NEW_NOTIFICATION') {
        // Dispatch action to update the notifications
        dispatch(fetchNotifications(data.notifications)); // Update the entire list
        dispatch(updateNotifications(data.notificationId)); // Mark a specific notification as seen
      }
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed');
    };

    // Clean up the WebSocket connection on component unmount
    return () => {
      socket.close();
    };
  }, [dispatch]);
};

export default useWebSocketNotifications;
