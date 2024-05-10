import { chatInfoMessage } from '../types';

const ListComp: React.FC<chatInfoMessage> = ({ activeChat }) => {
  return (
    <>
      <ul>
        <li>Model: {activeChat?.model}</li>
        <li>Sources: {activeChat?.sources.join(', ')}</li>
        <li>
          Entities:{' '}
          <ul>
            {activeChat?.entities.map((entity, index) => (
              <li key={index}>{entity}</li>
            ))}
          </ul>
        </li>
      </ul>
    </>
  );
};

export default ListComp;
