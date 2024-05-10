import { chatInfoMessage } from '../types';

const ListComp: React.FC<chatInfoMessage> = (props) => {
  const { sources, entities, model } = props?.activeChat;
  return (
    <>
      <ul>
        <li><strong>Model: </strong>{model}</li>
        <li><strong>Sources: </strong> {sources?.join(', ')}</li>
        <li>
          <strong>Entities: </strong>{' '}
          <ul>
            {entities?.map((entity: [], index: number) => (
              <li key={index}>{entity}</li>
            ))}
          </ul>
        </li>
      </ul>
    </>
  );
};

export default ListComp;
