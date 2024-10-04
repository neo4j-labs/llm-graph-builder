import { Banner, Flex, LoadingSpinner, Typography } from '@neo4j-ndl/react';
import { MetricsState } from '../../types';

export default function MetricsTab({
  metricsLoading,
  metricDetails,
}: {
  metricsLoading: boolean;
  metricDetails: MetricsState | null;
}) {
  return (
    <>
      {metricsLoading ? (
        <Flex flexDirection='column' justifyContent='center' alignItems='center'>
          <LoadingSpinner size='small' />
        </Flex>
      ) : metricDetails != null && metricDetails?.error?.trim() != '' ? (
        <Banner type='danger'>{metricDetails?.error}</Banner>
      ) : (
        <Typography variant='body-medium'>
          The model achieved a faithfulness score of{' '}
          <span className='font-bold'>{metricDetails?.faithfulness.toFixed(2)}</span>, an answer relevancy score of{' '}
          <span className='font-bold'>{metricDetails?.answer_relevancy.toFixed(2)}</span>, and a context_utilization
          score of <span className='font-bold'>{metricDetails?.context_utilization.toFixed(2)}</span>
        </Typography>
      )}
    </>
  );
}
