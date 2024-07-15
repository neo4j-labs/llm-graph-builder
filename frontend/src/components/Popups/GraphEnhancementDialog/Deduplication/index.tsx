import { useEffect } from 'react';
import { getDuplicateNodes } from '../../../../services/GetDuplicateNodes';
import { useCredentials } from '../../../../context/UserCredentials';
import { UserCredentials } from '../../../../types';

export default function DeduplicationTab() {
  const { userCredentials } = useCredentials();

  useEffect(() => {
    (async () => {
      try {
        const duplicateNodesData = await getDuplicateNodes(userCredentials as UserCredentials);
        console.log({ duplicateNodesData });
      } catch (error) {
        console.log(error);
      }
    })();

    return () => {};
  }, [userCredentials]);

  return <div>index</div>;
}
