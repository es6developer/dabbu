const isRedisAvailable = () => {
  const url = process.env.REDIS_URL || process.env.REDIS_HOST;
  return !!url;
};

export default isRedisAvailable;
