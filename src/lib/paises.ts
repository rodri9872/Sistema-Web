// Países (en español) y la región a la que pertenecen
const R = {
  eu: "Europa",
  na: "Norteamérica",
  ca: "Centroamérica y Caribe",
  sa: "Sudamérica",
  af: "África",
  me: "Medio Oriente",
  as: "Asia",
  oc: "Oceanía",
} as const;

export const COUNTRIES: { name: string; region: string }[] = [
  // Habla hispana primero
  ["España", R.eu], ["Argentina", R.sa], ["México", R.na], ["Colombia", R.sa], ["Chile", R.sa], ["Perú", R.sa],
  ["Uruguay", R.sa], ["Paraguay", R.sa], ["Bolivia", R.sa], ["Ecuador", R.sa], ["Venezuela", R.sa],
  ["República Dominicana", R.ca], ["Puerto Rico", R.ca], ["Cuba", R.ca], ["Guatemala", R.ca], ["Honduras", R.ca],
  ["El Salvador", R.ca], ["Nicaragua", R.ca], ["Costa Rica", R.ca], ["Panamá", R.ca], ["Guinea Ecuatorial", R.af],
  // Norteamérica
  ["Estados Unidos", R.na], ["Canadá", R.na],
  // Resto de América
  ["Brasil", R.sa], ["Guyana", R.sa], ["Surinam", R.sa], ["Belice", R.ca], ["Haití", R.ca], ["Jamaica", R.ca],
  ["Trinidad y Tobago", R.ca], ["Bahamas", R.ca], ["Barbados", R.ca],
  // Europa
  ["Portugal", R.eu], ["Francia", R.eu], ["Italia", R.eu], ["Alemania", R.eu], ["Reino Unido", R.eu], ["Irlanda", R.eu],
  ["Andorra", R.eu], ["Bélgica", R.eu], ["Países Bajos", R.eu], ["Luxemburgo", R.eu], ["Suiza", R.eu], ["Austria", R.eu],
  ["Mónaco", R.eu], ["Malta", R.eu], ["Dinamarca", R.eu], ["Suecia", R.eu], ["Noruega", R.eu], ["Finlandia", R.eu],
  ["Islandia", R.eu], ["Polonia", R.eu], ["República Checa", R.eu], ["Eslovaquia", R.eu], ["Hungría", R.eu],
  ["Rumania", R.eu], ["Bulgaria", R.eu], ["Grecia", R.eu], ["Croacia", R.eu], ["Eslovenia", R.eu], ["Serbia", R.eu],
  ["Bosnia y Herzegovina", R.eu], ["Montenegro", R.eu], ["Albania", R.eu], ["Macedonia del Norte", R.eu],
  ["Ucrania", R.eu], ["Moldavia", R.eu], ["Bielorrusia", R.eu], ["Lituania", R.eu], ["Letonia", R.eu], ["Estonia", R.eu],
  ["Rusia", R.eu], ["Chipre", R.eu],
  // Medio Oriente
  ["Turquía", R.me], ["Israel", R.me], ["Emiratos Árabes Unidos", R.me], ["Arabia Saudita", R.me], ["Catar", R.me],
  ["Kuwait", R.me], ["Líbano", R.me], ["Jordania", R.me], ["Irán", R.me], ["Irak", R.me],
  // África
  ["Marruecos", R.af], ["Argelia", R.af], ["Túnez", R.af], ["Egipto", R.af], ["Senegal", R.af], ["Nigeria", R.af],
  ["Ghana", R.af], ["Kenia", R.af], ["Sudáfrica", R.af], ["Angola", R.af], ["Mozambique", R.af], ["Cabo Verde", R.af],
  // Asia
  ["China", R.as], ["Japón", R.as], ["Corea del Sur", R.as], ["India", R.as], ["Filipinas", R.as], ["Indonesia", R.as],
  ["Tailandia", R.as], ["Vietnam", R.as], ["Malasia", R.as], ["Singapur", R.as], ["Pakistán", R.as],
  // Oceanía
  ["Australia", R.oc], ["Nueva Zelanda", R.oc],
].map(([name, region]) => ({ name, region }));

const byName = new Map(COUNTRIES.map((c) => [normalize(c.name), c]));
// Formas comunes de escribirlos (para pegar desde Excel)
const ALIASES: Record<string, string> = {
  "eeuu": "Estados Unidos", "ee.uu": "Estados Unidos", "ee:uu": "Estados Unidos", "ee.uu.": "Estados Unidos",
  "usa": "Estados Unidos", "us": "Estados Unidos", "mexico": "México", "mexico (espanol)": "México",
  "republica dominicana": "República Dominicana", "rep. dominicana": "República Dominicana", "uk": "Reino Unido",
  "inglaterra": "Reino Unido", "holanda": "Países Bajos", "peru": "Perú", "panama": "Panamá", "brazil": "Brasil",
};

function normalize(s: string) {
  return s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Devuelve el país de la lista que corresponde a lo escrito, o null */
export function findCountry(text: string) {
  const n = normalize(text);
  const alias = ALIASES[n] ?? ALIASES[text.trim().toLowerCase()];
  return byName.get(alias ? normalize(alias) : n) ?? null;
}

export const regionOf = (country: string | null | undefined) => (country ? findCountry(country)?.region ?? "" : "");
