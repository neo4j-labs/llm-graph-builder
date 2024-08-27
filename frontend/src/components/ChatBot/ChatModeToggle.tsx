import { SegmentedControl, Tip } from '@neo4j-ndl/react';
import { ChatModeOptions } from '../../utils/Constants';
import { useFileContext } from '../../context/UsersFiles';
import { DbmsIcon } from '@neo4j-ndl/react/icons';
import { capitalize } from '@mui/material';

export default function ChatModeToggle({ inSidenav = false }) {
  const [vector, _] = ChatModeOptions;
  const { chatMode, setchatMode } = useFileContext();

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
              title: m.includes('+')
                ? m
                    .split('+')
                    .map((s) => capitalize(s))
                    .join('+')
                : capitalize(m),
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
