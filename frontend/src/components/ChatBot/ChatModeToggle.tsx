import { SegmentedControl } from '@neo4j-ndl/react';
import { ChatModeOptions } from '../../utils/Constants';
import { useFileContext } from '../../context/UsersFiles';

export default function ChatModeToggle({ inSidenav = false }) {
  const { chatMode, setchatMode } = useFileContext();
  return (
    <SegmentedControl
      className={inSidenav ? 'flex-col !h-full !ml-1' : ''}
      onChange={setchatMode}
      hasOnlyIcons={true}
      selected={chatMode}
      size={inSidenav ? 'large' : 'small'}
    >
      {ChatModeOptions.map((i, idx) => (
        <SegmentedControl.Item key={`${idx}`} value={i.value}>
          {<i.Icon className='n-size-token-7' />}
        </SegmentedControl.Item>
      ))}
    </SegmentedControl>
  );
}
