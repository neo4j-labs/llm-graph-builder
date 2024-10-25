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
  const { setchatModes, chatModes, postProcessingTasks } = useFileContext();
  const isCommunityAllowed = postProcessingTasks.includes('enable_communities');
  const { isGdsActive } = useCredentials();
  useEffect(() => {
    if (!chatModes.length) {
      setchatModes([chatModeLables['graph+vector+fulltext']]);
    }
  }, [chatModes.length]);
  const memoizedChatModes = useMemo(() => {
    return isGdsActive && isCommunityAllowed
      ? AvailableModes
      : AvailableModes?.filter((m) => !m.mode.includes(chatModeLables['global search+vector+fulltext']));
  }, [isGdsActive, isCommunityAllowed]);
  const menuItems = useMemo(() => {
    return memoizedChatModes?.map((m) => {
      const handleModeChange = () => {
        if (chatModes.includes(m.mode)) {
          if (chatModes.length === 1) {
            return;
          }
          setchatModes((prev) => prev.filter((i) => i !== m.mode));
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
        disabledCondition: false,
        description: (
          <span>
            {chatModes.includes(m.mode) && (
              <>
                <StatusIndicator type='success' /> {chatModeLables.selected}
              </>
            )}
          </span>
        ),
      };
    });
  }, [chatModes, memoizedChatModes, closeHandler]);
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
