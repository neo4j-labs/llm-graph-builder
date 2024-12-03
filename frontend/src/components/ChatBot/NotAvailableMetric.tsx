import { Flex, IconButton, Popover, Typography } from '@neo4j-ndl/react';
import { InformationCircleIconOutline } from '@neo4j-ndl/react/icons';

export default function NotAvailableMetric() {
  return (
    <Flex flexDirection='row' alignItems='center'>
      <span>N.A</span>
      <Popover placement='top-middle-bottom-middle' hasAnchorPortal={true}>
        <Popover.Trigger hasButtonWrapper>
          <IconButton size='small' isClean ariaLabel='infoicon'>
            <InformationCircleIconOutline />
          </IconButton>
        </Popover.Trigger>
        <Popover.Content className='p-2'>
          <Typography variant='body-small'>Some metrics are not available for Gemini model.</Typography>
        </Popover.Content>
      </Popover>
    </Flex>
  );
}
