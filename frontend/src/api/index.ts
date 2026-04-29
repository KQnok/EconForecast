import axios from 'axios'
import type {
  TokenOut, Project, ProjectListItem,
  CalculationResult, MonteCarloData, MonteCarloRange
} from '../types'

const api = axios.create({ baseURL: '/' })

// Подставляем токен в каждый запрос
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('access_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// При 401 — чистим токен
api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// AUTH
export const authApi = {
  register: (data: { email: string; name: string; password: string }) =>
    api.post<TokenOut>('/auth/register', data).then(r => r.data),

  login: (data: { email: string; password: string }) =>
    api.post<TokenOut>('/auth/login', data).then(r => r.data),

  me: () => api.get('/auth/me').then(r => r.data),
}

// PROJECTS
export const projectsApi = {
  list: () =>
    api.get<ProjectListItem[]>('/projects').then(r => r.data),

  get: (id: number) =>
    api.get<Project>(`/projects/${id}`).then(r => r.data),

  create: (data: Partial<Project>) =>
    api.post<Project>('/projects', data).then(r => r.data),

  update: (id: number, data: Partial<Project>) =>
    api.put<Project>(`/projects/${id}`, data).then(r => r.data),

  delete: (id: number) =>
    api.delete(`/projects/${id}`),
}

// CALCULATIONS
export const calculationsApi = {
  run: (projectId: number) =>
    api.post<CalculationResult>(`/calculations/${projectId}/run`).then(r => r.data),

  monteCarlo: (projectId: number, params: MonteCarloRange) =>
    api.post<MonteCarloData>(`/calculations/${projectId}/monte-carlo`, params).then(r => r.data),
}

// EXPORT
export const exportApi = {
  pdfPreviewUrl: (projectId: number) => `/export/${projectId}/pdf-preview`,
  pdfUrl:        (projectId: number) => `/export/${projectId}/pdf`,
  excelUrl:      (projectId: number) => `/export/${projectId}/excel`,

  excelPreview: (projectId: number) =>
    api.get(`/export/${projectId}/excel-preview`).then(r => r.data),
}

export default api
