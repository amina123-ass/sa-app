import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

export const StatsCard = ({ title, value, icon, color = 'primary', subtitle, trend }) => {
  return (
    <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box flex={1}>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="h2" color={color} fontWeight="bold">
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Typography 
                variant="caption" 
                color={trend > 0 ? 'success.main' : 'error.main'}
                sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}
              >
                {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 60,
              height: 60,
              borderRadius: '50%',
              backgroundColor: `${color}.lighter`,
              color: `${color}.main`,
              fontSize: '1.5rem'
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};