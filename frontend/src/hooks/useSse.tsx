import { useFileContext } from '../context/UsersFiles';
import { eventResponsetypes } from '../types';
import { batchSize } from '../utils/Constants';
import { calculateProcessingTime } from '../utils/Utils';

export default function useServerSideEvent(
  alertHandler: (inMinutes: boolean, minutes: number, filename: string) => void,
  errorHandler: (filename: string) => void
) {
  const { setFilesData, setProcessedCount } = useFileContext();
  const processcountmap: Record<string, number> = {};
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
      chunkNodeCount,
      entityNodeCount,
      communityNodeCount,
      chunkRelCount,
      entityEntityRelCount,
      communityRelCount,
    } = eventSourceRes;
    const alertShownStatus = JSON.parse(localStorage.getItem('alertShown') || 'null');

    if (status === 'Processing') {
      if (alertShownStatus != null && alertShownStatus == false && total_chunks != null) {
        const { minutes, seconds } = calculateProcessingTime(fileSize, 0.2);
        alertHandler(minutes !== 0, minutes === 0 ? seconds : minutes, fileName);
      }
      if (total_chunks) {
        const updateState = processed_chunk != processcountmap[fileName];
        if (updateState) {
          processcountmap[fileName] = processed_chunk;
          setFilesData((prevfiles) => {
            return prevfiles.map((curfile) => {
              if (curfile.name == fileName) {
                return {
                  ...curfile,
                  status: total_chunks === processed_chunk ? 'Completed' : status,
                  chunkNodeCount: chunkNodeCount ?? 0,
                  entityNodeCount: entityNodeCount ?? 0,
                  communityNodeCount: communityNodeCount ?? 0,
                  chunkRelCount: chunkRelCount ?? 0,
                  entityEntityRelCount: entityEntityRelCount ?? 0,
                  communityRelCount: communityRelCount ?? 0,
                  nodesCount: nodeCount,
                  relationshipsCount: relationshipCount,
                  model: model,
                  processingTotalTime: processingTime?.toFixed(2),
                  processingProgress: Math.floor((processed_chunk / total_chunks) * 100),
                };
              }
              return curfile;
            });
          });
        }
      }
    } else if (status === 'Completed') {
      setFilesData((prevfiles) => {
        return prevfiles.map((curfile) => {
          if (curfile.name == fileName) {
            return {
              ...curfile,
              status: status,
              nodesCount: nodeCount,
              relationshipsCount: relationshipCount,
              model: model,
              processingTotalTime: processingTime?.toFixed(2),
              chunkNodeCount: chunkNodeCount ?? 0,
              entityNodeCount: entityNodeCount ?? 0,
              communityNodeCount: communityNodeCount ?? 0,
              chunkRelCount: chunkRelCount ?? 0,
              entityEntityRelCount: entityEntityRelCount ?? 0,
              communityRelCount: communityRelCount ?? 0,
            };
          }
          return curfile;
        });
      });
      setProcessedCount((prev) => {
        if (prev == batchSize) {
          return batchSize - 1;
        }
        return prev + 1;
      });
      delete processcountmap[fileName];
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
      delete processcountmap[fileName];
    }
  }
  return {
    updateStatusForLargeFiles,
  };
}
