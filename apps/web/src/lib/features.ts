/**
 * Scan IA du visage (/scan → /camera → /resultat, et /profil/skin-scan) : masqué pour
 * l'instant. Les pages restent dans le code ; passer à true les rend de nouveau
 * accessibles (barre de navigation, carte « Lancer le scan » de /routine, menu du profil).
 */
export const SCAN_IA_ENABLED = false;

/** Pages du scan IA, redirigées vers l'accueil tant qu'il est masqué (cf. middleware). */
export const SCAN_IA_ROUTES = ["/scan(.*)", "/camera(.*)", "/resultat(.*)", "/profil/skin-scan(.*)"];
