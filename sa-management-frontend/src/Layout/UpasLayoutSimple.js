// src/components/Layout/UpasLayoutSimple.js - Version avec notifications intégrées
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
  Divider,
  Breadcrumbs,
  Link,
  Chip,
  Popover // ← AJOUTÉ pour les notifications
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Campaign,
  People,
  FamilyRestroom,
  MedicalServices,
  Assessment,
  Settings,
  Logout,
  AccountCircle,
  Notifications,
  Search,
  ChevronLeft,
  ChevronRight,
  NavigateNext,
  
  // Icônes spécifiques
  SupervisorAccount,
  ManageAccounts,
  HealthAndSafety,
  FormatListBulleted,
  Groups,
  Star,
  HourglassEmpty
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification, NotificationList } from '../../contexts/NotificationContext'; // ← AJOUTÉ

const drawerWidth = 280;
const collapsedDrawerWidth = 80;

const UpasLayoutSimple = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [notificationAnchorEl, setNotificationAnchorEl] = useState(null); // ← AJOUTÉ
  
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { getUnreadCount } = useNotification(); // ← AJOUTÉ

  // Menu items existants (pas de changement)
  const menuItems = [
    { text: 'Tableau de bord', icon: <Dashboard />, path: '/upas/dashboard' },
    { text: 'Campagnes médicales', icon: <Campaign />, path: '/upas/campagnes' },
    { text: 'Bénéficiaires', icon: <People />, path: '/upas/beneficiaires' },
    { text: 'Kafala', icon: <FamilyRestroom />, path: '/upas/kafalas' },
    { text: 'Assistances médicales', icon: <MedicalServices />, path: '/upas/assistances' },
    { text: 'Statistiques & Rapports', icon: <Assessment />, path: '/upas/statistiques' },
  ];

  // Fonctions existantes (pas de changement)
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

  // ← NOUVELLES FONCTIONS pour les notifications
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

  // Fonctions existantes pour la navigation (pas de changement)
  const getPageTitle = () => {
    const pathname = location.pathname;
    
    if (pathname.includes('/campagnes/') && pathname.includes('/listes')) {
      return 'Listes Groupées par Campagne';
    }
    
    if (pathname.includes('/campagnes/') && pathname.includes('/statistiques')) {
      return 'Statistiques de Campagne';
    }
    
    const currentItem = menuItems.find(item => pathname.startsWith(item.path));
    return currentItem ? currentItem.text : 'UPAS Management';
  };

  const isMenuItemActive = (itemPath) => {
    const pathname = location.pathname;
    
    if (itemPath === '/upas/campagnes') {
      return pathname.startsWith('/upas/campagnes');
    }
    
    return pathname === itemPath || pathname.startsWith(itemPath + '/');
  };

  const generateBreadcrumbs = () => {
    const pathname = location.pathname;
    const breadcrumbs = [];
    
    breadcrumbs.push({
      label: 'Tableau de bord',
      path: '/upas/dashboard',
      icon: <Dashboard fontSize="small" />
    });

    if (pathname.includes('/campagnes/') && pathname.includes('/listes')) {
      breadcrumbs.push({
        label: 'Campagnes',
        path: '/upas/campagnes',
        icon: <Campaign fontSize="small" />
      });
      breadcrumbs.push({
        label: 'Listes Groupées',
        path: pathname,
        icon: <FormatListBulleted fontSize="small" />,
        active: true
      });
    } else if (pathname.includes('/campagnes/') && pathname.includes('/statistiques')) {
      breadcrumbs.push({
        label: 'Campagnes',
        path: '/upas/campagnes',
        icon: <Campaign fontSize="small" />
      });
      breadcrumbs.push({
        label: 'Statistiques',
        path: pathname,
        icon: <Assessment fontSize="small" />,
        active: true
      });
    } else {
      const currentItem = menuItems.find(item => pathname.startsWith(item.path));
      if (currentItem && currentItem.path !== '/upas/dashboard') {
        breadcrumbs.push({
          label: currentItem.text,
          path: currentItem.path,
          icon: currentItem.icon,
          active: true
        });
      }
    }

    return breadcrumbs;
  };

  // Drawer existant (pas de changement)
  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header avec icône améliorée */}
      <Toolbar 
        sx={{ 
          justifyContent: isDrawerCollapsed ? 'center' : 'space-between',
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: '#f8f9fa'
        }}
      >
        {!isDrawerCollapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ 
              bgcolor: '#2196f3', 
              width: 32, 
              height: 32, 
              mr: 1,
              fontSize: '0.8rem'
            }}>
              <HealthAndSafety />
            </Avatar>
            <Typography variant="h6" sx={{ color: '#2196f3', fontWeight: 'bold' }}>
              UPAS Management
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
        {menuItems.map((item) => {
          const isActive = isMenuItemActive(item.path);
          
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={isActive}
                onClick={() => {
                  navigate(item.path);
                  if (mobileOpen) setMobileOpen(false);
                }}
                sx={{
                  borderRadius: 2,
                  mx: 1,
                  minHeight: 48,
                  justifyContent: isDrawerCollapsed ? 'center' : 'initial',
                  '&.Mui-selected': {
                    backgroundColor: '#2196f3',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: '#1976d2',
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
          );
        })}
      </List>

      {/* User Info */}
      {!isDrawerCollapsed && (
        <Box sx={{ 
          p: 2, 
          borderTop: '1px solid #e0e0e0',
          backgroundColor: '#f8f9fa'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ 
              bgcolor: '#2196f3', 
              width: 40, 
              height: 40,
              mr: 2 
            }}>
              <SupervisorAccount />
            </Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" noWrap>
                {user?.nom_user} {user?.prenom_user}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                Responsable UPAS
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );

  const currentDrawerWidth = isDrawerCollapsed ? collapsedDrawerWidth : drawerWidth;
  const breadcrumbs = generateBreadcrumbs();

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* AppBar MODIFIÉ avec notifications */}
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
          
          {/* Titre avec breadcrumbs (pas de changement) */}
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="div" sx={{ mb: 0.5 }}>
              {getPageTitle()}
            </Typography>
            
            <Breadcrumbs
              separator={<NavigateNext fontSize="small" />}
              sx={{ 
                fontSize: '0.8rem',
                '& .MuiBreadcrumbs-separator': {
                  color: '#9e9e9e'
                }
              }}
            >
              {breadcrumbs.map((crumb, index) => (
                <Link
                  key={index}
                  color={crumb.active ? 'primary' : 'inherit'}
                  onClick={() => !crumb.active && navigate(crumb.path)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    cursor: crumb.active ? 'default' : 'pointer',
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: crumb.active ? 'none' : 'underline'
                    }
                  }}
                >
                  {crumb.icon}
                  {crumb.label}
                </Link>
              ))}
            </Breadcrumbs>
          </Box>

          {/* Search (pas de changement) */}
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

          {/* ← NOTIFICATIONS MODIFIÉES avec badge dynamique */}
          <IconButton 
            color="inherit" 
            sx={{ mr: 1 }}
            onClick={handleNotificationClick}
          >
            <Badge badgeContent={getUnreadCount()} color="error">
              <Notifications />
            </Badge>
          </IconButton>

          {/* ← POPOVER AJOUTÉ pour les notifications */}
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

          {/* User Menu (pas de changement) */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={handleMenuClick} color="inherit">
              <Avatar sx={{ width: 32, height: 32, bgcolor: '#2196f3' }}>
                <ManageAccounts />
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
                    {user?.nom_user} {user?.prenom_user}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Responsable UPAS
                  </Typography>
                </Box>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleMenuClose}>
                <Settings sx={{ mr: 1 }} />
                Paramètres
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <Logout sx={{ mr: 1 }} />
                Déconnexion
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Drawer (pas de changement) */}
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

      {/* Main content (pas de changement) */}
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
        
        {/* Indicateur de page spéciale pour les listes groupées (pas de changement) */}
        {location.pathname.includes('/campagnes/') && location.pathname.includes('/listes') && (
          <Box sx={{ 
            mb: 2, 
            p: 2, 
            bgcolor: '#e7f3ff', 
            borderRadius: 2,
            border: '1px solid #b3d7ff',
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}>
            <FormatListBulleted sx={{ color: '#0066cc' }} />
            <Box>
              <Typography variant="subtitle2" sx={{ color: '#0066cc', fontWeight: 600 }}>
                Mode Listes Groupées
              </Typography>
              <Typography variant="caption" sx={{ color: '#004085' }}>
                Affichage des bénéficiaires par décision pour cette campagne
              </Typography>
            </Box>
            <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
              <Chip 
                icon={<Groups />} 
                label="Participants" 
                size="small" 
                color="default"
                variant="outlined"
              />
              <Chip 
                icon={<Star />} 
                label="Liste Principale" 
                size="small" 
                color="primary"
                variant="outlined"
              />
              <Chip 
                icon={<HourglassEmpty />} 
                label="Liste d'Attente" 
                size="small" 
                color="secondary"
                variant="outlined"
              />
            </Box>
          </Box>
        )}
        
        {children}
      </Box>
    </Box>
  );
};

export default UpasLayoutSimple;