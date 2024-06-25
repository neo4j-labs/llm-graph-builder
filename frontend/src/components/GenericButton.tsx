import CustomButton from './CustomButton';
import internet from '../assets/images/web-search-svgrepo-com.svg';
import { DataComponentProps } from '../types';

export default function GenericButton({ openModal }: DataComponentProps) {
  return <CustomButton openModal={openModal} logo={internet} wrapperclassName='' className='' />;
}
