import { StatusIndicator } from '@neo4j-ndl/react';
import { useMemo } from 'react';
import { useFileContext } from '../../context/UsersFiles';
import CustomMenu from '../UI/Menu';
import { chatModes } from '../../utils/Constants';
import { capitalize } from '@mui/material';

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
      items={useMemo(
        () =>
          chatModes?.map((m) => {
            return {
              title: m.includes('+') ? 'Graph + Vector' : capitalize(m),
              onClick: () => {
                setchatMode(m);
              },
              disabledCondition: false,
              description: (
                <span>
                  {chatMode === m && (
                    <>
                      <StatusIndicator type={`${chatMode === m ? 'success' : 'unknown'}`} /> Selected
                    </>
                  )}
                </span>
              ),
            };
          }),
        [chatMode, chatModes]
      )}
    ></CustomMenu>
  );
}
