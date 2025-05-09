import { CommonButtonProps } from '../../types';

const CustomButton: React.FC<CommonButtonProps> = ({
  openModal,
  wrapperclassName,
  logo,
  title,
  className,
  isDisabled = false,
}) => {
  return (
    <div
      onClick={openModal}
      className={`custombutton ${wrapperclassName ?? ''} ${isDisabled ? 'blur-sm pointer-events-none' : ''}`}
    >
      <img src={logo} className={`brandimg ${className}`} alt={'source logo'}></img>
      <h6>{title}</h6>
    </div>
  );
};
export default CustomButton;
