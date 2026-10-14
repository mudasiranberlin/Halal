const BASE = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  constructor(message, status = 0, errors = null) {
    super(message);
    this.status = status;
    this.errors = errors || {};
  }
}

const qs = (params = {}) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== false) p.set(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : '';
};

async function request(method, path, { body, form } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      credentials: 'include',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ApiError('Cannot reach the server. Please check your connection and try again.');
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty or non-JSON body */
  }
  if (!res.ok) throw new ApiError(data?.message || 'Something went wrong. Please try again.', res.status, data?.errors);
  return data;
}

/** multipart upload with a progress callback (fetch cannot report upload progress). */
function upload(method, path, form, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, `${BASE}/api${path}`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onerror = () => reject(new ApiError('Cannot reach the server. Please check your connection and try again.'));
    xhr.onload = () => {
      let data = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new ApiError(data?.message || 'Something went wrong. Please try again.', xhr.status, data?.errors));
    };
    xhr.send(form);
  });
}

const get = (p, params) => request('GET', p + qs(params));
const send = (m) => (p, body) => request(m, p, { body });

export const api = {
  // public
  categories: () => get('/categories'),
  promotions: () => get('/promotions'),
  foods: (params) => get('/foods', params),
  food: (id, params) => get(`/foods/${id}`, params),
  reviews: (id, params) => get(`/foods/${id}/reviews`, params),
  addReview: (id, body) => send('POST')(`/foods/${id}/reviews`, body),
  // account
  register: send('POST').bind(null, '/auth/register'),
  login: send('POST').bind(null, '/auth/login'),
  logout: () => request('POST', '/auth/logout'),
  me: () => get('/auth/me'),
  myFoods: () => get('/foods/mine'),
  submitFood: (form, onProgress) => upload('POST', '/foods', form, onProgress),
  deleteMyFood: (id) => request('DELETE', `/foods/${id}`),
};

export const adminApi = {
  login: send('POST').bind(null, '/admin/login'),
  logout: () => request('POST', '/admin/logout'),
  me: () => get('/admin/me'),
  dashboard: () => get('/admin/dashboard'),
  foods: (params) => get('/admin/foods', params),
  food: (id) => get(`/admin/foods/${id}`),
  createFood: (form, onProgress) => upload('POST', '/admin/foods', form, onProgress),
  updateFood: (id, form, onProgress) => upload('PUT', `/admin/foods/${id}`, form, onProgress),
  approveFood: (id) => request('PUT', `/admin/foods/${id}/approve`),
  rejectFood: (id, reason) => request('PUT', `/admin/foods/${id}/reject`, { body: { reason } }),
  deleteFood: (id) => request('DELETE', `/admin/foods/${id}`),
  reviews: (params) => get('/admin/reviews', params),
  approveReview: (id) => request('PUT', `/admin/reviews/${id}/approve`),
  deleteReview: (id) => request('DELETE', `/admin/reviews/${id}`),
  users: (params) => get('/admin/users', params),
  user: (id) => get(`/admin/users/${id}`),
  setUserStatus: (id, status) => request('PUT', `/admin/users/${id}/status`, { body: { status } }),
  deleteUser: (id) => request('DELETE', `/admin/users/${id}`),
  promotions: () => get('/admin/promotions'),
  savePromotion: (id, form, onProgress) => upload(id ? 'PUT' : 'POST', id ? `/admin/promotions/${id}` : '/admin/promotions', form, onProgress),
  reorderPromotions: (ids) => request('PUT', '/admin/promotions/reorder', { body: { ids } }),
  deletePromotion: (id) => request('DELETE', `/admin/promotions/${id}`),
};
