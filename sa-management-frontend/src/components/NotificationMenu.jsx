// src/components/NotificationMenu.jsx

import React, { useState, useEffect } from 'react';
import {
  Badge,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  ListItemText,
  Divider,
  Button
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { getNotifications, markAllAsRead } from '../services/notificationService';
import moment from 'moment';

const NotificationMenu = () => {
  const [notifications, setNotifications] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);

  const open = Boolean(anchorEl);

  const fetchData = async () => {
    const data = await getNotifications();
    setNotifications(data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    fetchData();
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleOpen}>
        <Badge badgeContent={notifications.length} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem disabled>
          <Typography variant="subtitle2">Notifications</Typography>
        </MenuItem>
        <Divider />
        {notifications.length === 0 ? (
          <MenuItem disabled>Aucune notification</MenuItem>
        ) : (
          notifications.map((notif, index) => (
            <MenuItem key={index}>
              <ListItemText
                primary={notif.data?.message || 'Notification'}
                secondary={moment(notif.created_at).fromNow()}
              />
            </MenuItem>
          ))
        )}
        {notifications.length > 0 && (
          <>
            <Divider />
            <MenuItem>
              <Button fullWidth onClick={handleMarkAllAsRead}>
                Marquer tout comme lu
              </Button>
            </MenuItem>
          </>
        )}
      </Menu>
    </>
  );
};

export default NotificationMenu;
