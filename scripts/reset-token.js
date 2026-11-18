// Scriptable: guarda (o reemplaza) el token del widget en el Keychain.
// Úsalo si el widget da 401 aunque el token sea válido (token mal pegado).
// Reemplaza TOKEN_DEL_WIDGET por el valor real y ejecuta UNA vez. No versionar el valor real.
const KEY = "redtransporte_token";
if (Keychain.contains(KEY)) Keychain.remove(KEY);
Keychain.set(KEY, "TOKEN_DEL_WIDGET");
console.log("guardado: " + Keychain.get(KEY).length + " caracteres");
