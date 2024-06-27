import React from 'react';
import SettingsModal from '../components/SettingModal';
import { SettingsModalProps } from '../types';

const SettingModalHOC: React.FC<SettingsModalProps> = ({
  openTextSchema,
  open,
  onClose,
  isSchema,
  settingView,
  setIsSchema,
  onContinue,
  onClear,
}) => {
  return (
    <SettingsModal
      open={open}
      onClose={onClose}
      openTextSchema={openTextSchema}
      onContinue={onContinue}
      isSchema={isSchema}
      setIsSchema={setIsSchema}
      settingView={settingView}
      onClear={onClear}
    />
  );
};
export default SettingModalHOC;
