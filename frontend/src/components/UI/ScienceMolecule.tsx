import React from 'react';

interface ScienceMoleculeIconProps {
  currentColour: string;
}

const ScienceMoleculeIcon: React.FC<ScienceMoleculeIconProps> = ({ currentColour }) => (
  <svg
    width='1em'
    height='1em'
    viewBox='0 0 24 24'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    className='n-size-token-6'
  >
    <path
      d='M12.0068 13.6942C12.9387 13.6942 13.6943 12.9387 13.6943 12.0067C13.6943 11.0748 12.9387 10.3192 12.0068 10.3192C11.0748 10.3192 10.3193 11.0748 10.3193 12.0067C10.3193 12.9387 11.0748 13.6942 12.0068 13.6942Z'
      stroke={currentColour}
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M14.7912 14.791C19.1846 10.3976 21.4996 5.58948 19.9619 4.05179C18.4242 2.5141 13.6161 4.82911 9.22275 9.22251C4.82935 13.6159 2.51434 18.424 4.05203 19.9617C5.58972 21.4994 10.3978 19.1844 14.7912 14.791Z'
      stroke={currentColour}
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M19.9619 19.9617C21.4996 18.424 19.1846 13.6159 14.7912 9.22251C10.3978 4.82911 5.58972 2.5141 4.05203 4.05179C2.51434 5.58948 4.82935 10.3976 9.22275 14.791C13.6162 19.1844 18.4242 21.4994 19.9619 19.9617Z'
      stroke={currentColour}
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

export default ScienceMoleculeIcon;
