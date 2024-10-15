import { Banner, Dialog, Flex, Radio } from '@neo4j-ndl/react';
import { RETRY_OPIONS } from '../../../utils/Constants';
import { useFileContext } from '../../../context/UsersFiles';
import { capitalize } from '../../../utils/Utils';
import { BannerAlertProps } from '../../../types';
import ButtonWithToolTip from '../../UI/ButtonWithToolTip';
import { memo } from 'react';

function RetryConfirmationDialog({
  open,
  onClose,
  fileId,
  retryLoading,
  retryHandler,
  alertStatus,
  onBannerClose,
}: {
  open: boolean;
  onClose: () => void;
  fileId: string;
  retryLoading: boolean;
  alertStatus: BannerAlertProps;
  retryHandler: (filename: string, retryoption: string) => void;
  onBannerClose: () => void;
}) {
  const { filesData, setFilesData } = useFileContext();
  const file = filesData.find((c) => c.id === fileId);
  const RetryOptionsForFile = file?.status != 'Completed' ? RETRY_OPIONS : RETRY_OPIONS.slice(0, 2);
  return (
    <Dialog open={open} onClose={onClose}>
      <Dialog.Header>Reprocess Options</Dialog.Header>
      <Dialog.Content>
        {alertStatus.showAlert && (
          <Banner closeable onClose={onBannerClose} className='my-4' type={alertStatus.alertType}>
            {alertStatus.alertMessage}
          </Banner>
        )}
        <Flex>
          {RetryOptionsForFile.map((o, i) => {
            return (
              <Radio
                key={`${o}${i}`}
                onChange={(e) => {
                  setFilesData((prev) => {
                    return prev.map((f) => {
                      return f.id === fileId ? { ...f, retryOptionStatus: e.target.checked, retryOption: o } : f;
                    });
                  });
                }}
                name='retryoptions'
                checked={o === file?.retryOption && file?.retryOptionStatus}
                label={o
                  .split('_')
                  .map((s) => capitalize(s))
                  .join(' ')}
                onKeyDown={(e) => {
                  if (e.code === 'Enter' && file?.retryOption.length) {
                    retryHandler(file?.name as string, file?.retryOption as string);
                  }
                }}
              />
            );
          })}
        </Flex>
        <Dialog.Actions>
          <Dialog.Actions className='!mt-3'>
            <ButtonWithToolTip
              placement='top'
              label='Retry action button'
              text={!file?.retryOption.length ? `Please Select One Of The Option` : 'Reset The Status To Reprocess'}
              loading={retryLoading}
              disabled={!file?.retryOption.length}
              onClick={() => {
                retryHandler(file?.name as string, file?.retryOption as string);
              }}
              size='large'
            >
              Continue
            </ButtonWithToolTip>
          </Dialog.Actions>
        </Dialog.Actions>
      </Dialog.Content>
    </Dialog>
  );
}
export default memo(RetryConfirmationDialog);
