import type { LoginCredentials, SignupCredentials, User } from '../types/auth'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '')

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function isUser(value: unknown): value is User {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.uuid === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.email === 'string'
  )
}

async function responseMessage(response: Response, fallback: string): Promise<string> {
  return (await response.text()).trim() || fallback
}

async function postJson(
  path: string,
  body: object,
  fallback: string,
): Promise<void> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    throw new ApiError(await responseMessage(response, fallback), response.status)
  }
}

export async function createAccount(
  credentials: SignupCredentials,
  fallback: string,
): Promise<void> {
  await postJson('/users', credentials, fallback)
}

export async function login(
  credentials: LoginCredentials,
  fallback: string,
): Promise<User> {
  await postJson('/users/login', credentials, fallback)
  return getCurrentUser(fallback)
}

export async function getCurrentUser(fallback: string): Promise<User> {
  const response = await fetch(`${apiBaseUrl}/users/me`, { credentials: 'include' })
  if (!response.ok) {
    throw new ApiError(await responseMessage(response, fallback), response.status)
  }

  const user: unknown = await response.json()
  if (!isUser(user)) throw new Error(fallback)
  return user
}

export async function refreshSession(fallback: string): Promise<boolean> {
  const response = await fetch(`${apiBaseUrl}/users/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
  if (response.status === 401 || response.status === 403) return false
  if (!response.ok) {
    throw new ApiError(await responseMessage(response, fallback), response.status)
  }
  return true
}

export async function logoutSession(fallback: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/users/logout`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!response.ok) {
    throw new ApiError(await responseMessage(response, fallback), response.status)
  }
}
