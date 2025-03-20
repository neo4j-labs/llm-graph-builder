import { DataComponentProps } from '../../../types';
import s3logo from '../../../assets/images/s3logo.png';
import CustomButton from '../../UI/CustomButton';
import { buttonCaptions } from '../../../utils/Constants';

const S3Component: React.FC<DataComponentProps> = ({ openModal, isLargeDesktop = true, isDisabled = false }) => {
  return (
    <CustomButton
      title={isLargeDesktop ? buttonCaptions.amazon : ''}
      openModal={openModal}
      logo={s3logo}
      wrapperclassName=''
      className={!isLargeDesktop ? 'widthunset' : ''}
      isDisabled={isDisabled}
    />
  );
};

export default S3Component;
