const { sendError } = require('../utils/response');

const validate = (schema, source = 'body') => (req, res, next) => {
  const data = source === 'query' ? req.query : source === 'params' ? req.params : req.body;
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true
  });

  if (error) {
    const messages = error.details.map((d) => d.message.replace(/['"]/g, ''));
    return sendError(res, 'Validatsiya xatosi', 400, messages);
  }

  if (source === 'body') req.body = value;
  next();
};

module.exports = validate;
