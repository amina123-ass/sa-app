import React, { useState, useEffect } from 'react';
import {
  Badge,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  Notifications,
  Warning,
  Info,
  CheckCircle,
  Schedule
} from '@mui/icons-material';
import { upasService } from '../../services/upasService';

const NotificationBadge = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
    // Actualiser toutes les 5 minutes
    const interval = setInterval(loadNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await upasService.getDashboard();
      const alertes = data.alertes || [];
      setNotifications(alertes);
      setUnreadCount(alertes.length);
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
    }
  };

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    setUnreadCount(0);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'urgence': return <Warning color="error" />;
      case 'retard': return <Schedule color="warning" />;
      case 'info': return <Info color="info" />;
      case 'success': return <CheckCircle color="success" />;
      default: return <Info />;
    }
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleClick}>
        <Badge badgeContent={unreadCount} color="error">
          <Notifications />
        </Badge>
      </IconButton>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: { width: 350, maxHeight: 400 }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6">Notifications</Typography>
        </Box>
        <Divider />
        
        {notifications.length === 0 ? (
          <MenuItem>
            <Typography color="text.secondary">
              Aucune notification
            </Typography>
          </MenuItem>
        ) : (
          <List sx={{ p: 0 }}>
            {notifications.map((notification, index) => (
              <ListItem key={index} divider>
                <ListItemIcon>
                  {getIcon(notification.type)}
                </ListItemIcon>
                <ListItemText
                  primary={notification.message}
                  secondary={`Il y a ${Math.ceil(Math.random() * 30)} minutes`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Menu>
    </>
  );
};

export default NotificationBadge;