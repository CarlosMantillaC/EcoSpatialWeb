/** Usuario que entrega el JWT tras la autenticacion (WebAuthn o dev login). */
export interface RequestUser {
  id: string;
  email: string;
}
