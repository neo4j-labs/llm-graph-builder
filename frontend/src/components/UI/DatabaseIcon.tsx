import { CircleStackIconOutline, ScienceMoleculeIcon } from '@neo4j-ndl/react/icons';
import { IconWithToolTip } from './IconButtonToolTip';
import { DatabaseStatusProps } from '../../types';
import { connectionLabels } from '../../utils/Constants';

const DatabaseStatusIcon: React.FC<DatabaseStatusProps> = ({ isConnected, isGdsActive, uri }) => {
  const iconStyle = { fill: 'none', stroke: isConnected ? connectionLabels.greenStroke : connectionLabels.redStroke };
  const text = isGdsActive ? connectionLabels.graphDataScience : connectionLabels.graphDatabase;
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <IconWithToolTip label={text} text={text} placement='top'>
        <span>
          {isGdsActive ? (
            <ScienceMoleculeIcon className='n-size-token-6' style={iconStyle} />
          ) : (
            <CircleStackIconOutline className='n-size-token-6' style={iconStyle} />
          )}
        </span>
      </IconWithToolTip>
      <span className='n-body-small ml-1'>{isConnected ? uri : connectionLabels.notConnected}</span>
    </div>
  );
};

export default DatabaseStatusIcon;
