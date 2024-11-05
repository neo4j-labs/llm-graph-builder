import { Dialog, Typography, Flex } from '@neo4j-ndl/react';
import { chunkdata } from '../../../types';
import Loader from '../../../utils/Loader';
import { useMemo } from 'react';

const ChunkPopUp = ({
  showChunkPopup,
  chunks,
  onClose,
  chunksLoading,
}: {
  showChunkPopup: boolean;
  chunks: chunkdata[];
  onClose: () => void;
  chunksLoading: boolean;
}) => {
  const sortedChunksData = useMemo(() => {
    return chunks.sort((a, b) => a.position - b.position);
  }, [chunks]);
  return (
    <Dialog open={showChunkPopup} onClose={onClose}>
      <Dialog.Header>Text Chunks</Dialog.Header>
      <Dialog.Content>
        {chunksLoading ? (
          <Loader title='loading...'></Loader>
        ) : (
          <ol className='max-h-80 overflow-y-auto'>
            {sortedChunksData.map((c, idx) => (
              <li key={`${idx}${c.position}`} className='flex flex-row gap-2'>
                <Flex flexDirection='column' gap='1'>
                  <Flex flexDirection='row'>
                    <Typography variant='label'>Position :</Typography>
                    <Typography variant='subheading-medium'>{c.position}</Typography>
                  </Flex>
                  {c.pagenumber ? (
                    <Flex flexDirection='row'>
                      <Typography variant='label'>Page No :</Typography>{' '}
                      <Typography variant='subheading-small'>{c.pagenumber}</Typography>
                    </Flex>
                  ) : null}
                  <Typography variant='body-medium'>{c.text}</Typography>
                </Flex>
              </li>
            ))}
          </ol>
        )}
      </Dialog.Content>
    </Dialog>
  );
};
export default ChunkPopUp;
