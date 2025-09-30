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
  Chip
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Campaign,
  CloudUpload,
  Phone,
  Group,
  Settings,
  Logout,
  AccountCircle,
  Notifications,
  Search,
  ChevronLeft,
  ChevronRight,
  // Icônes pour le menu
  Analytics,
  Upload,
  CallMade,
  CheckCircleOutline,
  CancelOutlined,
  
  // Icônes pour les stats du dashboard
  PhoneInTalk,
  GroupAdd,
  GroupRemove,
  
  // Icônes pour l'activité récente
  PersonAdd,
  PhoneMissed,
  FileUpload,
  
  // Icônes utiles
  Headset,
  SupportAgent,
  ContactPhone,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const drawerWidth = 280;
const collapsedDrawerWidth = 80;

const ReceptionLayout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  // Menu items avec icônes optimisées
  const menuItems = [
    { text: 'Tableau de bord', icon: <Analytics />, path: '/reception/dashboard' },
    { text: 'Campagnes', icon: <Campaign />, path: '/reception/campagnes' },
    { text: 'Import Participants', icon: <Upload />, path: '/reception/import' },
    { text: 'Gestion Appels', icon: <ContactPhone />, path: '/reception/participants' },
    { text: 'Participants confirmés', icon: <CheckCircleOutline />, path: '/reception/beneficiaires-oui' },
    { text: 'Participants non-répondants', icon: <CancelOutlined />, path: '/reception/beneficiaires-non' },
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
    return currentItem ? currentItem.text : 'Module Réception';
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header avec icône améliorée */}
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
              <Headset />
            </Avatar>
            <Typography variant="h6" sx={{ color: '#3498db', fontWeight: 'bold' }}>
              Module Réception
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

      {/* User Info avec icône d'agent */}
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
              <SupportAgent />
            </Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" noWrap>
                {user?.prenom} {user?.nom}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                Agent Réception
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
              placeholder="Rechercher un participant..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
            <IconButton type="button" sx={{ p: '10px' }}>
              <Search />
            </IconButton>
          </Paper>

          

          {/* User Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={handleMenuClick} color="inherit">
              <Avatar sx={{ width: 32, height: 32, bgcolor: '#3498db' }}>
                <SupportAgent />
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
                    {user?.prenom} {user?.nom}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Agent Réception
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

      {/* Main content avec icônes optimisées */}
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
        
        {children || (
          <Box>
            {/* Dashboard Stats avec icônes améliorées */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ background: 'linear-gradient(135deg, #3498db 0%, #00f2fe 100%)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', color: 'white' }}>
                      <PhoneInTalk sx={{ fontSize: 40, mr: 2 }} />
                      <Box>
                        <Typography variant="h4" fontWeight="bold">
                          89
                        </Typography>
                        <Typography variant="body2">
                          Appels aujourd'hui
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', color: 'white' }}>
                      <GroupAdd sx={{ fontSize: 40, mr: 2 }} />
                      <Box>
                        <Typography variant="h4" fontWeight="bold">
                          342
                        </Typography>
                        <Typography variant="body2">
                          Participants OUI
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', color: 'white' }}>
                      <GroupRemove sx={{ fontSize: 40, mr: 2 }} />
                      <Box>
                        <Typography variant="h4" fontWeight="bold">
                          156
                        </Typography>
                        <Typography variant="body2">
                          Participants NON
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', color: 'white' }}>
                      <Campaign sx={{ fontSize: 40, mr: 2 }} />
                      <Box>
                        <Typography variant="h4" fontWeight="bold">
                          12
                        </Typography>
                        <Typography variant="body2">
                          Campagnes actives
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Recent Activity avec icônes spécifiques */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Activité récente
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <PersonAdd sx={{ color: '#27ae60' }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Nouveau participant accepté"
                      secondary="Campagne Prévention - Il y a 5 minutes"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <PhoneMissed sx={{ color: '#e74c3c' }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Appel manqué"
                      secondary="Participant ID: 1234 - Il y a 12 minutes"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <FileUpload sx={{ color: '#3498db' }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Import Excel terminé"
                      secondary="250 nouveaux participants - Il y a 1 heure"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ReceptionLayout;