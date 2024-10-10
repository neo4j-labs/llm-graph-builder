import { CircleStackIconOutline } from '@neo4j-ndl/react/icons';
import { IconWithToolTip } from './IconButtonToolTip';
import { DatabaseStatusProps } from '../../types';
import { connectionLabels } from '../../utils/Constants';
import ScienceMoleculeIcon from '../UI/ScienceMolecule';

const DatabaseStatusIcon: React.FC<DatabaseStatusProps> = ({ isConnected, isGdsActive, uri }) => {
  const strokeColour = isConnected ? connectionLabels.greenStroke : connectionLabels.redStroke;
  const text = isGdsActive ? connectionLabels.graphDataScience : connectionLabels.graphDatabase;
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <IconWithToolTip label={text} text={text} placement='top'>
        <span>
          {isGdsActive ? (
            <ScienceMoleculeIcon currentColour={strokeColour} />
          ) : (
            <CircleStackIconOutline className='n-size-token-6' style={{ stroke: strokeColour }} />
          )}
        </span>
      </IconWithToolTip>
      <span className='n-body-small ml-1'>{isConnected ? uri : connectionLabels.notConnected}</span>
    </div>
  );
};

export default DatabaseStatusIcon;
