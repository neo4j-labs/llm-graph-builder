import { StatusIndicator } from '@neo4j-ndl/react';
import { useFileContext } from '../../context/UsersFiles';
import CustomMenu from '../UI/Menu';

export default function ChatModeToggle({
  menuAnchor,
  closeHandler = () => {},
  open,
  anchorPortal = true,
  disableBackdrop = false,
}: {
  menuAnchor: HTMLElement | null;
  closeHandler?: () => void;
  open: boolean;
  anchorPortal?: boolean;
  disableBackdrop?: boolean;
}) {
  const { setchatMode, chatMode } = useFileContext();

  return (
    <CustomMenu
      closeHandler={closeHandler}
      open={open}
      MenuAnchor={menuAnchor}
      anchorPortal={anchorPortal}
      disableBackdrop={disableBackdrop}
      items={[
        {
          title: 'Vector',
          onClick: () => {
            setchatMode('vector');
          },
          disabledCondition: false,
          description: (
            <span>
              {chatMode == 'vector' && (
                <>
                 <StatusIndicator type='success' /> Selected 
                </>
              )}
            </span>
          ),
        },
        {
          title: 'Vector + Graph',
          onClick: () => {
            setchatMode('graph+vector');
          },
          disabledCondition: false,
          description: (
            <span>
              {chatMode === 'graph+vector' && (
                <>
                 <StatusIndicator type={`${chatMode === 'graph+vector' ? 'success' : 'unknown'}`} /> Selected 
                </>
              )}
            </span>
          ),
        },
      ]}
    ></CustomMenu>
  );
}
