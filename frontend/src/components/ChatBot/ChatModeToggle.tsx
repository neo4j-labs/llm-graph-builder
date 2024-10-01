import { StatusIndicator, Typography } from '@neo4j-ndl/react';
import { useMemo, useEffect } from 'react';
import { useFileContext } from '../../context/UsersFiles';
import CustomMenu from '../UI/Menu';
import { chatModeLables, chatModes } from '../../utils/Constants';
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
  const isCommunityAllowed = postProcessingTasks.includes('enable_communities');
  const { isGdsActive } = useCredentials();

  useEffect(() => {
    // If rows are selected, the mode is valid (either vector or graph+vector)
    if (selectedRows.length > 0) {
      if (!(chatMode === chatModeLables.vector || chatMode === chatModeLables.graph_vector)) {
        setchatMode(chatModeLables.graph_vector);
      }
    }
  }, [selectedRows.length, chatMode, setchatMode]);
  const memoizedChatModes = useMemo(() => {
    return isGdsActive && isCommunityAllowed
      ? chatModes
      : chatModes?.filter(
          (m) => !m.mode.includes(chatModeLables.entity_vector) && !m.mode.includes(chatModeLables.global_vector)
        );
  }, [isGdsActive, isCommunityAllowed]);
  const menuItems = useMemo(() => {
    return memoizedChatModes?.map((m) => {
      const isDisabled = Boolean(
        selectedRows.length && !(m.mode === chatModeLables.vector || m.mode === chatModeLables.graph_vector)
      );
      const handleModeChange = () => {
        if (isDisabled) {
          setchatMode(chatModeLables.graph_vector);
        } else {
          setchatMode(m.mode);
        }
        closeHandler();
      };
      return {
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
        onClick: handleModeChange,
        disabledCondition: isDisabled,
        description: (
          <span>
            {chatMode === m.mode && (
              <>
                <StatusIndicator type='success' /> {chatModeLables.selected}
              </>
            )}
            {isDisabled && (
              <>
                <StatusIndicator type='warning' /> {chatModeLables.unavailableChatMode}
              </>
            )}
          </span>
        ),
      };
    });
  }, [chatMode, memoizedChatModes, setchatMode, closeHandler, selectedRows]);

  useEffect(() => {
    if (!selectedRows.length && !chatMode) {
      setchatMode(chatModeLables.graph_vector_fulltext);
    }
  }, [setchatMode, selectedRows.length, chatMode]);
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
