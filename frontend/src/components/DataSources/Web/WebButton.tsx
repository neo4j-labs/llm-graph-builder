import React, { useContext } from 'react';
import CustomButton from '../../UI/CustomButton';
import { DataComponentProps } from '../../../types';
import { ThemeWrapperContext } from '../../../context/ThemeWrapper';
import internet from '../../../assets/images/web-search-svgrepo-com.svg';
import internetdarkmode from '../../../assets/images/web-search-darkmode-final2.svg';

const WebButton: React.FC<DataComponentProps> = ({ openModal, isLargeDesktop = true }) => {
  const themeUtils = useContext(ThemeWrapperContext);

  return (
    <CustomButton
      openModal={openModal}
      logo={themeUtils.colorMode === 'dark' ? internetdarkmode : internet}
      wrapperclassName='my-2'
      className={isLargeDesktop ? 'webImg' : 'widthunset'}
    />
  );
};
export default WebButton;
