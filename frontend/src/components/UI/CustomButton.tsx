import { CommonButtonProps } from '../../types';

const CustomButton: React.FC<CommonButtonProps> = ({ openModal, wrapperclassName, logo, title, className }) => {
  return (
    <div onClick={openModal} className={`custombutton ${wrapperclassName ?? ''}`}>
      <img src={logo} className={`brandimg ${className}`}></img>
      <h6>{title}</h6>
    </div>
  );
};
export default CustomButton;
