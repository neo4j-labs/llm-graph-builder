import { Dialog } from '@neo4j-ndl/react';

const ChunkPopUp = ({ showChunkPopup }: { showChunkPopup: boolean }) => {
  return (
    <Dialog open={showChunkPopup}>
      <Dialog.Header>Chunk Text</Dialog.Header>
      <Dialog.Content>
            <p></p>
      </Dialog.Content>
    </Dialog>
  );
};
export default ChunkPopUp;
