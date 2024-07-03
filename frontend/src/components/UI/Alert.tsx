import React from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { CustomAlertProps } from '../../types';

const CustomAlert: React.FC<CustomAlertProps> = ({ open, handleClose, alertMessage, severity = 'error' }) => {
  return (
    <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} open={open} onClose={handleClose}>
      <Alert onClose={handleClose} severity={severity} variant='filled' sx={{ width: '100%' }}>
        {alertMessage}
      </Alert>
    </Snackbar>
  );
};
export default CustomAlert;
