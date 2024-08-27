import gcslogo from '../../../assets/images/gcs.webp';
import { DataComponentProps } from '../../../types';
import { buttonCaptions } from '../../../utils/Constants';
import CustomButton from '../../UI/CustomButton';
const GCSButton: React.FC<DataComponentProps> = ({ openModal, isLargeDesktop = true }) => {
  return (
    <CustomButton
      title={isLargeDesktop ? buttonCaptions.gcs : ''}
      openModal={openModal}
      logo={gcslogo}
      wrapperclassName=''
      className={!isLargeDesktop ? 'widthunset' : ''}
    />
  );
};
export default GCSButton;
