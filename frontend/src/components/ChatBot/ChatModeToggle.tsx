import { StatusIndicator, Typography } from '@neo4j-ndl/react';
import { useEffect, useMemo } from 'react';
import { useFileContext } from '../../context/UsersFiles';
import CustomMenu from '../UI/Menu';
import { chatModes } from '../../utils/Constants';
import { capitalize } from '@mui/material';
import { capitalizeWithPlus } from '../../utils/Utils';
import { useCredentials } from '../../context/UserCredentials';
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
  const { setchatMode, chatMode, postProcessingTasks, selectedRows } = useFileContext();
  const isCommunityAllowed = postProcessingTasks.includes('create_communities');
  const { isGdsActive } = useCredentials();
  const memoizedChatModes = useMemo(() => {
    return isGdsActive && isCommunityAllowed
      ? chatModes
      : chatModes?.filter((m) => !m.mode.includes('entity search+vector'));
  }, [isGdsActive, isCommunityAllowed]);

  useEffect(() => {
    if (selectedRows.length && chatMode !== 'graph+vector') {
      setchatMode('graph+vector');
    }
  }, [selectedRows, chatMode, setchatMode]);

  const menuItems = useMemo(() => {
    return memoizedChatModes?.map((m) => ({
      title: (
        <div>
          <Typography variant='subheading-small'>
            {m.mode.includes('+') ? capitalizeWithPlus(m.mode) : capitalize(m.mode)}
          </Typography>
          <div>
            <Typography variant='body-small'>{m.description}</Typography>
          </div>
        </div>
      ),
      onClick: () => {
        setchatMode(m.mode);
        closeHandler();
      },
      disabledCondition: Boolean(selectedRows.length && !(m.mode === 'vector' || m.mode === 'graph+vector')),
      description: (
        <span>
          {chatMode === m.mode && (
            <>
              <StatusIndicator type='success' /> Selected
            </>
          )}
        </span>
      ),
    }));
  }, [chatMode, memoizedChatModes, setchatMode, closeHandler, selectedRows]);
  return (
    <CustomMenu
      closeHandler={closeHandler}
      open={open}
      MenuAnchor={menuAnchor}
      anchorPortal={anchorPortal}
      disableBackdrop={disableBackdrop}
      items={menuItems}
    />
  );
}
