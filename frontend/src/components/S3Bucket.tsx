import { S3BucketProps } from '../types';
import s3logo from '../assets/images/s3logo.png';

const S3Component: React.FC<S3BucketProps> = ({ openModal }) => {
  return (
    <div
      onClick={openModal}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexDirection: 'column',
      }}
    >
      <img src={s3logo} width={50} height={50}></img>
      <h6>Amazon S3</h6>
    </div>
  );
};

export default S3Component;
