import React from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { CustomAlertProps } from '../types';

const CustomAlert: React.FC<CustomAlertProps> = ({ open, handleClose, alertMessage }) => {
  return (
    <Snackbar
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      open={open}
      autoHideDuration={6000}
      onClose={handleClose}
    >
      <Alert onClose={handleClose} severity='error' variant='filled' sx={{ width: '100%' }}>
        {alertMessage}
      </Alert>
    </Snackbar>
  );
};
export default CustomAlert;
