import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.API_URL || 'http://localhost:4000/api/v1';
const TOKEN = __ENV.AUTH_TOKEN || '';

const failureRate = new Rate('failed_requests');
const latencyTrend = new Trend('request_duration');

export const options = {
  stages: [
    { duration: '1m', target: 30 },
    { duration: '2m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    failed_requests: ['rate<0.02'],
    request_duration: ['p(95)<1500'],
  },
};

const params = {
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TOKEN}`,
  },
};

export default function () {
  group('List Transactions', () => {
    const res = http.get(`${BASE_URL}/transactions?limit=20&page=1`, params);
    const ok = check(res, {
      'status is 200': (r) => r.status === 200,
      'lists transactions': (r) => Array.isArray(r.json('data')),
    });
    failureRate.add(!ok);
    latencyTrend.add(res.timings.duration);
  });
  sleep(1);

  group('Search Transactions', () => {
    const res = http.get(`${BASE_URL}/search?q=test&limit=10`, params);
    const ok = check(res, {
      'status is 200': (r) => r.status === 200,
      'returns results': (r) => r.json('results') !== undefined,
    });
    failureRate.add(!ok);
    latencyTrend.add(res.timings.duration);
  });
  sleep(2);
}
