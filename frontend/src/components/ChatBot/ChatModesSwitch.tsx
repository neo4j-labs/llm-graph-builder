import { Flex, IconButton } from '@neo4j-ndl/react';
import { ChevronLeftIconSolid, ChevronRightIconSolid } from '@neo4j-ndl/react/icons';
import TipWrapper from '../UI/TipWrapper';
import { capitalize, capitalizeWithPlus } from '../../utils/Utils';

export default function ChatModesSwitch({
  switchToOtherMode,
  currentModeIndex,
  modescount,
  currentMode,
  isFullScreen,
}: {
  switchToOtherMode: (index: number) => void;
  currentModeIndex: number;
  modescount: number;
  currentMode: string;
  isFullScreen: boolean;
}) {
  const chatmodetoshow = currentMode.includes('+') ? capitalizeWithPlus(currentMode) : capitalize(currentMode);
  return (
    <Flex flexDirection='row' gap='1' alignItems='center'>
      <IconButton
        disabled={currentModeIndex === 0}
        size='small'
        clean
        onClick={() => switchToOtherMode(currentModeIndex - 1)}
      >
        <ChevronLeftIconSolid />
      </IconButton>
      <TipWrapper tooltip={chatmodetoshow} placement='top'>
        <span
          className={`n-body-medium  ${!isFullScreen ? 'max-w-[50px] text-ellipsis text-nowrap overflow-hidden' : ''}`}
        >
          {chatmodetoshow}
        </span>
      </TipWrapper>
      <IconButton
        disabled={currentModeIndex === modescount - 1}
        size='small'
        clean
        onClick={() => switchToOtherMode(currentModeIndex + 1)}
      >
        <ChevronRightIconSolid />
      </IconButton>
    </Flex>
  );
}
