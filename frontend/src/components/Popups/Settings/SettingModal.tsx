import { Dialog } from '@neo4j-ndl/react';
import { SettingsModalProps } from '../../../types';
import EntityExtractionSetting from '../GraphEnhancementDialog/EnitityExtraction/EntityExtractionSetting';

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose, openTextSchema, onContinue, settingView }) => {
  return (
    <Dialog size='medium' open={open} aria-labelledby='form-dialog-title' onClose={onClose}>
      <Dialog.Header id='form-dialog-title'>Entity Graph Extraction Settings</Dialog.Header>
      <Dialog.Content className='n-flex n-flex-col n-gap-token-4'>
        <EntityExtractionSetting
          onClose={onClose}
          view='Dialog'
          onContinue={onContinue != undefined ? onContinue : () => {}}
          openTextSchema={openTextSchema}
          settingView={settingView}
          open={open}
        />
      </Dialog.Content>
    </Dialog>
  );
};

export default SettingsModal;
