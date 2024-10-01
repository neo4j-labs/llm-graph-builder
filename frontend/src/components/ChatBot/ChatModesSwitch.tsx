import { Flex, IconButton, Typography } from '@neo4j-ndl/react';
import { ChevronLeftIconSolid, ChevronRightIconSolid } from '@neo4j-ndl/react/icons';

export default function ChatModesSwitch({
  switchToPreviousMode,
  switchToNextMode,
  currentMode,
}: {
  switchToPreviousMode: () => void;
  switchToNextMode: () => void;
  currentMode: string;
}) {
  return (
    <Flex flexDirection='row' gap='1' alignItems='center'>
      <IconButton size='small' clean onClick={() => switchToPreviousMode()}>
        <ChevronLeftIconSolid />
      </IconButton>
      <Typography variant='body-medium'>{currentMode}</Typography>
      <IconButton size='small' clean onClick={() => switchToNextMode()}>
        <ChevronRightIconSolid />
      </IconButton>
    </Flex>
  );
}
