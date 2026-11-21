// Los usuarios ingresan con un nombre de usuario. Supabase necesita un correo,
// así que por dentro se usa uno ficticio: usuario@usuarios.local
export const USER_DOMAIN = "usuarios.local";

export const cleanUsername = (u: string) => u.trim().toLowerCase();
export const usernameToEmail = (u: string) => `${cleanUsername(u)}@${USER_DOMAIN}`;
export const validUsername = (u: string) => /^[a-z0-9][a-z0-9._-]{2,29}$/.test(cleanUsername(u));
export const USERNAME_HINT = "Entre 3 y 30 caracteres: letras, números, punto, guion o guion bajo. Sin espacios ni tildes.";

export function traducirError(m: string) {
  if (/invalid login|invalid credentials/i.test(m)) return "Usuario o contraseña incorrectos.";
  if (/banned/i.test(m)) return "Este usuario está desactivado. Hablá con un administrador.";
  if (/at least 6|password should/i.test(m)) return "La contraseña debe tener al menos 6 caracteres.";
  if (/could not find the function|needs_setup|schema cache/i.test(m))
    return "Falta ejecutar el archivo 02_usuarios.sql en Supabase (SQL Editor).";
  return m;
}
