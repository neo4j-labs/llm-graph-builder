import { Dialog, Typography, Flex, IconButton, useMediaQuery } from '@neo4j-ndl/react';
import { ArrowLeftIconOutline, ArrowRightIconOutline } from '@neo4j-ndl/react/icons';
import { chunkdata } from '../../../types';
import Loader from '../../../utils/Loader';
import { useMemo } from 'react';
import chunklogo from '../../../assets/images/chunks.svg';
import { tokens } from '@neo4j-ndl/base';

const ChunkPopUp = ({
  showChunkPopup,
  chunks,
  onClose,
  chunksLoading,
  incrementPage,
  decrementPage,
  currentPage,
  totalPageCount,
}: {
  showChunkPopup: boolean;
  chunks: chunkdata[];
  onClose: () => void;
  chunksLoading: boolean;
  incrementPage: () => void;
  decrementPage: () => void;
  currentPage: number | null;
  totalPageCount: number | null;
}) => {
  const { breakpoints } = tokens;
  const isTablet = useMediaQuery(`(min-width:${breakpoints.xs}) and (max-width: ${breakpoints.lg})`);
  const sortedChunksData = useMemo(() => {
    return chunks.sort((a, b) => a.position - b.position);
  }, [chunks]);
  return (
    <Dialog isOpen={showChunkPopup} onClose={onClose}>
      <Dialog.Header>
        <div className='flex! flex-row items-center mb-2'>
          <img
            src={chunklogo}
            style={{ width: isTablet ? 100 : 140, height: isTablet ? 100 : 140, marginRight: 10 }}
            loading='lazy'
          />
          <div className='flex flex-col'>
            <Typography variant='h2'>Text Chunks</Typography>
            <Typography variant='body-medium' className='mb-2'>
              These text chunks are extracted to build a knowledge graph and enable accurate information retrieval using
              a different retrieval strategies
            </Typography>
          </div>
        </div>
        {!chunksLoading && totalPageCount != null && totalPageCount > 0 && (
          <div className='flex! flex-row justify-end'>
            <Typography variant='subheading-small'>Total Pages: {totalPageCount}</Typography>
          </div>
        )}
      </Dialog.Header>
      <Dialog.Content>
        {chunksLoading ? (
          <Loader title='loading...'></Loader>
        ) : (
          <ol className='max-h-80 overflow-y-auto flex! flex-col gap-4'>
            {sortedChunksData.map((c) => (
              <li key={`${c.position}`} className='flex! flex-row gap-1'>
                <Flex flexDirection='column' gap='2'>
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
      {totalPageCount != null && totalPageCount > 1 && (
        <Dialog.Actions className='flex justify-center! items-center'>
          <Flex flexDirection='row'>
            <IconButton ariaLabel='decrementButton' isDisabled={currentPage === 1} onClick={decrementPage}>
              <ArrowLeftIconOutline />
            </IconButton>
            <IconButton ariaLabel='incrementButton' isDisabled={currentPage === totalPageCount} onClick={incrementPage}>
              <ArrowRightIconOutline />
            </IconButton>
          </Flex>
        </Dialog.Actions>
      )}
    </Dialog>
  );
};
export default ChunkPopUp;
