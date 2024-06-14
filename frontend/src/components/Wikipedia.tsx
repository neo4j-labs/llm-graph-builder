import wikipedialogo from '../assets/images/Wikipedia-logo-v2.svg';

export default function Wikipedia({ openModal }: { openModal: () => void }) {
  return (
    <div onClick={openModal} className='p-5 flex items-center content-center cursor-pointer flex-col wikipedia-div'>
      <img src={wikipedialogo} width={50} height={50}></img>
      <h6>Wikipedia</h6>
    </div>
  );
}
