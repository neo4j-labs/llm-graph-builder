import { Button, Dialog, Flex, Radio } from '@neo4j-ndl/react';
import { RETRY_OPIONS } from '../../../utils/Constants';
import { useFileContext } from '../../../context/UsersFiles';
import { capitalize } from '../../../utils/Utils';

export default function RetryConfirmationDialog({
  open,
  onClose,
  fileId,
}: {
  open: boolean;
  onClose: () => void;
  fileId: string;
}) {
  const { filesData, setFilesData } = useFileContext();
  const file = filesData.find((c) => c.id === fileId);
  return (
    <Dialog open={open} onClose={onClose}>
      <Dialog.Header>Retry Options</Dialog.Header>
      <Dialog.Content>
        <Flex>
          {file?.status != 'Completed'
            ? RETRY_OPIONS.map((o) => {
                return (
                  <Radio
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
                  />
                );
              })
            : RETRY_OPIONS.slice(0, 2).map((o) => {
                return (
                  <Radio
                    name='retryoptions'
                    onChange={(e) => {
                      setFilesData((prev) => {
                        return prev.map((f) => {
                          return f.id === fileId ? { ...f, retryOptionStatus: e.target.checked, retryOption: o } : f;
                        });
                      });
                    }}
                    checked={o === file?.retryOption && file?.retryOptionStatus}
                    label={o
                      .split('_')
                      .map((s) => capitalize(s))
                      .join(' ')}
                  />
                );
              })}
        </Flex>
        <Dialog.Actions>
          <Dialog.Actions className='!mt-3'>
            <Button onClick={() => {}} size='large'>
              Continue
            </Button>
          </Dialog.Actions>
        </Dialog.Actions>
      </Dialog.Content>
    </Dialog>
  );
}
