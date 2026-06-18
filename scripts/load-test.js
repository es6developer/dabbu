import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.API_URL || 'https://dabbu-1ff9.onrender.com/api/v1';

const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');

export const options = {
  stages: [
    { duration: '2m', target: 50 },    // Ramp up to 50 users
    { duration: '5m', target: 100 },   // Ramp to 100 users
    { duration: '5m', target: 200 },   // Ramp to 200 users
    { duration: '3m', target: 300 },   // Peak load
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'],  // 95% of requests under 300ms
    errors: ['rate<0.05'],             // Error rate below 5%
  },
};

const USER_CREDENTIALS = {
  email: 'loadtest@dabbu.app',
  password: 'LoadTest123!',
};

export function setup() {
  // Create a test user or get token
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify(USER_CREDENTIALS), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginRes, { 'login successful': (r) => r.status === 200 });

  const token = loginRes.json('data.accessToken');
  return { token };
}

export default function (data) {
  const params = {
    headers: {
      'Authorization': `Bearer ${data.token}`,
      'Content-Type': 'application/json',
    },
  };

  group('Auth endpoints', () => {
    const res = http.get(`${BASE_URL}/auth/profile`, params);
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);
    check(res, { 'profile status 200': (r) => r.status === 200 });
    sleep(1);
  });

  group('Transaction endpoints', () => {
    const res = http.get(`${BASE_URL}/transactions?limit=20&offset=0`, params);
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);
    check(res, { 'transactions status 200': (r) => r.status === 200 });
    sleep(2);
  });

  group('Dashboard analytics', () => {
    const res = http.get(`${BASE_URL}/analytics/dashboard`, params);
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);
    check(res, { 'dashboard status 200': (r) => r.status === 200 });
    sleep(3);
  });

  group('Search', () => {
    const res = http.get(`${BASE_URL}/search?q=test&limit=10`, params);
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);
    check(res, { 'search status 200': (r) => r.status === 200 });
    sleep(1);
  });

  group('Notification endpoints', () => {
    const res = http.get(`${BASE_URL}/notifications?limit=10`, params);
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);
    check(res, { 'notifications status 200': (r) => r.status === 200 });
    sleep(1);
  });
}

export function teardown(data) {
  // Cleanup: logout
  http.post(`${BASE_URL}/auth/logout`, {}, {
    headers: { 'Authorization': `Bearer ${data.token}` },
  });
}
