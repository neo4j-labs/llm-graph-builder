import gcslogo from '../../../assets/images/gcs.webp';
import { DataComponentProps } from '../../../types';
import { buttonCaptions } from '../../../utils/Constants';
import CustomButton from '../../UI/CustomButton';
const GCSButton: React.FC<DataComponentProps> = ({ openModal }) => {
  return (
    <CustomButton title={buttonCaptions.gcs} openModal={openModal} logo={gcslogo} wrapperclassName='' className='' />
  );
};
export default GCSButton;
