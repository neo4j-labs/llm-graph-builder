
import gcslogo from '../assets/images/gcs.jfif'
export default function GcsBucket() {
    return (
        <div
        //   onClick={openModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexDirection: 'column',
          }}
        >
          <img src={gcslogo}  width={50} height={50}></img>
          <h6>GCS</h6>
        </div>
      );
}
