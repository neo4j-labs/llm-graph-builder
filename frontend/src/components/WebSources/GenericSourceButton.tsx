import CustomButton from '../UI/CustomButton';
import internet from '../../assets/images/web-search-svgrepo-com.svg';
import { DataComponentProps } from '../../types';
import { Flex, Typography } from '@neo4j-ndl/react';
import IconButtonWithToolTip from '../UI/IconButtonToolTip';
import { InformationCircleIconOutline } from '@neo4j-ndl/react/icons';
import { APP_SOURCES } from '../../utils/Constants';

export default function GenericButton({ openModal }: DataComponentProps) {
  return (
    <Flex alignItems='center' gap='4'>
      <CustomButton openModal={openModal} logo={internet} wrapperclassName='my-2' className='webImg' />
      <Typography variant='body-small'>
        <Flex gap='0'>
          <span>Web Sources</span>
          <div className='align-self-center flex justify-center'>
            <IconButtonWithToolTip
              label='Source info'
              clean
              text={
                <Typography variant='body-small'>
                  <Flex gap='3' alignItems='flex-start'>
                    {APP_SOURCES != undefined && APP_SOURCES.includes('youtube') && <span>Youtube</span>}
                    {APP_SOURCES != undefined && APP_SOURCES.includes('wiki') && <span>Wikipedia</span>}
                    {APP_SOURCES != undefined && APP_SOURCES.includes('web') && <span>Website</span>}
                  </Flex>
                </Typography>
              }
            >
              <InformationCircleIconOutline className='w-[22px] h-[22px]' />
            </IconButtonWithToolTip>
          </div>
        </Flex>
      </Typography>
    </Flex>
  );
}
