import { Dialog } from '@neo4j-ndl/react';
import Loader from '../../utils/Loader';

export default function FallBackDialog() {
  return (
    <Dialog open={true} size='medium'>
      <Dialog.Content>
        <Loader title='Loading...'></Loader>
      </Dialog.Content>
    </Dialog>
  );
}
