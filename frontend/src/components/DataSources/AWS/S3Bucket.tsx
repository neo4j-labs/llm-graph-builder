import { DataComponentProps } from '../../../types';
import s3logo from '../../../assets/images/s3logo.png';
import CustomButton from '../../UI/CustomButton';
import { buttonCaptions } from '../../../utils/Constants';

const S3Component: React.FC<DataComponentProps> = ({ openModal }) => {
  return (
    <CustomButton title={buttonCaptions.amazon} openModal={openModal} logo={s3logo} wrapperclassName='' className='' />
  );
};

export default S3Component;
