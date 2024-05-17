import { useFileContext } from '../context/UsersFiles';
import { eventResponsetypes } from '../types';
const perchunksecond = parseInt(process.env.TIME_PER_CHUNK as string);
export default function useServerSideEvent(
  alertHandler: (minutes: number, filename: string) => void,
  errorHandler: (filename: string) => void
) {
  const { setFilesData } = useFileContext();
  function updateStatusForLargeFiles(eventSourceRes: eventResponsetypes) {
    const { fileName, nodeCount, processingTime, relationshipCount, status, total_chunks, model } = eventSourceRes;
    const alertShownStatus = JSON.parse(localStorage.getItem('alertShown') || 'null');
    if (status === 'Processing' && alertShownStatus != null && alertShownStatus == false && total_chunks != null) {
      const minutes = Math.floor((perchunksecond * total_chunks) / 60);
      alertHandler(minutes, fileName);
    } else if (status === 'Completed') {
      setFilesData((prevfiles) => {
        return prevfiles.map((curfile) => {
          if (curfile.name == fileName) {
            return {
              ...curfile,
              status: status,
              NodesCount: nodeCount,
              relationshipCount: relationshipCount,
              model: model,
              processing: processingTime?.toFixed(2),
            };
          }
          return curfile;
        });
      });
    } else if (eventSourceRes.status === 'Failed') {
      setFilesData((prevfiles) => {
        return prevfiles.map((curfile) => {
          if (curfile.name == fileName) {
            return {
              ...curfile,
              status: status,
            };
          }
          return curfile;
        });
      });
      errorHandler(fileName);
    }
  }
  return {
    updateStatusForLargeFiles,
  };
}
