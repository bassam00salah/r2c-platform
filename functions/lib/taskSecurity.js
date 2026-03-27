function hasValidTaskHeaders(req) {
  const taskName = req.get("x-cloudtasks-taskname");
  const queueName = req.get("x-cloudtasks-queuename");
  const authHeader = req.get("authorization") || "";

  return Boolean(
    taskName &&
    queueName &&
    authHeader.startsWith("Bearer ")
  );
}

module.exports = {
  hasValidTaskHeaders,
};
