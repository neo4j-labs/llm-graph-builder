import { useFileContext } from '../context/UsersFiles';
import { eventResponsetypes } from '../types';
import { calculateProcessingTime } from '../utils/Utils';

export default function useServerSideEvent(
  alertHandler: (inMinutes: boolean, minutes: number, filename: string) => void,
  errorHandler: (filename: string) => void
) {
  const { setFilesData } = useFileContext();
  function updateStatusForLargeFiles(eventSourceRes: eventResponsetypes) {
    const {
      fileName,
      nodeCount = 0,
      processingTime,
      relationshipCount = 0,
      status,
      total_chunks,
      model,
      processed_chunk = 0,
      fileSize,
    } = eventSourceRes;
    const alertShownStatus = JSON.parse(localStorage.getItem('alertShown') || 'null');

    if (status === 'Processing') {
      if (alertShownStatus != null && alertShownStatus == false && total_chunks != null) {
        const { minutes, seconds } = calculateProcessingTime(fileSize, 0.2);
        alertHandler(minutes !== 0, minutes === 0 ? seconds : minutes, fileName);
      }
      if (total_chunks) {
        setFilesData((prevfiles) => {
          return prevfiles.map((curfile) => {
            if (curfile.name == fileName) {
              return {
                ...curfile,
                status: total_chunks === processed_chunk ? 'Completed' : status,
                NodesCount: nodeCount,
                relationshipCount: relationshipCount,
                model: model,
                processing: processingTime?.toFixed(2),
                processingProgress: Math.floor((processed_chunk / total_chunks) * 100),
              };
            }
            return curfile;
          });
        });
      }
    } else if (status === 'Completed' || status === 'Cancelled') {
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
