import youtubelogo from '../assets/images/youtube.png';
import { DataComponentProps } from '../types';
import CustomButton from './CustomButton';
const YouTubeButton: React.FC<DataComponentProps> = ({ openModal }) => {
  return <CustomButton title='Youtube' openModal={openModal} logo={youtubelogo} wrapperclassName='' className='' />;
};
export default YouTubeButton;
