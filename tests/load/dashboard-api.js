import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

const BASE_URL = __ENV.API_URL || 'http://localhost:4000/api/v1';
const TOKEN = __ENV.AUTH_TOKEN || '';

const failureRate = new Rate('failed_requests');
const latencyTrend = new Trend('request_duration');

export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '2m', target: 200 },
    { duration: '1m', target: 500 },
    { duration: '2m', target: 500 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    failed_requests: ['rate<0.02'],
    request_duration: ['p(95)<2000'],
    http_req_duration: ['p(95)<2000'],
  },
};

const params = {
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TOKEN}`,
  },
};

export default function () {
  group('Dashboard API', () => {
    const res = http.get(`${BASE_URL}/dashboard`, params);
    const ok = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 2s': (r) => r.timings.duration < 2000,
      'has mode': (r) => r.json('mode') !== undefined,
    });
    failureRate.add(!ok);
    latencyTrend.add(res.timings.duration);
  });
  sleep(2);
}
