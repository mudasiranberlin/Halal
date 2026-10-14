import { AppError } from '../utils/AppError.js';

/** Validates req[source] with a zod schema and replaces it with the cleaned data. */
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source] ?? {});
  if (!result.success) {
    const errors = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || 'form';
      if (!errors[key]) errors[key] = issue.message === 'Invalid input' && issue.code === 'custom' ? 'Invalid value' : issue.message;
    }
    return next(new AppError(400, 'Please check the highlighted fields.', errors));
  }
  req.validated = { ...(req.validated || {}), [source]: result.data };
  next();
};
