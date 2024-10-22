import { StatusIndicator, Typography } from '@neo4j-ndl/react';
import { useMemo, useEffect } from 'react';
import { useFileContext } from '../../context/UsersFiles';
import CustomMenu from '../UI/Menu';
import { chatModeLables, chatModes as AvailableModes, chatModeReadableLables } from '../../utils/Constants';
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
  const { setchatModes, chatModes, postProcessingTasks, selectedRows } = useFileContext();
  const isCommunityAllowed = postProcessingTasks.includes('enable_communities');
  const { isGdsActive } = useCredentials();

  useEffect(() => {
    // If rows are selected, the mode is valid (either vector or graph+vector)
    if (selectedRows.length > 0) {
      if (
        chatModes.includes(chatModeLables.graph) ||
        chatModes.includes(chatModeLables.fulltext) ||
        chatModes.includes(chatModeLables['global search+vector+fulltext'])
      ) {
        setchatModes((prev) =>
          prev.filter(
            (m) => ![chatModeLables.graph, chatModeLables.fulltext, chatModeLables['graph+vector+fulltext']].includes(m)
          )
        );
      }
      if (!(chatModes.includes(chatModeLables.vector) || chatModes.includes(chatModeLables['graph+vector']))) {
        setchatModes([chatModeLables['graph+vector']]);
      }
    }
  }, [selectedRows.length, chatModes.length]);

  const memoizedChatModes = useMemo(() => {
    return isGdsActive && isCommunityAllowed
      ? AvailableModes
      : AvailableModes?.filter((m) => !m.mode.includes(chatModeLables['global search+vector+fulltext']));
  }, [isGdsActive, isCommunityAllowed]);
  const menuItems = useMemo(() => {
    return memoizedChatModes?.map((m) => {
      const isDisabled = Boolean(
        selectedRows.length && !(m.mode === chatModeLables.vector || m.mode === chatModeLables['graph+vector'])
      );
      const handleModeChange = () => {
        if (isDisabled) {
          setchatModes([chatModeLables['graph+vector']]);
        } else if (chatModes.includes(m.mode)) {
          setchatModes((prev) => prev.filter((i) => i != m.mode));
        } else {
          setchatModes((prev) => [...prev, m.mode]);
        }
        closeHandler();
      };
      return {
        title: (
          <div>
            <Typography variant='subheading-small'>
              {chatModeReadableLables[m.mode].includes('+')
                ? capitalizeWithPlus(chatModeReadableLables[m.mode])
                : capitalize(chatModeReadableLables[m.mode])}
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
            {chatModes.includes(m.mode) && (
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
  }, [chatModes.length, memoizedChatModes, closeHandler, selectedRows]);

  useEffect(() => {
    if (!selectedRows.length && !chatModes.length) {
      setchatModes([]);
    }
  }, [selectedRows.length, chatModes.length]);
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
