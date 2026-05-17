const sendSuccess = (res, message, data = {}, statusCode = 200, meta = {}) => {
  const response = { success: true, message };
  if (data && Object.keys(data).length > 0) response.data = data;
  if (meta && Object.keys(meta).length > 0) response.meta = meta;
  return res.status(statusCode).json(response);
};

const sendError = (res, message, statusCode = 400, errors = []) => {
  const response = { success: false, message };
  if (errors && errors.length > 0) response.errors = errors;
  return res.status(statusCode).json(response);
};

const sendPaginated = (res, message, data, pagination) => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination
  });
};

const paginate = (page, limit, total) => ({
  total,
  page: parseInt(page),
  pages: Math.ceil(total / limit),
  limit: parseInt(limit)
});

module.exports = { sendSuccess, sendError, sendPaginated, paginate };
