import React, { useState } from 'react';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  InputBase,
  Paper,
  Grid,
  Card,
  CardContent,
  Divider,
  Chip,
  Popover,
  Button
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  People,
  Security,
  Book,
  Settings,
  Logout,
  AccountCircle,
  Notifications,
  Search,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification, NotificationList } from '../../contexts/NotificationContext';

const drawerWidth = 280;
const collapsedDrawerWidth = 80;

const AdminLayout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [notificationAnchorEl, setNotificationAnchorEl] = useState(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { getUnreadCount } = useNotification();

  const menuItems = [
    { text: 'Tableau de bord', icon: <Dashboard />, path: '/admin/dashboard' },
    { text: 'Gestion utilisateurs', icon: <People />, path: '/admin/users' },
    { text: 'Affectation des rôles', icon: <Security />, path: '/admin/roles' },
    { text: 'Mise à jour dictionnaire', icon: <Book />, path: '/admin/dictionary' },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleDrawerCollapse = () => {
    setIsDrawerCollapsed(!isDrawerCollapsed);
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (event) => {
    setNotificationAnchorEl(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
    }
    handleMenuClose();
  };

  const getPageTitle = () => {
    const currentItem = menuItems.find(item => item.path === location.pathname);
    return currentItem ? currentItem.text : 'Administration Informatique';
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Toolbar 
        sx={{ 
          justifyContent: isDrawerCollapsed ? 'center' : 'space-between',
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: '#fafafa'
        }}
      >
        {!isDrawerCollapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ 
              bgcolor: '#3498db', 
              width: 32, 
              height: 32, 
              mr: 1,
              fontSize: '0.8rem'
            }}>
              SA
            </Avatar>
            <Typography variant="h6" sx={{ color: '#3498db', fontWeight: 'bold' }}>
              SA Management
            </Typography>
          </Box>
        )}
        
        <IconButton 
          onClick={handleDrawerCollapse}
          sx={{ 
            display: { xs: 'none', sm: 'flex' },
            ml: isDrawerCollapsed ? 0 : 'auto'
          }}
        >
          {isDrawerCollapsed ? <ChevronRight /> : <ChevronLeft />}
        </IconButton>
      </Toolbar>

      {/* Navigation */}
      <List sx={{ flexGrow: 1, px: 1, py: 2 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: 2,
                mx: 1,
                minHeight: 48,
                justifyContent: isDrawerCollapsed ? 'center' : 'initial',
                '&.Mui-selected': {
                  backgroundColor: '#3498db',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: '#2980b9',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
                '&:hover': {
                  backgroundColor: '#f0f0f0',
                },
              }}
            >
              <ListItemIcon 
                sx={{ 
                  minWidth: 0,
                  mr: isDrawerCollapsed ? 0 : 3,
                  justifyContent: 'center',
                }}
              >
                {item.icon}
              </ListItemIcon>
              {!isDrawerCollapsed && (
                <ListItemText 
                  primary={item.text} 
                  primaryTypographyProps={{
                    fontSize: '0.9rem',
                    fontWeight: 500
                  }}
                />
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* User Info */}
      {!isDrawerCollapsed && (
        <Box sx={{ 
          p: 2, 
          borderTop: '1px solid #e0e0e0',
          backgroundColor: '#fafafa'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ 
              bgcolor: '#3498db', 
              width: 40, 
              height: 40,
              mr: 2 
            }}>
              {user?.prenom_user?.[0]}{user?.nom_user?.[0]}
            </Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" noWrap>
                {user?.prenom_user} {user?.nom_user}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                Administrateur IT
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );

  const currentDrawerWidth = isDrawerCollapsed ? collapsedDrawerWidth : drawerWidth;

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${currentDrawerWidth}px)` },
          ml: { sm: `${currentDrawerWidth}px` },
          backgroundColor: 'white',
          color: 'text.primary',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {getPageTitle()}
          </Typography>

          {/* Search */}
          <Paper
            component="form"
            sx={{
              p: '2px 4px',
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              width: 250,
              mr: 2,
            }}
          >
            <InputBase
              sx={{ ml: 1, flex: 1 }}
              placeholder="Rechercher..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
            <IconButton type="button" sx={{ p: '10px' }}>
              <Search />
            </IconButton>
          </Paper>

          

          {/* Popover pour les notifications */}
          <Popover
            open={Boolean(notificationAnchorEl)}
            anchorEl={notificationAnchorEl}
            onClose={handleNotificationClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            PaperProps={{
              sx: {
                width: 400,
                maxWidth: '90vw',
                mt: 1,
                maxHeight: 500,
                overflow: 'hidden'
              }
            }}
          >
            <NotificationList maxHeight={400} />
          </Popover>

          {/* User Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={handleMenuClick} color="inherit">
              <Avatar sx={{ width: 32, height: 32, bgcolor: '#3498db' }}>
                {user?.prenom_user?.[0]}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{
                sx: {
                  mt: 1,
                  minWidth: 200,
                }
              }}
            >
              <MenuItem disabled>
                <AccountCircle sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="subtitle2">
                    {user?.prenom_user} {user?.nom_user}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {user?.email || 'admin@sa.com'}
                  </Typography>
                </Box>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <Logout sx={{ mr: 1 }} />
                Déconnexion
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { sm: currentDrawerWidth }, flexShrink: { sm: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth 
            },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: currentDrawerWidth,
              transition: 'width 0.3s ease',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${currentDrawerWidth}px)` },
          backgroundColor: '#f5f5f5',
          minHeight: '100vh',
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};

export default AdminLayout;