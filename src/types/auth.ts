export type User = {
  uuid: string
  name: string
  email: string
}

export type SignupCredentials = {
  name: string
  email: string
  password: string
}

export type LoginCredentials = Pick<SignupCredentials, 'email' | 'password'>
export type AuthModalMode = 'login' | 'signup' | null
