import { SegmentedControl, Tip } from '@neo4j-ndl/react';
import { ChatModeOptions } from '../../utils/Constants';
import { useFileContext } from '../../context/UsersFiles';

export default function ChatModeToggle({ inSidenav = false }) {
  const [graph, vector, _] = ChatModeOptions;
  const { chatMode, setchatMode } = useFileContext();
  
  return (
    <SegmentedControl
      className={inSidenav ? 'flex-col !h-full !ml-1' : ''}
      onChange={setchatMode}
      hasOnlyIcons={true}
      selected={chatMode}
      size={'large'}
    >
      {ChatModeOptions.map((i, idx) => {
        return (
          <>
              <Tip key={`insidenav${idx}`} allowedPlacements={inSidenav?['left']:['bottom']}>
                <Tip.Trigger>
                  <SegmentedControl.Item
                    className={
                      idx == ChatModeOptions.length - 1 && inSidenav
                        ? '!h-[85px]'
                        : idx == ChatModeOptions.length - 1
                        ? '!w-[80px]'
                        : ''
                    }
                    key={`${idx}`}
                    value={i.value}
                  >
                    {i.value === 'graph+vector' ? (
                      <span className={!inSidenav ? 'flex justify-center' : ''}>
                        <graph.Icon className='n-size-token-7' />
                        <span>+</span>
                        <vector.Icon className='n-size-token-7' />
                      </span>
                    ) : (
                      <i.Icon className='n-size-token-7' />
                    )}
                  </SegmentedControl.Item>
                </Tip.Trigger>
                <Tip.Content className={!inSidenav?`!z-[61]`:''}>{i.value}</Tip.Content>
              </Tip>
          </>
        );
      })}
    </SegmentedControl>
  );
}
