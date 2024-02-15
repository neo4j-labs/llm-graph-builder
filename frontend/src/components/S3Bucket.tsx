import { Button } from '@neo4j-ndl/react';
import { CloudIconOutline } from '@neo4j-ndl/react/icons';
import { S3BucketProps } from '../types';


const S3Component:React.FC<S3BucketProps> = ({ openModal }) => {
    return (
        <Button
            aria-label="Aws s3"
            size="large"
            fill="text"
            onClick={openModal}
        >
            <div>
                <CloudIconOutline className="n-w-6 n-h-6" />
                <h6>Amazon S3</h6></div>
        </Button>
    )
}

export default S3Component