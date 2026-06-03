module.exports = async (req, res) => {
  const start = Date.now();
  try {
    res.status(200).json({
      ok: true,
      node: process.version,
      env: process.env.NODE_ENV || 'not-set',
      time: Date.now() - start,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
