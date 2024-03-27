import gcslogo from '../assets/images/gcs.jfif';
import { DataComponentProps } from '../types';
import CustomButton from './CustomButton';
const GCSButton: React.FC<DataComponentProps> = ({ openModal }) => {
  return <CustomButton title='GCS' openModal={openModal} logo={gcslogo} wrapperclassName='' className='' />;
};
export default GCSButton;
