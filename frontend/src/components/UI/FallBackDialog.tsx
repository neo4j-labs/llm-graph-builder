import { Dialog, LoadingSpinner } from '@neo4j-ndl/react';

export default function FallBackDialog() {
  return (
    <Dialog open={true} size='medium'>
      <Dialog.Content className='flex justify-center items-center'>
        <LoadingSpinner size='large' />;
      </Dialog.Content>
    </Dialog>
  );
}
