import wikipedialogo from '../assets/images/Wikipedia-logo-v2.svg';

export default function Wikipedia({ openModal }: { openModal: () => void }) {
  return (
    <div
      onClick={openModal}
      className='p-5'
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexDirection: 'column',
      }}
    >
      <img src={wikipedialogo} width={50} height={50}></img>
      <h6>Wikipedia</h6>
    </div>
  );
}
