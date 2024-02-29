import { DataComponentProps } from '../types';
import s3logo from '../assets/images/s3logo.png';
import CustomButton from './CustomButton';

const S3Component: React.FC<DataComponentProps> = ({ openModal }) => {
  return <CustomButton title='Amazon S3' openModal={openModal} logo={s3logo} wrapperclassName='' className='' />;
};

export default S3Component;
