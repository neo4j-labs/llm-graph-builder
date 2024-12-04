import CustomPopOver from './UI/CustomPopOver';
import { IconButton } from '@neo4j-ndl/react';
import { InformationCircleIconOutline } from '@neo4j-ndl/react/icons';
import { CustomFileBase } from '../types';
import { useCredentials } from '../context/UserCredentials';

export default function BreakDownPopOver({ file, isNodeCount = true }: { file: CustomFileBase; isNodeCount: boolean }) {
  const { isGdsActive } = useCredentials();

  return (
    <CustomPopOver
      Trigger={
        <IconButton isClean ariaLabel='infoicon'>
          <InformationCircleIconOutline className='n-size-token-3' />
        </IconButton>
      }
    >
      {isNodeCount ? (
        <ul className='p-2'>
          <li>Chunk Nodes: {file.chunkNodeCount}</li>
          <li>Entity Nodes: {file.entityNodeCount}</li>
          {isGdsActive && <li>Community Nodes: {file.communityNodeCount}</li>}
        </ul>
      ) : (
        <ul className='p-2'>
          <li>Chunk Relations: {file.chunkRelCount}</li>
          <li>Entity Relations: {file.entityEntityRelCount}</li>
          {isGdsActive && <li>Community Relations: {file.communityRelCount}</li>}
        </ul>
      )}
    </CustomPopOver>
  );
}
