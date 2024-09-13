import { StatusIndicator } from '@neo4j-ndl/react';
import { useMemo } from 'react';
import { useFileContext } from '../../context/UsersFiles';
import CustomMenu from '../UI/Menu';
import { chatModes } from '../../utils/Constants';
import { capitalize } from '@mui/material';
import { capitalizeWithPlus } from '../../utils/Utils';
import { useCredentials } from '../../context/UserCredentials';
export default function ChatModeToggle({
  menuAnchor,
  closeHandler = () => { },
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
  const { setchatMode, chatMode, postProcessingTasks } = useFileContext();
  const isCommunityAllowed = postProcessingTasks.includes('create_communities');
  const { isGdsActive } = useCredentials();
  // Memoized chat modes list
  const memoizedChatModes = useMemo(() => {
    return isGdsActive && isCommunityAllowed
      ? chatModes
      : chatModes?.filter((m) => !m.mode.includes('community'));
  }, [isGdsActive, isCommunityAllowed]);
  // Memoized menu items to prevent re-rendering
  const menuItems = useMemo(() => {
    return memoizedChatModes?.map((m) => ({
      title: (
        <div>
          <span className="font-bold">
            {m.mode.includes('+') ? capitalizeWithPlus(m.mode) : capitalize(m.mode)}
          </span>
          <p>{m.description}</p>
        </div>
      ),
      onClick: () => {
        setchatMode(m.mode); // Set the selected mode
      },
      disabledCondition: false,
      description: (
        <span>
          {chatMode === m.mode && (
            <>
              <StatusIndicator type="success" /> Selected
            </>
          )}
        </span>
      ),
    }));
  }, [chatMode, memoizedChatModes, setchatMode]);
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