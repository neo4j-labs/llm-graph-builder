import { Flex, IconButton, Typography } from '@neo4j-ndl/react';
import { ChevronLeftIconSolid, ChevronRightIconSolid } from '@neo4j-ndl/react/icons';

export default function ChatModesSwitch({
  switchToOtherMode,
  currentModeIndex,
  modescount,
  currentMode,
}: {
  switchToOtherMode: (index: number) => void;
  currentModeIndex: number;
  modescount: number;
  currentMode: string;
}) {
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
      <Typography variant='body-medium'>{currentMode}</Typography>
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
