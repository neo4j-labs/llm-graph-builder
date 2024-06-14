import youtubelogo from '../assets/images/youtube.png';
import { DataComponentProps } from '../types';
import { buttonCaptions } from '../utils/Constants';
import CustomButton from './CustomButton';
const YouTubeButton: React.FC<DataComponentProps> = ({ openModal }) => {
  return (
    <CustomButton
      title={buttonCaptions.youtube}
      openModal={openModal}
      logo={youtubelogo}
      wrapperclassName=''
      className=''
    />
  );
};
export default YouTubeButton;
