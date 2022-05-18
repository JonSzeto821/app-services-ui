import { GetKafkaInstanceMetricsResponse, TimeSeriesMetrics } from '@rhoas/app-services-ui-components';
import { Configuration, DefaultApi } from '@rhoas/kafka-management-sdk';
import { BasicApiConfigurationParameters, SafeRangeQuery } from './types';

type FetchKafkaInstanceMetricsProps = {
  kafkaId: string;
  duration: number;
  interval: number;
} & BasicApiConfigurationParameters;
export async function fetchKafkaInstanceMetrics({
  kafkaId,
  duration,
  interval,
  accessToken,
  basePath,
}: FetchKafkaInstanceMetricsProps): Promise<GetKafkaInstanceMetricsResponse> {
  const apisService = new DefaultApi(
    new Configuration({
      accessToken,
      basePath,
    })
  );

  const response = await apisService.getMetricsByRangeQuery(kafkaId, duration, interval, [
    'kubelet_volume_stats_used_bytes',
    'kafka_namespace:kafka_server_socket_server_metrics_connection_creation_rate:sum',
    'kafka_namespace:kafka_server_socket_server_metrics_connection_count:sum',
    'kafka_instance_max_message_size_limit',
    'kafka_instance_connection_limit',
    'kafka_instance_connection_creation_rate_limit',
  ]);

  // Remove all results with no data. Not sure this can really  happen but since
  // the types allow for undefined we need to do a bit of defensive programming.
  const safeMetrics: SafeRangeQuery[] = (response.data.items || []).filter(
    (m) =>
      // defensive programming
      !(
        m.values &&
        m.metric &&
        m.metric.topic &&
        m.metric.name &&
        m.metric.persistentvolumeclaim &&
        m.metric.persistentvolumeclaim.includes('zookeeper')
      )
  ) as SafeRangeQuery[];

  const usedDiskSpaceMetrics: TimeSeriesMetrics = {};
  const connectionAttemptRateMetrics: TimeSeriesMetrics = {};
  const clientConnectionsMetrics: TimeSeriesMetrics = {};

  let connectionRateLimit = 0,
    connectionsLimit = 0,
    diskSpaceLimit = 0;

  safeMetrics.forEach((m) => {
    const { __name__: name } = m.metric;

    function addAggregatedValuesTo(metric: TimeSeriesMetrics) {
      m.values.forEach(({ value, timestamp }) => (metric[timestamp] = value + (metric[timestamp] || 0)));
    }

    switch (name) {
      case 'kubelet_volume_stats_used_bytes':
        addAggregatedValuesTo(usedDiskSpaceMetrics);
        break;
      case 'kafka_namespace:kafka_server_socket_server_metrics_connection_creation_rate:sum':
        addAggregatedValuesTo(connectionAttemptRateMetrics);
        break;
      case 'kafka_namespace:kafka_server_socket_server_metrics_connection_count:sum':
        addAggregatedValuesTo(clientConnectionsMetrics);
        break;
      case 'kafka_instance_max_message_size_limit':
        diskSpaceLimit = m.values[0].value;
        break;
      case 'kafka_instance_connection_limit':
        connectionsLimit = m.values[0].value;
        break;
      case 'kafka_instance_connection_creation_rate_limit':
        connectionRateLimit = m.values[0].value;
        break;
    }
  });

  return {
    usedDiskSpaceMetrics,
    clientConnectionsMetrics,
    connectionAttemptRateMetrics,
    diskSpaceLimit,
    connectionRateLimit,
    connectionsLimit,
  };
}
